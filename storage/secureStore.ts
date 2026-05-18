import * as SecureStore from "expo-secure-store";
import { createEncryptedBackup, importBackupFromString } from "@/services/backup";
import type { OtpEntry } from "@/types/otp";
import { createOtpEntry, normalizeOtpEntries } from "@/utils/otp";

const KEY = "accounts";
const APP_LOCK_ENABLED_KEY = "app_lock_enabled";

export type Account = OtpEntry;

export const saveAccounts = async (accounts: Account[]) => {
  await SecureStore.setItemAsync(KEY, JSON.stringify(normalizeOtpEntries(accounts)));
};

export const removeAccount = async (accountId: string) => {
  const accounts = await getAccounts();
  const filtered = accounts.filter((acc) => acc.id !== accountId);
  await saveAccounts(filtered);
};

export const updateAccount = async (
  accountId: string,
  updates: Pick<Account, "issuer" | "account">,
) => {
  const accounts = await getAccounts();
  const updatedAccounts = accounts.map((item) =>
    item.id === accountId
      ? createOtpEntry({
          ...item,
          issuer: updates.issuer,
          account: updates.account,
          updatedAt: Date.now(),
        })
      : item,
  );

  await saveAccounts(updatedAccounts);
};

export const getAccounts = async (): Promise<Account[]> => {
  const data = await SecureStore.getItemAsync(KEY);
  if (!data) {
    return [];
  }

  try {
    const parsed = JSON.parse(data);
    const normalized = normalizeOtpEntries(parsed);

    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      await saveAccounts(normalized);
    }

    return normalized;
  } catch {
    return [];
  }
};

export const exportBackup = async (password: string): Promise<string> => {
  const accounts = await getAccounts();
  return createEncryptedBackup(accounts, password);
};

export { importBackupFromString };

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
