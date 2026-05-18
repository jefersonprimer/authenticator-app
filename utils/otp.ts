import type { OtpAlgorithm, OtpDigits, OtpEntry, OtpEntryInput } from "@/types/otp";
import {
  OTP_DEFAULT_ALGORITHM,
  OTP_DEFAULT_DIGITS,
  OTP_DEFAULT_PERIOD,
} from "@/types/otp";
import { randomUUID } from "expo-crypto";

const normalizeOptionalText = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export const normalizeSecret = (value: string) => value.replace(/\s+/g, "").toUpperCase();

export const normalizeAlgorithm = (value?: string | null): OtpAlgorithm => {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "SHA256") return "SHA256";
  if (normalized === "SHA512") return "SHA512";
  return OTP_DEFAULT_ALGORITHM;
};

export const normalizeDigits = (value?: number | string | null): OtpDigits => {
  const digits = typeof value === "string" ? Number(value) : value;
  return digits === 8 ? 8 : OTP_DEFAULT_DIGITS;
};

export const normalizePeriod = (value?: number | string | null) => {
  const period = typeof value === "string" ? Number(value) : value;
  if (!period || !Number.isFinite(period) || period <= 0) {
    return OTP_DEFAULT_PERIOD;
  }
  return Math.max(1, Math.round(period));
};

export const createOtpEntry = (input: OtpEntryInput): OtpEntry => {
  const now = Date.now();

  return {
    id: input.id ?? randomUUID(),
    type: "totp",
    issuer: normalizeOptionalText(input.issuer),
    account: normalizeOptionalText(input.account),
    secret: normalizeSecret(input.secret),
    algorithm: normalizeAlgorithm(input.algorithm),
    digits: normalizeDigits(input.digits),
    period: normalizePeriod(input.period),
    icon: normalizeOptionalText(input.icon),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const normalizeOtpEntries = (entries: unknown): OtpEntry[] => {
  if (!Array.isArray(entries)) return [];

  return entries
    .map((entry) => {
      if (!entry || typeof entry !== "object" || !("secret" in entry)) {
        return null;
      }

      const maybeEntry = entry as OtpEntryInput;

      if (typeof maybeEntry.secret !== "string" || !maybeEntry.secret.trim()) {
        return null;
      }

      return createOtpEntry(maybeEntry);
    })
    .filter((entry): entry is OtpEntry => entry !== null);
};

const normalizeKeyPart = (value?: string) => (value ?? "").trim().toLowerCase();

export const getOtpEntryIdentityKey = (entry: Pick<OtpEntry, "issuer" | "account" | "secret">) => {
  const issuer = normalizeKeyPart(entry.issuer);
  const account = normalizeKeyPart(entry.account);

  if (issuer || account) {
    return `${issuer}::${account}`;
  }

  return normalizeSecret(entry.secret);
};

export const getOtpEntryFingerprint = (
  entry: Pick<OtpEntry, "issuer" | "account" | "secret" | "algorithm" | "digits" | "period">,
) => {
  return [
    normalizeKeyPart(entry.issuer),
    normalizeKeyPart(entry.account),
    normalizeSecret(entry.secret),
    entry.algorithm,
    String(entry.digits),
    String(entry.period),
  ].join("::");
};
