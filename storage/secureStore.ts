import * as SecureStore from "expo-secure-store";
import { createEncryptedBackup, importBackupFromString } from "@/services/backup";
import type { OtpEntry } from "@/types/otp";
import { createOtpEntry, normalizeOtpEntries } from "@/utils/otp";

const KEY = "accounts";
const KEY_CHUNK_COUNT = "accounts_chunk_count";
const KEY_CHUNK_PREFIX = "accounts_chunk_";
const CHUNK_SIZE = 1500;
const APP_LOCK_ENABLED_KEY = "app_lock_enabled";

export type Account = OtpEntry;

export const saveAccounts = async (accounts: Account[]) => {
  const normalized = normalizeOtpEntries(accounts);
  const json = JSON.stringify(normalized);

  const chunks: string[] = [];
  for (let i = 0; i < json.length; i += CHUNK_SIZE) {
    chunks.push(json.slice(i, i + CHUNK_SIZE));
  }

  const prevCountStr = await SecureStore.getItemAsync(KEY_CHUNK_COUNT);
  const prevCount = prevCountStr ? parseInt(prevCountStr, 10) : 0;

  for (let i = 0; i < chunks.length; i++) {
    await SecureStore.setItemAsync(`${KEY_CHUNK_PREFIX}${i}`, chunks[i]);
  }

  if (prevCount > chunks.length) {
    for (let i = chunks.length; i < prevCount; i++) {
      try {
        await SecureStore.deleteItemAsync(`${KEY_CHUNK_PREFIX}${i}`);
      } catch {
        // ignore deletion failure of unused chunk
      }
    }
  }

  await SecureStore.setItemAsync(KEY_CHUNK_COUNT, String(chunks.length));

  if (chunks.length <= 1) {
    await SecureStore.setItemAsync(KEY, json);
  } else {
    try {
      await SecureStore.deleteItemAsync(KEY);
    } catch {
      // ignore
    }
  }
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
  try {
    const chunkCountStr = await SecureStore.getItemAsync(KEY_CHUNK_COUNT);
    const chunkCount = chunkCountStr ? parseInt(chunkCountStr, 10) : 0;

    let rawJson: string | null = null;

    if (chunkCount > 0) {
      const parts: string[] = [];
      for (let i = 0; i < chunkCount; i++) {
        const part = await SecureStore.getItemAsync(`${KEY_CHUNK_PREFIX}${i}`);
        if (part !== null) {
          parts.push(part);
        }
      }
      rawJson = parts.join("");
    }

    if (!rawJson) {
      rawJson = await SecureStore.getItemAsync(KEY);
    }

    if (!rawJson) {
      return [];
    }

    const parsed = JSON.parse(rawJson);
    const normalized = normalizeOtpEntries(parsed);

    return normalized;
  } catch {
    try {
      const fallbackJson = await SecureStore.getItemAsync(KEY);
      if (fallbackJson) {
        return normalizeOtpEntries(JSON.parse(fallbackJson));
      }
    } catch {
      // ignore
    }
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
