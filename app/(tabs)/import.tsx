import { AlertModal } from "@/components/AlertModal";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { BackupPreview, ImportMode } from "@/services/backup";
import { readBackupPreview } from "@/services/backup";
import {
  getAccounts,
  importBackupFromString,
  saveAccounts,
} from "@/storage/secureStore";
import { readAssetAsText } from "@/utils/file-helpers";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  backupModes,
  formatBackupDate,
  backupScreenStyles as styles,
} from "@/components/backup-shared";

export default function ImportBackupScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const insets = useSafeAreaInsets();
  const [importPassword, setImportPassword] = useState("");
  const [selectedMode, setSelectedMode] = useState<ImportMode>("merge");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedBackupText, setSelectedBackupText] = useState<string | null>(
    null,
  );
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [isImportPasswordVisible, setIsImportPasswordVisible] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isPickingFile, setIsPickingFile] = useState(false);
  const pickLockRef = useRef(false);
  const importLockRef = useRef(false);
  const isBusy = isImporting || isPickingFile;

  // Modal state
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    description: string;
    onDismiss?: () => void;
  }>({
    visible: false,
    title: "",
    description: "",
  });

  const showAlert = (
    title: string,
    description: string,
    onDismiss?: () => void,
  ) => {
    setAlertConfig({ visible: true, title, description, onDismiss });
  };

  const resetSelection = () => {
    setSelectedFileName(null);
    setSelectedBackupText(null);
    setPreview(null);
    setImportPassword("");
    setIsImportPasswordVisible(false);
  };

  const handlePickBackup = async () => {
    if (pickLockRef.current || isPickingFile) return;

    pickLockRef.current = true;
    setIsPickingFile(true);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: ["*/*", "application/json", "text/plain", "application/octet-stream"],
      });

      if (result.canceled || !result.assets || !result.assets.length) {
        return;
      }

      const asset = result.assets[0];
      const rawText = await readAssetAsText(asset);
      const nextPreview = readBackupPreview(rawText);

      setSelectedFileName(asset.name);
      setSelectedBackupText(rawText);
      setPreview(nextPreview);
      setImportPassword("");
    } catch (error) {
      const message =
        error instanceof Error && error.message === "EMPTY_BACKUP_FILE"
          ? "O arquivo selecionado está vazio."
          : error instanceof Error && error.message === "INVALID_BACKUP_FILE"
            ? "O formato deste arquivo não é reconhecido como um backup válido."
            : "Não foi possível ler o arquivo selecionado. Verifique se o arquivo está acessível.";
      showAlert("Arquivo inválido", message);
    } finally {
      pickLockRef.current = false;
      setIsPickingFile(false);
    }
  };

  const handleImport = async () => {
    if (importLockRef.current || isImporting) return;

    if (!selectedBackupText || !preview) {
      showAlert(
        "Selecione um arquivo",
        "Escolha um arquivo de backup antes de importar.",
      );
      return;
    }

    if (preview.requiresPassword && !importPassword.trim()) {
      showAlert(
        "Senha necessária",
        "Digite a senha usada para criptografar o backup.",
      );
      return;
    }

    importLockRef.current = true;
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

      let descriptionMessage = "";
      if (result.importedCount === 0) {
        descriptionMessage =
          "Nenhuma conta válida foi encontrada no arquivo de backup.";
      } else if (
        result.addedCount === 0 &&
        result.updatedCount === 0 &&
        result.skippedCount > 0
      ) {
        descriptionMessage = `${result.skippedCount} conta(s) encontrada(s) no backup, mas todas já existiam na sua lista. Se você deseja sobrescrever suas contas, escolha a opção "Substituir tudo".`;
      } else {
        const parts: string[] = [];
        if (result.addedCount > 0) parts.push(`${result.addedCount} nova(s)`);
        if (result.updatedCount > 0)
          parts.push(`${result.updatedCount} atualizada(s)`);
        if (result.skippedCount > 0)
          parts.push(`${result.skippedCount} já existente(s)`);
        descriptionMessage = `Backup importado com sucesso (${parts.join(", ")}).`;
      }

      showAlert(
        result.addedCount > 0 || result.updatedCount > 0
          ? "Contas carregadas com sucesso"
          : "Importação concluída",
        descriptionMessage,
        () => {
          resetSelection();
          router.replace("/");
        },
      );
    } catch (error) {
      const message =
        error instanceof Error && error.message === "BACKUP_PASSWORD_REQUIRED"
          ? "Digite a senha do backup para continuar."
          : error instanceof Error &&
              error.message === "INVALID_BACKUP_PASSWORD"
            ? "Senha incorreta. Verifique a senha e tente novamente."
            : error instanceof Error && error.message === "INVALID_BACKUP_FILE"
              ? "O conteúdo do backup está corrompido ou em formato inválido."
              : "Não foi possível importar este backup. Verifique a senha e tente novamente.";
      showAlert("Importação falhou", message);
    } finally {
      importLockRef.current = false;
      setIsImporting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View
        style={[
          localStyles.header,
          {
            backgroundColor: theme.headerBackground,
            paddingTop: insets.top > 0 ? insets.top + 12 : 50,
          },
        ]}
      >
        <TouchableOpacity
          style={[localStyles.backButton, isBusy && styles.buttonDisabled]}
          onPress={() => router.back()}
          disabled={isBusy}
        >
          <Ionicons name="chevron-back-outline" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={localStyles.titleContainer}>
          <Text style={[localStyles.headerTitle, { color: theme.text }]}>
            Importar
          </Text>
        </View>
        <View style={localStyles.rightSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {!preview ? (
            <>
              <Text style={[styles.description, { color: theme.icon }]}>
                Selecione um arquivo `.backup.json` exportado anteriormente por
                este aplicativo.
              </Text>
              <Pressable
                style={[
                  styles.secondaryButton,
                  { borderColor: theme.cardBorder },
                  isBusy && styles.buttonDisabled,
                ]}
                onPress={handlePickBackup}
                disabled={isBusy}
              >
                <IconSymbol
                  name="arrow.down.doc.fill"
                  size={20}
                  color={theme.text}
                />
                <View style={styles.buttonContent}>
                  {isPickingFile && (
                    <ActivityIndicator size="small" color={theme.text} />
                  )}
                  <Text
                    style={[styles.secondaryButtonText, { color: theme.text }]}
                  >
                    {isPickingFile ? "Lendo..." : "Selecionar arquivo"}
                  </Text>
                </View>
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
                <Text style={[styles.previewTitle, { color: theme.text }]}>
                  {selectedFileName}
                </Text>
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
                  <Text style={[styles.label, { color: theme.text }]}>
                    Senha do backup
                  </Text>
                  <View style={styles.passwordField}>
                    <TextInput
                      value={importPassword}
                      onChangeText={setImportPassword}
                      secureTextEntry={!isImportPasswordVisible}
                      autoCapitalize="none"
                      editable={!isBusy}
                      placeholder="Digite a senha usada na exportação"
                      placeholderTextColor="#9ca3af"
                      style={[
                        styles.input,
                        styles.passwordInput,
                        {
                          color: theme.text,
                          backgroundColor: theme.cardBackground,
                          borderColor: theme.cardBorder,
                        },
                      ]}
                    />
                    <Pressable
                      style={styles.passwordToggle}
                      onPress={() =>
                        setIsImportPasswordVisible((current) => !current)
                      }
                      disabled={isBusy}
                      hitSlop={8}
                    >
                      <Ionicons
                        name={
                          isImportPasswordVisible
                            ? "eye-off-outline"
                            : "eye-outline"
                        }
                        size={22}
                        color={theme.icon}
                      />
                    </Pressable>
                  </View>
                </View>
              )}

              <Text
                style={[styles.label, { color: theme.text, marginTop: 10 }]}
              >
                Modo de importação
              </Text>
              <View style={styles.modeList}>
                {backupModes.map((mode) => {
                  const active = mode.value === selectedMode;
                  return (
                    <Pressable
                      key={mode.value}
                      onPress={() => setSelectedMode(mode.value)}
                      disabled={isBusy}
                      style={[
                        styles.modeCard,
                        isBusy && styles.buttonDisabled,
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
                            <View
                              style={[
                                styles.radioInner,
                                { backgroundColor: theme.tint },
                              ]}
                            />
                          )}
                        </View>
                        <Text style={[styles.modeTitle, { color: theme.text }]}>
                          {mode.title}
                        </Text>
                      </View>
                      <Text
                        style={[styles.modeDescription, { color: theme.icon }]}
                      >
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
                <View style={styles.buttonContent}>
                  {isImporting && (
                    <ActivityIndicator size="small" color="#fff" />
                  )}
                  <Text style={styles.primaryButtonText}>
                    {isImporting ? "Importando..." : "Confirmar Importação"}
                  </Text>
                </View>
              </Pressable>

              <Pressable
                style={[styles.resetButton, isBusy && styles.buttonDisabled]}
                onPress={resetSelection}
                disabled={isBusy}
              >
                <Text style={[styles.resetButtonText, { color: theme.icon }]}>
                  Escolher outro arquivo
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {isPickingFile && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingContent}>
            <Text style={styles.processingTitle}>Carregando arquivo</Text>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.processingDescription}>
              Lendo o backup selecionado para validar o conteúdo antes da
              importação.
            </Text>
          </View>
        </View>
      )}

      {isImporting && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingContent}>
            <Text style={styles.processingTitle}>Processando importação</Text>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.processingDescription}>
              Descriptografando o backup e aplicando as alterações nas contas
              salvas. Isso pode levar alguns segundos.
            </Text>
          </View>
        </View>
      )}

      <AlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        description={alertConfig.description}
        onClose={() => {
          const onDismiss = alertConfig.onDismiss;
          setAlertConfig({
            ...alertConfig,
            visible: false,
            onDismiss: undefined,
          });
          if (onDismiss) {
            onDismiss();
          }
        }}
      />
    </View>
  );
}

const localStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    padding: 6,
    width: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rightSpacer: {
    width: 36,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "400",
  },
});
