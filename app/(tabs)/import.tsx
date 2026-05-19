import { Ionicons } from "@expo/vector-icons";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { BackupPreview, ImportMode } from "@/services/backup";
import { readBackupPreview } from "@/services/backup";
import { getAccounts, importBackupFromString, saveAccounts } from "@/storage/secureStore";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { File } from "expo-file-system";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { backupModes, backupScreenStyles as styles, formatBackupDate } from "./backup-shared";

export default function ImportBackupScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const [importPassword, setImportPassword] = useState("");
  const [selectedMode, setSelectedMode] = useState<ImportMode>("merge");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedBackupText, setSelectedBackupText] = useState<string | null>(null);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isPickingFile, setIsPickingFile] = useState(false);

  const resetSelection = () => {
    setSelectedFileName(null);
    setSelectedBackupText(null);
    setPreview(null);
    setImportPassword("");
  };

  const handlePickBackup = async () => {
    setIsPickingFile(true);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: ["application/json", "text/plain", "*/*"],
      });

      if (result.canceled || !result.assets.length) {
        return;
      }

      const asset = result.assets[0];
      const file = new File(asset.uri);
      const rawText = await file.text();
      const nextPreview = readBackupPreview(rawText);

      setSelectedFileName(asset.name);
      setSelectedBackupText(rawText);
      setPreview(nextPreview);
      setImportPassword("");
    } catch {
      Alert.alert("Arquivo inválido", "Não foi possível ler esse backup.");
    } finally {
      setIsPickingFile(false);
    }
  };

  const handleImport = async () => {
    if (!selectedBackupText || !preview) {
      Alert.alert("Selecione um arquivo", "Escolha um arquivo de backup antes de importar.");
      return;
    }

    if (preview.requiresPassword && !importPassword.trim()) {
      Alert.alert("Senha necessária", "Digite a senha usada para criptografar o backup.");
      return;
    }

    setIsImporting(true);

    try {
      const currentAccounts = await getAccounts();
      const result = await importBackupFromString({
        currentEntries: currentAccounts,
        rawBackup: selectedBackupText,
        password: importPassword,
        mode: selectedMode,
      });

      await saveAccounts(result.nextEntries);

      Alert.alert(
        "Backup importado",
        [
          `${result.importedCount} conta(s) lida(s) do backup.`,
          `${result.addedCount} adicionada(s).`,
          `${result.updatedCount} atualizada(s).`,
          `${result.skippedCount} ignorada(s).`,
        ].join(" "),
      );

      resetSelection();
    } catch (error) {
      const message =
        error instanceof Error && error.message === "BACKUP_PASSWORD_REQUIRED"
          ? "Digite a senha do backup para continuar."
          : "Não foi possível importar este backup. Verifique a senha e o arquivo selecionado.";
      Alert.alert("Importação falhou", message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.headerBackground,
            borderBottomWidth: 1,
            borderBottomColor: theme.headerBorder,
          },
        ]}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Importar</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboard}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {!preview ? (
            <>
              <Text style={[styles.description, { color: theme.icon }]}>
                Selecione um arquivo `.backup.json` exportado anteriormente por este aplicativo.
              </Text>
              <Pressable
                style={[styles.secondaryButton, { borderColor: theme.cardBorder }]}
                onPress={handlePickBackup}
                disabled={isPickingFile}
              >
                <IconSymbol name="arrow.down.doc.fill" size={20} color={theme.text} />
                <Text style={[styles.secondaryButtonText, { color: theme.text }]}>
                  {isPickingFile ? "Lendo..." : "Selecionar arquivo"}
                </Text>
              </Pressable>
            </>
          ) : (
            <View style={styles.importFlow}>
              <View
                style={[
                  styles.previewCard,
                  {
                    backgroundColor: theme.cardBackground,
                    borderColor: theme.cardBorder,
                  },
                ]}
              >
                <Text style={[styles.previewTitle, { color: theme.text }]}>{selectedFileName}</Text>
                <View style={styles.previewMeta}>
                  <Text style={[styles.previewText, { color: theme.icon }]}>
                    {preview.entriesCount} contas •{" "}
                    {preview.kind === "encrypted" ? "Criptografado" : "Legado"}
                  </Text>
                  <Text style={[styles.previewText, { color: theme.icon }]}>
                    Criado em: {formatBackupDate(preview.createdAt)}
                  </Text>
                </View>
              </View>

              {preview.requiresPassword && (
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>Senha do backup</Text>
                  <TextInput
                    value={importPassword}
                    onChangeText={setImportPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    placeholder="Digite a senha usada na exportação"
                    placeholderTextColor="#9ca3af"
                    style={[
                      styles.input,
                      {
                        color: theme.text,
                        backgroundColor: theme.cardBackground,
                        borderColor: theme.cardBorder,
                      },
                    ]}
                  />
                </View>
              )}

              <Text style={[styles.label, { color: theme.text, marginTop: 10 }]}>
                Modo de importação
              </Text>
              <View style={styles.modeList}>
                {backupModes.map((mode) => {
                  const active = mode.value === selectedMode;
                  return (
                    <Pressable
                      key={mode.value}
                      onPress={() => setSelectedMode(mode.value)}
                      style={[
                        styles.modeCard,
                        {
                          borderColor: active ? theme.tint : theme.cardBorder,
                          backgroundColor: active
                            ? colorScheme === "dark"
                              ? "#1e293b"
                              : "#f8fafc"
                            : theme.cardBackground,
                        },
                      ]}
                    >
                      <View style={styles.modeRadio}>
                        <View
                          style={[
                            styles.radioOuter,
                            { borderColor: active ? theme.tint : theme.icon },
                          ]}
                        >
                          {active && (
                            <View style={[styles.radioInner, { backgroundColor: theme.tint }]} />
                          )}
                        </View>
                        <Text style={[styles.modeTitle, { color: theme.text }]}>{mode.title}</Text>
                      </View>
                      <Text style={[styles.modeDescription, { color: theme.icon }]}>
                        {mode.description}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                style={[
                  styles.primaryButton,
                  (!selectedBackupText || isImporting) && styles.buttonDisabled,
                ]}
                disabled={!selectedBackupText || isImporting}
                onPress={handleImport}
              >
                <Text style={styles.primaryButtonText}>
                  {isImporting ? "Importando..." : "Confirmar Importação"}
                </Text>
              </Pressable>

              <Pressable style={styles.resetButton} onPress={resetSelection}>
                <Text style={[styles.resetButtonText, { color: theme.icon }]}>
                  Escolher outro arquivo
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
