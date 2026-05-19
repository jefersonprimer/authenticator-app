import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { exportBackup, getAccounts } from "@/storage/secureStore";
import { useRouter } from "expo-router";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
  Text,
  TextInput,
  View,
  Pressable,
} from "react-native";

import { backupScreenStyles as styles } from "./backup-shared";

export default function ExportBackupScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const [exportPassword, setExportPassword] = useState("");
  const [exportPasswordConfirmation, setExportPasswordConfirmation] = useState("");
  const [isExporting, setIsExporting] = useState(false);

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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Exportar</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboard}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={[styles.description, { color: theme.icon }]}>
            Crie uma senha forte (mínimo 8 caracteres). Você precisará dela para restaurar seus
            dados futuramente.
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
      </KeyboardAvoidingView>
    </View>
  );
}
