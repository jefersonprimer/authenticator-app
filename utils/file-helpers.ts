import type { DocumentPickerAsset } from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as FileSystemLegacy from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

function decodeBase64ToUtf8(base64Str: string): string {
  const cleanBase64 = base64Str.includes(",") ? base64Str.split(",")[1] : base64Str;
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const bytes: number[] = [];

  let buffer = 0;
  let bits = 0;

  for (let i = 0; i < cleanBase64.length; i++) {
    const c = cleanBase64[i];
    if (c === "=") break;
    const index = chars.indexOf(c);
    if (index === -1) continue;

    buffer = (buffer << 6) | index;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }

  const decoder = new TextDecoder();
  return decoder.decode(new Uint8Array(bytes));
}

/**
 * Safely and reliably reads text from a picked DocumentPickerAsset across all platforms (Android, iOS, Web).
 */
export async function readAssetAsText(asset: DocumentPickerAsset): Promise<string> {
  // 1. Web File API (when running in web browser)
  if (asset.file && typeof asset.file.text === "function") {
    try {
      const text = await asset.file.text();
      if (typeof text === "string" && text.length > 0) {
        return text;
      }
    } catch {
      // fallback to other methods
    }
  }

  // 2. Base64 payload if provided directly by document picker (pure JS decoder without atob reliance)
  if (asset.base64) {
    try {
      const decoded = decodeBase64ToUtf8(asset.base64);
      if (typeof decoded === "string" && decoded.length > 0) {
        return decoded;
      }
    } catch {
      // fallback to other methods
    }
  }

  // 3. Expo FileSystem Legacy readAsStringAsync (best for Android content:// and file:// URIs)
  if (asset.uri) {
    try {
      if (FileSystemLegacy.readAsStringAsync) {
        const content = await FileSystemLegacy.readAsStringAsync(asset.uri, {
          encoding: FileSystemLegacy.EncodingType.UTF8,
        });
        if (typeof content === "string" && content.length > 0) {
          return content;
        }
      }
    } catch {
      // fallback to fetch or File class
    }

    // 4. Fetch (works on web blob:/data: URIs and local file URIs on many platforms)
    try {
      const response = await fetch(asset.uri);
      if (response.ok) {
        const text = await response.text();
        if (typeof text === "string" && text.length > 0) {
          return text;
        }
      }
    } catch {
      // fallback to File class
    }

    // 5. New expo-file-system File class
    try {
      const file = new File(asset.uri);
      const text = await file.text();
      if (typeof text === "string" && text.length > 0) {
        return text;
      }
    } catch {
      // All reading strategies exhausted
    }
  }

  throw new Error("COULD_NOT_READ_FILE");
}

/**
 * Safely writes text to cache/storage and triggers native share or web download.
 */
export async function exportAndShareFile(
  filename: string,
  content: string,
  mimeType = "application/json"
): Promise<{ success: boolean; uri?: string }> {
  // Web platform: trigger browser file download
  if (Platform.OS === "web") {
    if (typeof document !== "undefined") {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return { success: true };
    }
    return { success: false };
  }

  // Native platforms (Android, iOS): write to cache and trigger share dialog
  let targetUri: string | null = null;

  try {
    if (FileSystemLegacy.cacheDirectory) {
      targetUri = `${FileSystemLegacy.cacheDirectory}${filename}`;
      await FileSystemLegacy.writeAsStringAsync(targetUri, content, {
        encoding: FileSystemLegacy.EncodingType.UTF8,
      });
    }
  } catch {
    // Fallback using File class
    try {
      const file = new File(Paths.cache, filename);
      file.create({ overwrite: true });
      file.write(content);
      targetUri = file.uri;
    } catch {
      // Both writing strategies failed
    }
  }

  if (!targetUri) {
    throw new Error("COULD_NOT_WRITE_BACKUP_FILE");
  }

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(targetUri, {
      dialogTitle: "Exportar backup criptografado",
      mimeType: "application/json",
      UTI: "public.json",
    });
  }

  return { success: true, uri: targetUri };
}
