export const OTP_DEFAULT_ALGORITHM = "SHA1" as const;
export const OTP_DEFAULT_DIGITS = 6 as const;
export const OTP_DEFAULT_PERIOD = 30 as const;

export type OtpAlgorithm = "SHA1" | "SHA256" | "SHA512";
export type OtpDigits = 6 | 8;

export type OtpEntry = {
  id: string;
  type: "totp";
  issuer?: string;
  account?: string;
  secret: string;
  algorithm: OtpAlgorithm;
  digits: OtpDigits;
  period: number;
  icon?: string;
  createdAt: number;
  updatedAt: number;
};

export type OtpEntryInput = Partial<OtpEntry> & Pick<OtpEntry, "secret">;
