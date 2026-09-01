import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import { gcm } from "@noble/ciphers/aes.js";
import { pbkdf2Async } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { clean } from "@noble/hashes/utils.js";
import { bytesToHex, hexToBytes } from "@noble/ciphers/utils.js";
import type { OtpEntry } from "@/types/otp";
import { createOtpEntry, getOtpEntryFingerprint, getOtpEntryIdentityKey, normalizeOtpEntries } from "@/utils/otp";

const BACKUP_FORMAT = "authenticator-backup";
const BACKUP_VERSION = 1;
const PBKDF2_ITERATIONS = 50_000;
const SALT_BYTES = 16;
const NONCE_BYTES = 12;
const KEY_BYTES = 32;

type BackupPayload = {
  version: 1;
  exportedAt: number;
  entries: OtpEntry[];
  metadata: {
    appVersion?: string;
  };
};

type BackupEnvelope = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  createdAt: number;
  entriesCount: number;
  kdf: {
    name: "pbkdf2-sha256";
    iterations: number;
    saltHex: string;
  };
  encryption: {
    name: "aes-256-gcm";
    nonceHex: string;
  };
  ciphertextHex: string;
};

export type BackupPreview =
  | {
      kind: "encrypted";
      version: number;
      createdAt: number;
      entriesCount: number;
      requiresPassword: true;
    }
  | {
      kind: "legacy";
      version: number;
      createdAt?: number;
      entriesCount: number;
      requiresPassword: false;
    };

export type ImportMode = "merge" | "replace" | "skip-duplicates";

