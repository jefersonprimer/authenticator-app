import type { OtpAlgorithm, OtpDigits, OtpEntry, OtpEntryInput } from "@/types/otp";
import {
  OTP_DEFAULT_ALGORITHM,
  OTP_DEFAULT_DIGITS,
  OTP_DEFAULT_PERIOD,
} from "@/types/otp";
import { parseOtpUri } from "@/utils/parseOtp";
import { randomUUID } from "expo-crypto";

const normalizeOptionalText = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export const normalizeSecret = (value: string) =>
  value.replace(/[\s-]+/g, "").toUpperCase();

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
  const list = Array.isArray(entries)
    ? entries
    : entries && typeof entries === "object"
      ? [entries]
      : [];

  return list
    .map((entry) => {
      if (!entry) return null;

      if (typeof entry === "string" && entry.startsWith("otpauth://")) {
        const parsed = parseOtpUri(entry);
        if (parsed) {
          return createOtpEntry(parsed);
        }
      }

      if (typeof entry !== "object") {
        return null;
      }

      const maybeEntry = entry as Record<string, any>;
      const info = maybeEntry.info && typeof maybeEntry.info === "object" ? maybeEntry.info : {};
      const otp = maybeEntry.otp && typeof maybeEntry.otp === "object" ? maybeEntry.otp : {};
      const login = maybeEntry.login && typeof maybeEntry.login === "object" ? maybeEntry.login : {};

      const uriCandidate =
        typeof maybeEntry.uri === "string"
          ? maybeEntry.uri
          : typeof login.totp === "string"
            ? login.totp
            : typeof maybeEntry.totp === "string" && maybeEntry.totp.startsWith("otpauth://")
              ? maybeEntry.totp
              : undefined;

      if (uriCandidate && uriCandidate.startsWith("otpauth://")) {
        const parsed = parseOtpUri(uriCandidate);
        if (parsed) {
          return createOtpEntry({
            ...parsed,
            id: typeof maybeEntry.id === "string" ? maybeEntry.id : undefined,
            icon: typeof maybeEntry.icon === "string" ? maybeEntry.icon : undefined,
            createdAt: typeof maybeEntry.createdAt === "number" ? maybeEntry.createdAt : undefined,
            updatedAt: typeof maybeEntry.updatedAt === "number" ? maybeEntry.updatedAt : undefined,
          });
        }
      }

      const secretCandidate =
        typeof maybeEntry.secret === "string"
          ? maybeEntry.secret
          : typeof info.secret === "string"
            ? info.secret
            : typeof otp.secret === "string"
              ? otp.secret
              : typeof maybeEntry.secretKey === "string"
                ? maybeEntry.secretKey
                : typeof maybeEntry.key === "string"
                  ? maybeEntry.key
                  : typeof maybeEntry.token === "string"
                    ? maybeEntry.token
                    : typeof maybeEntry.totp === "string" && !maybeEntry.totp.startsWith("otpauth://")
                      ? maybeEntry.totp
                      : undefined;

      if (secretCandidate && secretCandidate.trim()) {
        const issuerCandidate =
          typeof maybeEntry.issuer === "string"
            ? maybeEntry.issuer
            : typeof maybeEntry.name === "string" && (maybeEntry.account || otp.account || login.username)
              ? maybeEntry.name
              : undefined;

        const accountCandidate =
          typeof maybeEntry.account === "string"
            ? maybeEntry.account
            : typeof otp.account === "string"
              ? otp.account
              : typeof login.username === "string"
                ? login.username
                : typeof maybeEntry.label === "string"
                  ? maybeEntry.label
                  : typeof maybeEntry.name === "string"
                    ? maybeEntry.name
                    : undefined;

        const algorithmCandidate =
          maybeEntry.algorithm ?? info.algo ?? info.algorithm ?? otp.algorithm;
        const digitsCandidate =
          maybeEntry.digits ?? info.digits ?? otp.digits;
        const periodCandidate =
          maybeEntry.period ?? info.period ?? otp.period;

        return createOtpEntry({
          id: typeof maybeEntry.id === "string" ? maybeEntry.id : undefined,
          issuer: issuerCandidate,
          account: accountCandidate,
          secret: secretCandidate,
          algorithm: typeof algorithmCandidate === "string" ? (algorithmCandidate as any) : undefined,
          digits:
            typeof digitsCandidate === "number" || typeof digitsCandidate === "string"
              ? (digitsCandidate as any)
              : undefined,
          period:
            typeof periodCandidate === "number" || typeof periodCandidate === "string"
              ? (periodCandidate as any)
              : undefined,
          icon: typeof maybeEntry.icon === "string" ? maybeEntry.icon : undefined,
          createdAt: typeof maybeEntry.createdAt === "number" ? maybeEntry.createdAt : undefined,
          updatedAt: typeof maybeEntry.updatedAt === "number" ? maybeEntry.updatedAt : undefined,
        });
      }

      return null;
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
