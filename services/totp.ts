import { generateSync } from "otplib";

export const generateToken = (secret: string) => {
  return generateSync({ secret });
};