export type BackupImportResult = {
  nextEntries: OtpEntry[];
  importedCount: number;
  addedCount: number;
  updatedCount: number;
  skippedCount: number;
  preview: BackupPreview;
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export const sanitizeBackupText = (raw: string): string => {
  if (typeof raw !== "string") return "";
  return raw.replace(/^\uFEFF/, "").trim();
};

const isBackupEnvelope = (value: unknown): value is BackupEnvelope => {
  if (!value || typeof value !== "object") return false;

  const maybeEnvelope = value as Partial<BackupEnvelope>;

  return (
    maybeEnvelope.format === BACKUP_FORMAT &&
    typeof maybeEnvelope.version === "number" &&
    typeof maybeEnvelope.createdAt === "number" &&
    typeof maybeEnvelope.entriesCount === "number" &&
    typeof maybeEnvelope.ciphertextHex === "string" &&
    typeof maybeEnvelope.kdf?.iterations === "number" &&
    typeof maybeEnvelope.kdf?.saltHex === "string" &&
    maybeEnvelope.kdf?.name === "pbkdf2-sha256" &&
    typeof maybeEnvelope.encryption?.nonceHex === "string" &&
    maybeEnvelope.encryption?.name === "aes-256-gcm"
  );
};

const normalizeImportedEntries = (entries: unknown) => {
  const normalized = normalizeOtpEntries(entries);
  const uniqueByFingerprint = new Map<string, OtpEntry>();

  normalized.forEach((entry) => {
    uniqueByFingerprint.set(getOtpEntryFingerprint(entry), entry);
  });

  return Array.from(uniqueByFingerprint.values());
};

const parseLegacyBackup = (value: unknown): { entries: OtpEntry[]; createdAt?: number } | null => {
  if (Array.isArray(value)) {
    const list = normalizeImportedEntries(value);
    return list.length > 0 ? { entries: list } : null;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const maybeObject = value as {
    createdAt?: number;
    exportedAt?: number;
    entries?: unknown;
    accounts?: unknown;
    tokens?: unknown;
    data?: unknown;
    services?: unknown;
    items?: unknown;
    db?: { entries?: unknown };
    vault?: { entries?: unknown };
  };

  const rawList =
    maybeObject.entries ??
    maybeObject.accounts ??
    maybeObject.tokens ??
    maybeObject.data ??
    maybeObject.services ??
    maybeObject.items ??
    maybeObject.db?.entries ??
    maybeObject.vault?.entries;

  if (Array.isArray(rawList)) {
    const createdAt =
      typeof maybeObject.createdAt === "number"
        ? maybeObject.createdAt
        : typeof maybeObject.exportedAt === "number"
          ? maybeObject.exportedAt
          : undefined;

    const list = normalizeImportedEntries(rawList);
    return list.length > 0 ? { entries: list, createdAt } : null;
  }

  const single = normalizeImportedEntries([value]);
  if (single.length > 0) {
    return { entries: single };
  }

  return null;
};

const deriveEncryptionKey = async (
  password: string,
  salt: Uint8Array,
  iterations = PBKDF2_ITERATIONS,
) => {
  return pbkdf2Async(sha256, password, salt, {
    c: iterations > 0 ? iterations : PBKDF2_ITERATIONS,
    dkLen: KEY_BYTES,
    asyncTick: 500,
  });
};

const decryptEnvelope = async (envelope: BackupEnvelope, password: string) => {
  const salt = hexToBytes(envelope.kdf.saltHex);
  const nonce = hexToBytes(envelope.encryption.nonceHex);
  const ciphertext = hexToBytes(envelope.ciphertextHex);
  const iterations = envelope.kdf?.iterations || PBKDF2_ITERATIONS;
  const key = await deriveEncryptionKey(password, salt, iterations);

  try {
    const plaintext = gcm(key, nonce).decrypt(ciphertext);
    const decoded = textDecoder.decode(plaintext);
    return JSON.parse(decoded) as BackupPayload;
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error("INVALID_BACKUP_FILE");
    }
    throw new Error("INVALID_BACKUP_PASSWORD");
  } finally {
    clean(key);
  }
};

const mergeEntries = (
  currentEntries: OtpEntry[],
  importedEntries: OtpEntry[],
  mode: ImportMode,
) => {
  if (mode === "replace") {
    return {
      nextEntries: importedEntries.map((entry) => createOtpEntry(entry)),
      addedCount: importedEntries.length,
      updatedCount: 0,
      skippedCount: 0,
    };
  }

  const currentByIdentity = new Map(
    currentEntries.map((entry) => [getOtpEntryIdentityKey(entry), entry]),
  );
  const currentByFingerprint = new Map(
    currentEntries.map((entry) => [getOtpEntryFingerprint(entry), entry]),
  );
  const nextEntries = [...currentEntries];
  let addedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  importedEntries.forEach((importedEntry) => {
    const fingerprint = getOtpEntryFingerprint(importedEntry);
    const exactMatch = currentByFingerprint.get(fingerprint);

    if (exactMatch) {
      skippedCount += 1;
      return;
    }

    const identityKey = getOtpEntryIdentityKey(importedEntry);
    const existing = currentByIdentity.get(identityKey);

    if (!existing) {
      const nextEntry = createOtpEntry(importedEntry);
      nextEntries.push(nextEntry);
      currentByIdentity.set(identityKey, nextEntry);
      currentByFingerprint.set(getOtpEntryFingerprint(nextEntry), nextEntry);
      addedCount += 1;
      return;
    }

    if (mode === "skip-duplicates") {
      skippedCount += 1;
      return;
    }

    const updatedEntry = createOtpEntry({
      ...importedEntry,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: Date.now(),
    });
    const index = nextEntries.findIndex((entry) => entry.id === existing.id);

    nextEntries[index] = updatedEntry;
    currentByIdentity.set(identityKey, updatedEntry);
    currentByFingerprint.set(getOtpEntryFingerprint(updatedEntry), updatedEntry);
    updatedCount += 1;
  });

  return { nextEntries, addedCount, updatedCount, skippedCount };
};

export const createEncryptedBackup = async (entries: OtpEntry[], password: string) => {
  const trimmedPassword = password.trim();

  if (trimmedPassword.length < 8) {
    throw new Error("BACKUP_PASSWORD_TOO_SHORT");
  }

  const normalizedEntries = normalizeImportedEntries(entries);
  const createdAt = Date.now();
  const payload: BackupPayload = {
    version: BACKUP_VERSION,
    exportedAt: createdAt,
    entries: normalizedEntries,
    metadata: {
      appVersion: Constants.expoConfig?.version,
    },
  };

  const plaintext = textEncoder.encode(JSON.stringify(payload));
  const salt = Crypto.getRandomBytes(SALT_BYTES);
  const nonce = Crypto.getRandomBytes(NONCE_BYTES);
  const key = await deriveEncryptionKey(trimmedPassword, salt, PBKDF2_ITERATIONS);

  try {
    const ciphertext = gcm(key, nonce).encrypt(plaintext);
    const envelope: BackupEnvelope = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      createdAt,
      entriesCount: normalizedEntries.length,
      kdf: {
        name: "pbkdf2-sha256",
        iterations: PBKDF2_ITERATIONS,
        saltHex: bytesToHex(salt),
      },
      encryption: {
        name: "aes-256-gcm",
        nonceHex: bytesToHex(nonce),
      },
      ciphertextHex: bytesToHex(ciphertext),
    };

    return JSON.stringify(envelope, null, 2);
  } finally {
    clean(key);
  }
};

