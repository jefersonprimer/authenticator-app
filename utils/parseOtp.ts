import { parse } from "@otplib/uri";
import type { OtpEntryInput } from "@/types/otp";
import { normalizeAlgorithm, normalizeDigits, normalizePeriod, normalizeSecret } from "@/utils/otp";

export const parseOtpUri = (uri: string): OtpEntryInput | null => {
  try {
    const parsed = parse(uri);

    if (parsed.type !== "totp") {
      return null;
    }

    const label = parsed.label;
    const separatorIndex = label.indexOf(":");
    const issuerFromLabel = separatorIndex >= 0 ? label.slice(0, separatorIndex) : undefined;
    const accountFromLabel = separatorIndex >= 0 ? label.slice(separatorIndex + 1) : label;
    const secret = typeof parsed.params.secret === "string" ? normalizeSecret(parsed.params.secret) : "";

    if (!secret) {
      return null;
    }

    return {
      type: "totp",
      issuer: parsed.params.issuer ?? issuerFromLabel,
      account: accountFromLabel,
      secret,
      algorithm: normalizeAlgorithm(parsed.params.algorithm),
      digits: normalizeDigits(parsed.params.digits),
      period: normalizePeriod(parsed.params.period),
    };
  } catch {
    return null;
  }
};
