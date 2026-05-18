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
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: theme.cardBackground,
            borderColor: theme.cardBorder,
          },
        ]}
      >
        <Text style={[styles.heroTitle, { color: theme.text }]}>Backup local criptografado</Text>
        <Text style={[styles.heroText, { color: theme.icon }]}>
          O backup agora sai como arquivo protegido por senha. O app não faz cloud sync e o
          arquivo nunca deve ser salvo sem essa camada de criptografia.
        </Text>
      </View>

      <View
        style={[
          styles.section,
          { backgroundColor: theme.cardBackground, borderColor: theme.cardBorder },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Exportar backup</Text>
        <Text style={[styles.description, { color: theme.icon }]}>
          Defina uma senha forte. Sem essa senha, o arquivo não poderá ser restaurado.
        </Text>

        <TextInput
          value={exportPassword}
          onChangeText={setExportPassword}
          secureTextEntry
          autoCapitalize="none"
          placeholder="Senha do backup"
          placeholderTextColor="#9ca3af"
          style={[
            styles.input,
            {
              color: theme.text,
              backgroundColor: colorScheme === "dark" ? "#111827" : "#f9fafb",
              borderColor: theme.cardBorder,
            },
          ]}
        />
        <TextInput
          value={exportPasswordConfirmation}
          onChangeText={setExportPasswordConfirmation}
          secureTextEntry
          autoCapitalize="none"
          placeholder="Confirmar senha"
          placeholderTextColor="#9ca3af"
          style={[
            styles.input,
            {
              color: theme.text,
              backgroundColor: colorScheme === "dark" ? "#111827" : "#f9fafb",
              borderColor: theme.cardBorder,
            },
          ]}
        />

        <Pressable
          style={[styles.primaryButton, isExporting && styles.buttonDisabled]}
          disabled={isExporting}
          onPress={handleExport}
        >
          <Text style={styles.primaryButtonText}>
            {isExporting ? "Gerando backup..." : "Gerar arquivo criptografado"}
          </Text>
        </Pressable>
      </View>

      <View
        style={[
          styles.section,
          { backgroundColor: theme.cardBackground, borderColor: theme.cardBorder },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Importar backup</Text>
        <Text style={[styles.description, { color: theme.icon }]}>
          Escolha um arquivo `.backup.json`. Backups antigos em JSON puro ainda são aceitos para
          migração.
        </Text>

        <Pressable
          style={[styles.secondaryButton, { borderColor: theme.cardBorder }]}
          onPress={handlePickBackup}
          disabled={isPickingFile}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.text }]}>
            {isPickingFile ? "Lendo arquivo..." : "Selecionar arquivo de backup"}
          </Text>
        </Pressable>

        {preview ? (
          <View
            style={[
              styles.previewCard,
              {
                backgroundColor: colorScheme === "dark" ? "#111827" : "#f8fafc",
                borderColor: theme.cardBorder,
              },
            ]}
          >
            <Text style={[styles.previewTitle, { color: theme.text }]}>
              {selectedFileName ?? "Arquivo selecionado"}
            </Text>
            <Text style={[styles.previewText, { color: theme.icon }]}>
              Tipo: {preview.kind === "encrypted" ? "Criptografado" : "Legado sem criptografia"}
            </Text>
            <Text style={[styles.previewText, { color: theme.icon }]}>
              Contas: {preview.entriesCount}
            </Text>
            <Text style={[styles.previewText, { color: theme.icon }]}>
              Criado em: {formatBackupDate(preview.createdAt)}
            </Text>
          </View>
        ) : null}

        {preview?.requiresPassword ? (
          <TextInput
            value={importPassword}
            onChangeText={setImportPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholder="Senha do backup"
            placeholderTextColor="#9ca3af"
            style={[
              styles.input,
              {
                color: theme.text,
                backgroundColor: colorScheme === "dark" ? "#111827" : "#f9fafb",
                borderColor: theme.cardBorder,
              },
            ]}
          />
        ) : null}

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
                        ? "#132534"
                        : "#eef7fb"
                      : theme.cardBackground,
                  },
                ]}
              >
                <Text style={[styles.modeTitle, { color: theme.text }]}>{mode.title}</Text>
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
            {isImporting ? "Importando..." : "Importar backup"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.warningBox}>
        <Text style={styles.warningText}>
          Se você perder o aparelho e também perder esse backup, as contas 2FA podem ficar
          inacessíveis. Guarde o arquivo e os recovery codes em locais separados.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    gap: 18,
  },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  heroText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "700",
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
  },
  primaryButton: {
    borderRadius: 14,
    backgroundColor: "#0a7ea4",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
  },
  importButton: {
    marginTop: 4,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  previewCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 4,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  previewText: {
    fontSize: 13,
    lineHeight: 18,
  },
  modeList: {
    gap: 10,
  },
  modeCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  modeTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  modeDescription: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  warningBox: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: "#fff3cd",
    borderWidth: 1,
    borderColor: "#ffeeba",
  },
  warningText: {
    color: "#856404",
    fontSize: 13,
    lineHeight: 18,
  },
});
