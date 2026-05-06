import * as SecureStore from "expo-secure-store";

const KEY = "accounts";
const APP_LOCK_ENABLED_KEY = "app_lock_enabled";

export type Account = {
  issuer?: string;
  account?: string;
  secret: string;
};

export const saveAccounts = async (accounts: Account[]) => {
  await SecureStore.setItemAsync(KEY, JSON.stringify(accounts));
};

export const removeAccount = async (secret: string) => {
  const accounts = await getAccounts();
  const filtered = accounts.filter((acc) => acc.secret !== secret);
  await saveAccounts(filtered);
};

export const getAccounts = async (): Promise<Account[]> => {
  const data = await SecureStore.getItemAsync(KEY);
  return data ? JSON.parse(data) : [];
};

export const exportBackup = async (): Promise<string> => {
  const accounts = await getAccounts();
  return JSON.stringify(accounts);
};

export const importBackup = async (json: string) => {
  try {
    const accounts = JSON.parse(json);
    if (Array.isArray(accounts)) {
      await saveAccounts(accounts);
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

export const isAppLockEnabled = async (): Promise<boolean> => {
  const value = await SecureStore.getItemAsync(APP_LOCK_ENABLED_KEY);
  if (value === null) {
    return true;
  }
  return value === "true";
};

export const setAppLockEnabled = async (enabled: boolean) => {
  await SecureStore.setItemAsync(APP_LOCK_ENABLED_KEY, String(enabled));
};
