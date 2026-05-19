import { AlertModal } from "@/components/AlertModal";
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
import { useCallback, useEffect, useRef, useState } from "react";
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
  const systemColorScheme = useColorScheme();
  const systemTheme = Colors[systemColorScheme ?? "light"];
  const theme = Colors.dark;
  const [account, setAccount] = useState<Account | null>(null);
  const [issuerInput, setIssuerInput] = useState("");
  const [accountInput, setAccountInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const saveLockRef = useRef(false);
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: "",
    description: "",
  });

  const normalize = (value?: string) => (value ?? "").trim().toLowerCase();

  const showAlert = (title: string, description: string) => {
    setAlertConfig({ visible: true, title, description });
  };

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
    if (!account?.id || isSaving || saveLockRef.current) return;

    const nextIssuer = issuerInput.trim() || undefined;
    const nextAccount = accountInput.trim() || undefined;

    saveLockRef.current = true;

    setIsSaving(true);

    try {
      const accounts = await getAccounts();
      const duplicatedAccount = accounts.some(
        (item) =>
          item.id !== account.id &&
          normalize(item.issuer) === normalize(nextIssuer) &&
          normalize(item.account) === normalize(nextAccount),
      );

      if (duplicatedAccount) {
        showAlert(
          "Conta existente",
          "Ja existe outra conta com esse mesmo servico e rotulo.",
        );
        return;
      }

      await updateAccount(account.id, {
        issuer: nextIssuer,
        account: nextAccount,
      });
      router.back();
    } finally {
      saveLockRef.current = false;
      setIsSaving(false);
    }
  }, [account, accountInput, isSaving, issuerInput, router]);

  const displayName = account ? getAccountDisplayName(account) : "Conta";
  const subtitle = account ? getAccountSubtitle(account) : "";

  return (
    <View style={[styles.screen, { backgroundColor: "#000" }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: systemTheme.headerBackground,
          },
        ]}
      >
        <Pressable style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={systemTheme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: systemTheme.text }]}>
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
                  borderColor: theme.cardBorder,
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
                  backgroundColor: "#000",
                  borderColor: theme.cardBorder,
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
                    borderColor: theme.cardBorder,
                    backgroundColor: theme.cardBackground,
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
                    borderColor: theme.cardBorder,
                    backgroundColor: theme.cardBackground,
                  },
                ]}
              />

              <View style={styles.actions}>
                <Pressable
                  style={[
                    styles.cancelButton,
                    {
                      backgroundColor: "#1f2937",
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
                    { backgroundColor: theme.tint },
                    isSaving && styles.saveButtonDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  <Text
                    style={[
                      styles.saveButtonText,
                      { color: "#000" },
                    ]}
                  >
                    {isSaving ? "Salvando..." : "Salvar"}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <AlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        description={alertConfig.description}
        onClose={() =>
          setAlertConfig((current) => ({ ...current, visible: false }))
        }
      />
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
