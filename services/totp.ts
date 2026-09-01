import { base32 } from "@otplib/plugin-base32-scure";
import { crypto } from "@otplib/plugin-crypto-noble";
import { generateSync } from "otplib";
import type { OtpAlgorithm, OtpDigits, OtpEntry } from "@/types/otp";

const toOtpLibAlgorithm = (algorithm: OtpAlgorithm): "sha1" | "sha256" | "sha512" => {
  if (algorithm === "SHA256") return "sha256";
  if (algorithm === "SHA512") return "sha512";
  return "sha1";
};

type TokenConfig = Pick<OtpEntry, "secret" | "algorithm" | "digits" | "period">;

export const generateToken = ({ secret, algorithm, digits, period }: TokenConfig) => {
  try {
    return generateSync({
      secret,
      algorithm: toOtpLibAlgorithm(algorithm),
      digits: digits as OtpDigits,
      period,
      crypto,
      base32,
    });
  } catch {
    return "";
  }
};

export const validateOtpSecret = (config: TokenConfig) => {
  generateSync({
    secret: config.secret,
    algorithm: toOtpLibAlgorithm(config.algorithm),
    digits: config.digits as OtpDigits,
    period: config.period,
    crypto,
    base32,
  });
};
