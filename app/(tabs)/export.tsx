import { AlertModal } from "@/components/AlertModal";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { exportBackup, getAccounts } from "@/storage/secureStore";
import { exportAndShareFile } from "@/utils/file-helpers";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
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

import { backupScreenStyles as styles } from "@/components/backup-shared";

export default function ExportBackupScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const insets = useSafeAreaInsets();
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

      await exportAndShareFile(filename, backupJson);

      setExportPassword("");
      setExportPasswordConfirmation("");

      showAlert(
        "Backup exportado",
        "O arquivo de backup criptografado foi gerado com sucesso. Guarde o arquivo e a senha em um local seguro!",
        () => {
          router.back();
        },
      );
    } catch (error) {
      const message =
        error instanceof Error && error.message === "BACKUP_PASSWORD_TOO_SHORT"
          ? "A senha do backup deve ter no mínimo 8 caracteres."
          : "Não foi possível gerar o backup criptografado. Tente novamente.";
      showAlert("Erro na exportação", message);
    } finally {
      setIsExporting(false);
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
            Exportar
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
