import type { Account } from "@/storage/secureStore";

export const getAccountDisplayName = (account: Account) =>
  account.issuer?.trim() || "Conta";

export const getAccountSubtitle = (account: Account) =>
  account.account?.trim() || "Sem e-mail vinculado";
