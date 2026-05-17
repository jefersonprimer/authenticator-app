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
import { generateToken } from "@/services/totp";
import type { Account } from "@/storage/secureStore";
import { getAccounts, saveAccounts } from "@/storage/secureStore";

const normalize = (value?: string) => (value ?? "").trim().toLowerCase();
const normalizeSecret = (value: string) => value.replace(/\s+/g, "").toUpperCase();

export default function ManualEntryScreen() {
  const router = useRouter();
  const [accountName, setAccountName] = useState("");
  const [secret, setSecret] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    const trimmedName = accountName.trim();
    const normalizedSecret = normalizeSecret(secret);

    if (!trimmedName || !normalizedSecret) {
      Alert.alert("Campos obrigatórios", "Preencha o nome da conta e a chave secreta.");
      return;
    }

    try {
      generateToken(normalizedSecret);
    } catch {
      Alert.alert("Chave inválida", "A chave secreta informada não é válida.");
      return;
    }

    setIsSaving(true);

    try {
      const accounts = await getAccounts();
      const account: Account = {
        account: trimmedName,
        secret: normalizedSecret,
      };

      const duplicatedAccount = accounts.some(
        (item) =>
          normalize(item.issuer) === normalize(account.issuer) &&
          normalize(item.account) === normalize(account.account),
      );

      if (duplicatedAccount) {
        Alert.alert("Conta existente", "Já existe uma conta com esse nome.");
        return;
      }

      await saveAccounts([...accounts, account]);
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
            <Text style={styles.label}>Nome da conta</Text>
            <TextInput
              style={styles.input}
              value={accountName}
              onChangeText={setAccountName}
              placeholder="Ex: Google"
              placeholderTextColor="#9ca3af"
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
    letterSpacing: 1.2,
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