export const readBackupPreview = (rawBackup: string): BackupPreview => {
  const sanitized = sanitizeBackupText(rawBackup);
  if (!sanitized) {
    throw new Error("EMPTY_BACKUP_FILE");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(sanitized);
  } catch {
    const lines = sanitized
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.startsWith("otpauth://"));

    if (lines.length > 0) {
      const entries = normalizeImportedEntries(lines);
      if (entries.length > 0) {
        return {
          kind: "legacy",
          version: 0,
          entriesCount: entries.length,
          requiresPassword: false,
        };
      }
    }

    throw new Error("INVALID_BACKUP_FILE");
  }

  if (isBackupEnvelope(parsed)) {
    return {
      kind: "encrypted",
      version: parsed.version,
      createdAt: parsed.createdAt,
      entriesCount: parsed.entriesCount,
      requiresPassword: true,
    };
  }

  const legacy = parseLegacyBackup(parsed);

  if (!legacy) {
    throw new Error("INVALID_BACKUP_FILE");
  }

  return {
    kind: "legacy",
    version: 0,
    createdAt: legacy.createdAt,
    entriesCount: legacy.entries.length,
    requiresPassword: false,
  };
};

export const importBackupFromString = async ({
  currentEntries,
  rawBackup,
  password,
  mode,
}: {
  currentEntries: OtpEntry[];
  rawBackup: string;
  password?: string;
  mode: ImportMode;
}): Promise<BackupImportResult> => {
  const sanitized = sanitizeBackupText(rawBackup);
  if (!sanitized) {
    throw new Error("EMPTY_BACKUP_FILE");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(sanitized);
  } catch {
    const lines = sanitized
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.startsWith("otpauth://"));

    if (lines.length > 0) {
      const importedEntries = normalizeImportedEntries(lines);
      if (importedEntries.length > 0) {
        const mergeResult = mergeEntries(currentEntries, importedEntries, mode);

        return {
          nextEntries: mergeResult.nextEntries,
          importedCount: importedEntries.length,
          addedCount: mergeResult.addedCount,
          updatedCount: mergeResult.updatedCount,
          skippedCount: mergeResult.skippedCount,
          preview: {
            kind: "legacy",
            version: 0,
            entriesCount: importedEntries.length,
            requiresPassword: false,
          },
        };
      }
    }

    throw new Error("INVALID_BACKUP_FILE");
  }

  if (isBackupEnvelope(parsed)) {
    if (!password?.trim()) {
      throw new Error("BACKUP_PASSWORD_REQUIRED");
    }

    const decryptedPayload = await decryptEnvelope(parsed, password.trim());
    const importedEntries = normalizeImportedEntries(decryptedPayload.entries);
    const mergeResult = mergeEntries(currentEntries, importedEntries, mode);

    return {
      nextEntries: mergeResult.nextEntries,
      importedCount: importedEntries.length,
      addedCount: mergeResult.addedCount,
      updatedCount: mergeResult.updatedCount,
      skippedCount: mergeResult.skippedCount,
      preview: {
        kind: "encrypted",
        version: parsed.version,
        createdAt: parsed.createdAt,
        entriesCount: parsed.entriesCount,
        requiresPassword: true,
      },
    };
  }

  const legacy = parseLegacyBackup(parsed);

  if (!legacy) {
    throw new Error("INVALID_BACKUP_FILE");
  }

  const mergeResult = mergeEntries(currentEntries, legacy.entries, mode);

  return {
    nextEntries: mergeResult.nextEntries,
    importedCount: legacy.entries.length,
    addedCount: mergeResult.addedCount,
    updatedCount: mergeResult.updatedCount,
    skippedCount: mergeResult.skippedCount,
    preview: {
      kind: "legacy",
      version: 0,
      createdAt: legacy.createdAt,
      entriesCount: legacy.entries.length,
      requiresPassword: false,
    },
  };
};
