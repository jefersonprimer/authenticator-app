import * as SecureStore from "expo-secure-store";

const KEY = "accounts";

export type Account = {
  issuer?: string;
  account?: string;
  secret: string;
};

export const saveAccounts = async (accounts: Account[]) => {
  await SecureStore.setItemAsync(KEY, JSON.stringify(accounts));
};

export const getAccounts = async (): Promise<Account[]> => {
  const data = await SecureStore.getItemAsync(KEY);
  return data ? JSON.parse(data) : [];
};
