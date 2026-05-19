import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { Account } from "@/storage/secureStore";
import { getAccounts, updateAccount } from "@/storage/secureStore";
import {
  getAccountDisplayName,
  getAccountSubtitle,
} from "@/utils/account-display";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function EditAccountScreen() {
  const { secret } = useLocalSearchParams<{ secret?: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const [account, setAccount] = useState<Account | null>(null);
  const [issuerInput, setIssuerInput] = useState("");
  const [accountInput, setAccountInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadAccount = useCallback(async () => {
    if (!secret) return;

    const accounts = await getAccounts();
    const nextAccount = accounts.find((item) => item.id === secret) ?? null;
    setAccount(nextAccount);
  }, [secret]);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  useFocusEffect(
    useCallback(() => {
      loadAccount();
    }, [loadAccount]),
  );

  useEffect(() => {
    setIssuerInput(account?.issuer ?? "");
    setAccountInput(account?.account ?? "");
  }, [account]);

  const handleSave = useCallback(async () => {
    if (!account?.id || isSaving) return;

    setIsSaving(true);

    try {
      await updateAccount(account.id, {
        issuer: issuerInput.trim() || undefined,
        account: accountInput.trim() || undefined,
      });
      router.back();
    } finally {
      setIsSaving(false);
    }
  }, [account, accountInput, isSaving, issuerInput, router]);

  const displayName = account ? getAccountDisplayName(account) : "Conta";
  const subtitle = account ? getAccountSubtitle(account) : "";

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.headerBackground,
            borderBottomColor: theme.headerBorder,
          },
        ]}
      >
        <Pressable style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Editar conta
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {!account ? (
            <View
              style={[
                styles.emptyState,
                {
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.headerBorder,
                },
              ]}
            >
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                Conta nao encontrada
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.icon }]}>
                Essa conta pode ter sido removida ou ainda nao foi carregada.
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.headerBorder,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  {displayName}
                </Text>
                <Text style={[styles.cardSubtitle, { color: theme.icon }]}>
                  {subtitle}
                </Text>
              </View>

              <Text style={[styles.label, { color: theme.text }]}>
                Nome do servico
              </Text>
              <TextInput
                value={issuerInput}
                onChangeText={setIssuerInput}
                placeholder="Ex: GitHub"
                placeholderTextColor={theme.icon}
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    borderColor: theme.headerBorder,
                    backgroundColor:
                      colorScheme === "dark" ? "#111827" : "#f8fafc",
                  },
                ]}
              />

              <Text style={[styles.label, { color: theme.text }]}>
                Conta / e-mail
              </Text>
              <TextInput
                value={accountInput}
                onChangeText={setAccountInput}
                placeholder="Ex: user@email.com"
                placeholderTextColor={theme.icon}
                autoCapitalize="none"
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    borderColor: theme.headerBorder,
                    backgroundColor:
                      colorScheme === "dark" ? "#111827" : "#f8fafc",
                  },
                ]}
              />

              <View style={styles.actions}>
                <Pressable
                  style={[
                    styles.cancelButton,
                    {
                      backgroundColor:
                        colorScheme === "dark" ? "#1f2937" : "#f3f4f6",
                    },
                  ]}
                  onPress={() => router.back()}
                  disabled={isSaving}
                >
                  <Text
                    style={[styles.cancelButtonText, { color: theme.text }]}
                  >
                    Cancelar
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.saveButton,
                    isSaving && styles.saveButtonDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  <Text style={styles.saveButtonText}>
                    {isSaving ? "Salvando..." : "Salvar"}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    borderWidth: 1,
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    flex: 1,
    width: "100%",
    borderWidth: 1,
    padding: 20,
  },
  cardHeader: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "800",
  },
  cardSubtitle: {
    marginTop: 4,
    fontSize: 15,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 14,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  saveButton: {
    flex: 1,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    backgroundColor: "#2563eb",
  },
  saveButtonDisabled: {
    opacity: 0.8,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
});
