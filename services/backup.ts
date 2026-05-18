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
const PBKDF2_ITERATIONS = 210_000;
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
    return { entries: normalizeImportedEntries(value) };
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const maybeObject = value as { createdAt?: number; entries?: unknown };

  if (Array.isArray(maybeObject.entries)) {
    return {
      entries: normalizeImportedEntries(maybeObject.entries),
      createdAt: typeof maybeObject.createdAt === "number" ? maybeObject.createdAt : undefined,
    };
  }

  return null;
};

const deriveEncryptionKey = async (password: string, salt: Uint8Array) => {
  return pbkdf2Async(sha256, password, salt, {
    c: PBKDF2_ITERATIONS,
    dkLen: KEY_BYTES,
    asyncTick: 10,
  });
};

const decryptEnvelope = async (envelope: BackupEnvelope, password: string) => {
  const salt = hexToBytes(envelope.kdf.saltHex);
  const nonce = hexToBytes(envelope.encryption.nonceHex);
  const ciphertext = hexToBytes(envelope.ciphertextHex);
  const key = await deriveEncryptionKey(password, salt);

  try {
    const plaintext = gcm(key, nonce).decrypt(ciphertext);
    return JSON.parse(textDecoder.decode(plaintext)) as BackupPayload;
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
  const key = await deriveEncryptionKey(trimmedPassword, salt);

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
  const parsed = JSON.parse(rawBackup) as unknown;

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
  const parsed = JSON.parse(rawBackup) as unknown;

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
