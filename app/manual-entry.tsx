import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
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
import { SafeAreaView } from "react-native-safe-area-context";
import { validateOtpSecret } from "@/services/totp";
import type { Account } from "@/storage/secureStore";
import { getAccounts, saveAccounts } from "@/storage/secureStore";
import { createOtpEntry, normalizeAlgorithm, normalizeDigits, normalizePeriod, normalizeSecret } from "@/utils/otp";

const normalize = (value?: string) => (value ?? "").trim().toLowerCase();

export default function ManualEntryScreen() {
  const router = useRouter();
  const [issuer, setIssuer] = useState("");
  const [accountName, setAccountName] = useState("");
  const [secret, setSecret] = useState("");
  const [algorithm, setAlgorithm] = useState("SHA1");
  const [digits, setDigits] = useState("6");
  const [period, setPeriod] = useState("30");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    const normalizedSecret = normalizeSecret(secret);
    const normalizedIssuer = issuer.trim() || undefined;
    const normalizedAccount = accountName.trim() || undefined;

    if (!normalizedSecret || !normalizedAccount) {
      Alert.alert("Campos obrigatórios", "Preencha a conta/e-mail e a chave secreta.");
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
      Alert.alert("Dados inválidos", "Revise a chave secreta e os parâmetros do token.");
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
        Alert.alert("Conta existente", "Já existe uma conta com esse mesmo serviço e rótulo.");
        return;
      }

      await saveAccounts([...accounts, account as Account]);
      router.replace("/");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.iconButton}>
              <Ionicons name="arrow-back" size={22} color="#111827" />
            </Pressable>
            <Text style={styles.title}>Adicionar manualmente</Text>
            <View style={styles.iconSpacer} />
          </View>

          <View style={styles.formCard}>
            <Text style={styles.label}>Serviço</Text>
            <TextInput
              style={styles.input}
              value={issuer}
              onChangeText={setIssuer}
              placeholder="Ex: GitHub"
              placeholderTextColor="#9ca3af"
            />

            <Text style={styles.label}>Conta / e-mail</Text>
            <TextInput
              style={styles.input}
              value={accountName}
              onChangeText={setAccountName}
              placeholder="Ex: user@email.com"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Chave secreta</Text>
            <TextInput
              style={[styles.input, styles.secretInput]}
              value={secret}
              onChangeText={setSecret}
              placeholder="Cole a chave secreta"
              placeholderTextColor="#9ca3af"
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <View style={styles.inlineRow}>
              <View style={styles.inlineField}>
                <Text style={styles.label}>Algoritmo</Text>
                <TextInput
                  style={styles.input}
                  value={algorithm}
                  onChangeText={setAlgorithm}
                  placeholder="SHA1"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </View>
              <View style={styles.inlineField}>
                <Text style={styles.label}>Dígitos</Text>
                <TextInput
                  style={styles.input}
                  value={digits}
                  onChangeText={setDigits}
                  placeholder="6"
                  placeholderTextColor="#9ca3af"
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.inlineField}>
                <Text style={styles.label}>Período</Text>
                <TextInput
                  style={styles.input}
                  value={period}
                  onChangeText={setPeriod}
                  placeholder="30"
                  placeholderTextColor="#9ca3af"
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, isSaving && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSaving}
            >
              <Text style={styles.submitButtonText}>Concluir</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: "#f6f7fb",
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  header: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  iconSpacer: {
    width: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  formCard: {
    borderRadius: 20,
    backgroundColor: "#ffffff",
    padding: 20,
    gap: 12,
    shadowColor: "#111827",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#f9fafb",
  },
  secretInput: {
    letterSpacing: 1.1,
  },
  inlineRow: {
    flexDirection: "row",
    gap: 10,
  },
  inlineField: {
    flex: 1,
    gap: 8,
  },
  submitButton: {
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: "#0a7ea4",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
  },
  submitButtonDisabled: {
    backgroundColor: "#8fb8c7",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
