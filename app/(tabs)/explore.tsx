import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { BackupPreview, ImportMode } from "@/services/backup";
import { readBackupPreview } from "@/services/backup";
import { exportBackup, getAccounts, importBackupFromString, saveAccounts } from "@/storage/secureStore";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const backupModes: { value: ImportMode; title: string; description: string }[] = [
  {
    value: "merge",
    title: "Mesclar",
    description: "Atualiza contas com o mesmo rótulo e adiciona contas novas.",
  },
  {
    value: "replace",
    title: "Substituir",
    description: "Apaga as contas atuais e restaura apenas o conteúdo do backup.",
  },
  {
    value: "skip-duplicates",
    title: "Ignorar duplicadas",
    description: "Mantém as contas atuais e importa só o que ainda não existe.",
  },
];

const formatBackupDate = (timestamp?: number) => {
  if (!timestamp) return "Data indisponível";

  return new Date(timestamp).toLocaleString("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export default function BackupScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const [exportPassword, setExportPassword] = useState("");
  const [exportPasswordConfirmation, setExportPasswordConfirmation] = useState("");
  const [importPassword, setImportPassword] = useState("");
  const [selectedMode, setSelectedMode] = useState<ImportMode>("merge");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedBackupText, setSelectedBackupText] = useState<string | null>(null);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isPickingFile, setIsPickingFile] = useState(false);
  const [isExportModalVisible, setIsExportModalVisible] = useState(false);
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);

  const handleExport = async () => {
    const password = exportPassword.trim();

    if (password.length < 8) {
      Alert.alert("Senha fraca", "Defina uma senha com pelo menos 8 caracteres.");
      return;
    }

    if (password !== exportPasswordConfirmation.trim()) {
      Alert.alert("Senhas diferentes", "A confirmação da senha não confere.");
      return;
    }

    setIsExporting(true);

    try {
      const accounts = await getAccounts();

      if (accounts.length === 0) {
        Alert.alert("Sem contas", "Adicione pelo menos uma conta antes de exportar.");
        return;
      }

      const backupJson = await exportBackup(password);
      const filename = `authenticator-backup-${new Date().toISOString().slice(0, 10)}.backup.json`;
      const file = new File(Paths.cache, filename);

      file.create({ overwrite: true });
      file.write(backupJson);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(file.uri, {
          dialogTitle: "Exportar backup criptografado",
          mimeType: "application/json",
        });
      } else {
        Alert.alert("Backup gerado", `Arquivo salvo em cache: ${file.uri}`);
      }

      setExportPassword("");
      setExportPasswordConfirmation("");
      setIsExportModalVisible(false);
    } catch {
      Alert.alert("Erro", "Não foi possível gerar o backup criptografado.");
    } finally {
      setIsExporting(false);
    }
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

      setSelectedFileName(null);
      setSelectedBackupText(null);
      setPreview(null);
      setImportPassword("");
      setIsImportModalVisible(false);
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: colorScheme === "dark" ? "#1f2937" : "#f1f5f9" },
            ]}
          >
            <IconSymbol name="shield.fill" size={32} color={theme.tint} />
          </View>
          <Text style={[styles.heroTitle, { color: theme.text }]}>Segurança e Backup</Text>
          <Text style={[styles.heroText, { color: theme.icon }]}>
            Seus dados são criptografados localmente. O app não faz sincronização em nuvem para
            garantir sua privacidade total.
          </Text>
        </View>

        <View style={styles.actionGrid}>
          <Pressable
            style={({ pressed }) => [
              styles.actionCard,
              {
                backgroundColor: theme.cardBackground,
                borderColor: theme.cardBorder,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            onPress={() => setIsExportModalVisible(true)}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#e0f2fe" }]}>
              <IconSymbol name="arrow.up.doc.fill" size={24} color="#0369a1" />
            </View>
            <Text style={[styles.actionTitle, { color: theme.text }]}>Exportar</Text>
            <Text style={[styles.actionDescription, { color: theme.icon }]}>
              Criar um arquivo protegido por senha
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionCard,
              {
                backgroundColor: theme.cardBackground,
                borderColor: theme.cardBorder,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            onPress={() => setIsImportModalVisible(true)}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#f0fdf4" }]}>
              <IconSymbol name="arrow.down.doc.fill" size={24} color="#15803d" />
            </View>
            <Text style={[styles.actionTitle, { color: theme.text }]}>Importar</Text>
            <Text style={[styles.actionDescription, { color: theme.icon }]}>
              Restaurar de um arquivo .backup.json
            </Text>
          </Pressable>
        </View>

        <View style={[styles.warningBox, { borderColor: theme.cardBorder }]}>
          <View style={styles.warningHeader}>
            <IconSymbol name="exclamationmark.triangle.fill" size={20} color="#b45309" />
            <Text style={styles.warningTitle}>Aviso Importante</Text>
          </View>
          <Text style={styles.warningText}>
            Se você perder o aparelho e não tiver um backup, suas contas 2FA podem ficar
            inacessíveis permanentemente. Guarde seu backup em um local seguro.
          </Text>
        </View>
      </ScrollView>

      {/* Export Modal */}
      <Modal
        visible={isExportModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsExportModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Exportar Backup</Text>
              <Pressable onPress={() => setIsExportModalVisible(false)}>
                <Text style={[styles.cancelText, { color: theme.tint }]}>Cancelar</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text style={[styles.description, { color: theme.icon }]}>
                Crie uma senha forte (mínimo 8 caracteres). Você precisará dela para restaurar
                seus dados futuramente.
              </Text>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Senha do backup</Text>
                <TextInput
                  value={exportPassword}
                  onChangeText={setExportPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  placeholder="No mínimo 8 caracteres"
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

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Confirmar senha</Text>
                <TextInput
                  value={exportPasswordConfirmation}
                  onChangeText={setExportPasswordConfirmation}
                  secureTextEntry
                  autoCapitalize="none"
                  placeholder="Repita a senha"
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

              <Pressable
                style={[styles.primaryButton, isExporting && styles.buttonDisabled]}
                disabled={isExporting}
                onPress={handleExport}
              >
                <Text style={styles.primaryButtonText}>
                  {isExporting ? "Gerando..." : "Gerar arquivo criptografado"}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Import Modal */}
      <Modal
        visible={isImportModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsImportModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Importar Backup</Text>
              <Pressable
                onPress={() => {
                  setIsImportModalVisible(false);
                  setPreview(null);
                  setSelectedBackupText(null);
                }}
              >
                <Text style={[styles.cancelText, { color: theme.tint }]}>Fechar</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              {!preview ? (
                <>
                  <Text style={[styles.description, { color: theme.icon }]}>
                    Selecione um arquivo `.backup.json` exportado anteriormente por este
                    aplicativo.
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
                            <Text style={[styles.modeTitle, { color: theme.text }]}>
                              {mode.title}
                            </Text>
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
                      styles.importButton,
                      (!selectedBackupText || isImporting) && styles.buttonDisabled,
                    ]}
                    disabled={!selectedBackupText || isImporting}
                    onPress={handleImport}
                  >
                    <Text style={styles.primaryButtonText}>
                      {isImporting ? "Importando..." : "Confirmar Importação"}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.resetButton}
                    onPress={() => {
                      setPreview(null);
                      setSelectedBackupText(null);
                    }}
                  >
                    <Text style={[styles.resetButtonText, { color: theme.icon }]}>
                      Escolher outro arquivo
                    </Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    gap: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
    gap: 12,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  heroText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  actionGrid: {
    flexDirection: "row",
    gap: 16,
  },
  actionCard: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  actionDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  warningBox: {
    marginTop: 10,
    padding: 20,
    borderRadius: 24,
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    gap: 10,
  },
  warningHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#92400e",
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#b45309",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: "85%",
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalBody: {
    padding: 24,
    gap: 20,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  primaryButton: {
    borderRadius: 16,
    backgroundColor: "#0a7ea4",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    marginTop: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 10,
    borderStyle: "dashed",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  importFlow: {
    gap: 20,
  },
  previewCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  previewTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  previewMeta: {
    gap: 4,
  },
  previewText: {
    fontSize: 14,
  },
  modeList: {
    gap: 12,
  },
  modeCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  modeRadio: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  modeTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  modeDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 30,
  },
  importButton: {
    marginTop: 10,
  },
  resetButton: {
    alignItems: "center",
    paddingVertical: 10,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
