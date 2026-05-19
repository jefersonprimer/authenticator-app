import { AlertModal } from "@/components/AlertModal";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { exportBackup, getAccounts } from "@/storage/secureStore";
import { Ionicons } from "@expo/vector-icons";
import { File, Paths } from "expo-file-system";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { backupScreenStyles as styles } from "./backup-shared";

export default function ExportBackupScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const [exportPassword, setExportPassword] = useState("");
  const [exportPasswordConfirmation, setExportPasswordConfirmation] =
    useState("");
  const [isExportPasswordVisible, setIsExportPasswordVisible] = useState(false);
  const [
    isExportPasswordConfirmationVisible,
    setIsExportPasswordConfirmationVisible,
  ] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const isBusy = isExporting;

  // Modal state
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    description: string;
  }>({
    visible: false,
    title: "",
    description: "",
  });

  const showAlert = (title: string, description: string) => {
    setAlertConfig({ visible: true, title, description });
  };

  const handleExport = async () => {
    const password = exportPassword.trim();

    if (password.length < 8) {
      showAlert("Senha fraca", "Defina uma senha com pelo menos 8 caracteres.");
      return;
    }

    if (password !== exportPasswordConfirmation.trim()) {
      showAlert("Senhas diferentes", "A confirmação da senha não confere.");
      return;
    }

    setIsExporting(true);

    try {
      const accounts = await getAccounts();

      if (accounts.length === 0) {
        showAlert(
          "Sem contas",
          "Adicione pelo menos uma conta antes de exportar.",
        );
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
        showAlert("Backup gerado", `Arquivo salvo em cache: ${file.uri}`);
      }

      setExportPassword("");
      setExportPasswordConfirmation("");
    } catch {
      showAlert("Erro", "Não foi possível gerar o backup criptografado.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.headerBackground,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.backButton, isBusy && styles.buttonDisabled]}
          onPress={() => router.back()}
          disabled={isBusy}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Exportar
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.description, { color: theme.icon }]}>
            Crie uma senha forte (mínimo 8 caracteres). Você precisará dela para
            restaurar seus dados futuramente.
          </Text>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>
              Senha do backup
            </Text>
            <View style={styles.passwordField}>
              <TextInput
                value={exportPassword}
                onChangeText={setExportPassword}
                secureTextEntry={!isExportPasswordVisible}
                autoCapitalize="none"
                editable={!isBusy}
                placeholder="No mínimo 8 caracteres"
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
                  setIsExportPasswordVisible((current) => !current)
                }
                disabled={isBusy}
                hitSlop={8}
              >
                <Ionicons
                  name={
                    isExportPasswordVisible ? "eye-off-outline" : "eye-outline"
                  }
                  size={22}
                  color={theme.icon}
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>
              Confirmar senha
            </Text>
            <View style={styles.passwordField}>
              <TextInput
                value={exportPasswordConfirmation}
                onChangeText={setExportPasswordConfirmation}
                secureTextEntry={!isExportPasswordConfirmationVisible}
                autoCapitalize="none"
                editable={!isBusy}
                placeholder="Repita a senha"
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
                  setIsExportPasswordConfirmationVisible((current) => !current)
                }
                disabled={isBusy}
                hitSlop={8}
              >
                <Ionicons
                  name={
                    isExportPasswordConfirmationVisible
                      ? "eye-off-outline"
                      : "eye-outline"
                  }
                  size={22}
                  color={theme.icon}
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={[styles.primaryButton, isBusy && styles.buttonDisabled]}
            disabled={isBusy}
            onPress={handleExport}
          >
            <View style={styles.buttonContent}>
              {isExporting && <ActivityIndicator size="small" color="#fff" />}
              <Text style={styles.primaryButtonText}>
                {isExporting ? "Gerando..." : "Gerar arquivo criptografado"}
              </Text>
            </View>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {isExporting && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingContent}>
            <Text style={styles.processingTitle}>Processando exportação</Text>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.processingDescription}>
              Criptografando suas contas e preparando o arquivo para
              compartilhamento. Isso pode levar alguns segundos.
            </Text>
          </View>
        </View>
      )}

      <AlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        description={alertConfig.description}
        onClose={() => setAlertConfig({ ...alertConfig, visible: false })}
      />
    </View>
  );
}
