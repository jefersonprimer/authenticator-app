import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
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
import { validateOtpSecret } from "@/services/totp";
import type { Account } from "@/storage/secureStore";
import { getAccounts, saveAccounts } from "@/storage/secureStore";
import { createOtpEntry, normalizeAlgorithm, normalizeDigits, normalizePeriod, normalizeSecret } from "@/utils/otp";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { AlertModal } from "@/components/AlertModal";

const normalize = (value?: string) => (value ?? "").trim().toLowerCase();

export default function ManualEntryScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const [issuer, setIssuer] = useState("");
  const [accountName, setAccountName] = useState("");
  const [secret, setSecret] = useState("");
  const [algorithm] = useState("SHA1");
  const [digits] = useState("6");
  const [period] = useState("30");
  const [isSaving, setIsSaving] = useState(false);

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

  const handleSubmit = async () => {
    const normalizedSecret = normalizeSecret(secret);
    const normalizedIssuer = issuer.trim() || undefined;
    const normalizedAccount = accountName.trim() || undefined;

    if (!normalizedSecret || !normalizedAccount) {
      showAlert("Campos obrigatórios", "Preencha a conta/e-mail e a chave secreta.");
      return;
    }

    const account = createOtpEntry({
      issuer: normalizedIssuer,
      account: normalizedAccount,
      secret: normalizedSecret,
      algorithm: normalizeAlgorithm(algorithm),
      digits: normalizeDigits(Number(digits)),
      period: normalizePeriod(Number(period)),
    });

    try {
      validateOtpSecret(account);
    } catch {
      showAlert("Dados inválidos", "Revise a chave secreta. Ela deve estar no formato Base32 (letras e números).");
      return;
    }

    setIsSaving(true);

    try {
      const accounts = await getAccounts();
      const duplicatedAccount = accounts.some(
        (item) =>
          normalize(item.issuer) === normalize(account.issuer) &&
          normalize(item.account) === normalize(account.account),
      );

      if (duplicatedAccount) {
        showAlert("Conta existente", "Já existe uma conta com esse mesmo serviço e rótulo.");
        return;
      }

      await saveAccounts([...accounts, account as Account]);
      router.replace("/");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
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
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>Adicionar manualmente</Text>
        <View style={styles.iconSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={[styles.formCard, { backgroundColor: theme.cardBackground, borderTopWidth: 1, borderTopColor: theme.headerBorder }]}>
            <Text style={[styles.label, { color: theme.text }]}>Serviço</Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.headerBorder, backgroundColor: colorScheme === 'dark' ? '#111827' : '#f9fafb' }]}
              value={issuer}
              onChangeText={setIssuer}
              placeholder="Ex: GitHub"
              placeholderTextColor={theme.icon}
            />

            <Text style={[styles.label, { color: theme.text }]}>Conta / e-mail</Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.headerBorder, backgroundColor: colorScheme === 'dark' ? '#111827' : '#f9fafb' }]}
              value={accountName}
              onChangeText={setAccountName}
              placeholder="Ex: user@email.com"
              placeholderTextColor={theme.icon}
              autoCapitalize="none"
            />

            <Text style={[styles.label, { color: theme.text }]}>Chave secreta</Text>
            <TextInput
              style={[styles.input, styles.secretInput, { color: theme.text, borderColor: theme.headerBorder, backgroundColor: colorScheme === 'dark' ? '#111827' : '#f9fafb' }]}
              value={secret}
              onChangeText={setSecret}
              placeholder="Cole a chave secreta"
              placeholderTextColor={theme.icon}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: theme.tint }, isSaving && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSaving}
            >
              <Text style={[styles.submitButtonText, { color: colorScheme === 'dark' ? '#000' : '#fff' }]}>Concluir</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <AlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        description={alertConfig.description}
        onClose={() => setAlertConfig({ ...alertConfig, visible: false })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  iconSpacer: {
    width: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  formCard: {
    flex: 1,
    padding: 20,
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
  },
  secretInput: {
    letterSpacing: 1.1,
  },
  submitButton: {
    marginTop: 8,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
