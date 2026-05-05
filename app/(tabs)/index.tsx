import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { generateToken } from "@/services/totp";
import type { Account } from "@/storage/secureStore";
import { getAccounts, removeAccount } from "@/storage/secureStore";

const STEP = 30;

export default function HomeScreen() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(STEP);
  const router = useRouter();

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = STEP - (now % STEP);
      setTimeLeft(remaining);

      const newTokens: Record<string, string> = {};
      accounts.forEach((acc) => {
        newTokens[acc.secret] = generateToken(acc.secret);
      });
      setTokens(newTokens);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [accounts]);

  const load = async () => {
    const data = await getAccounts();
    setAccounts(data);
  };

  const handleDelete = (secret: string, label: string) => {
    Alert.alert(
      "Remover Conta",
      `Tem certeza que deseja remover a conta "${label}"? Você perderá o acesso ao 2FA se não tiver um backup.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: async () => {
            await removeAccount(secret);
            load();
          },
        },
      ]
    );
  };

  const progress = useMemo(() => (timeLeft / STEP) * 100, [timeLeft]);

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.welcomeSection}>
        <Ionicons name="shield-checkmark-outline" size={80} color="#0a7ea4" />
        <Text style={styles.welcomeTitle}>Vamos adicionar sua primeira conta!</Text>
        <Pressable style={styles.mainAddButton} onPress={() => router.push("/scan")}>
          <Text style={styles.mainAddButtonText}>Adicionar conta</Text>
        </Pressable>
      </View>

      <View style={styles.recoverySection}>
        <Text style={styles.recoveryTitle}>Já tem um backup?</Text>
        <Text style={styles.recoverySubtitle}>Entre na sua conta de recuperação</Text>
        <Pressable style={styles.recoveryLink} onPress={() => router.push("/explore")}>
          <Text style={styles.recoveryLinkText}>Iniciar a recuperação</Text>
        </Pressable>
      </View>

      <View style={styles.bottomActions}>
        <Pressable style={styles.fabScan} onPress={() => router.push("/scan")}>
          <Ionicons name="qr-code-outline" size={28} color="#fff" />
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Authenticator</Text>
      </View>

      {accounts.length > 0 && (
        <>
          <View style={styles.timerBar}>
            <View style={[styles.timerFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.timerText}>{timeLeft}s</Text>
        </>
      )}

      <FlatList
        data={accounts}
        keyExtractor={(item) => item.secret}
        contentContainerStyle={[styles.list, accounts.length === 0 && { flex: 1 }]}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.issuer}>{item.issuer || item.account || "Conta"}</Text>
                {item.issuer && <Text style={styles.account}>{item.account}</Text>}
              </View>
              <Pressable
                onPress={() => handleDelete(item.secret, item.issuer || item.account || "Conta")}
                style={styles.deleteButton}
              >
                <Ionicons name="trash-outline" size={20} color="#ff3b30" />
              </Pressable>
            </View>
            <Text style={styles.token}>{tokens[item.secret] || "------"}</Text>
          </View>
        )}
        ListEmptyComponent={EmptyState}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  timerBar: {
    height: 4,
    backgroundColor: "#e0e0e0",
    marginHorizontal: 20,
    borderRadius: 2,
    overflow: "hidden",
  },
  timerFill: {
    height: "100%",
    backgroundColor: "#0a7ea4",
  },
  timerText: {
    textAlign: "center",
    marginTop: 8,
    fontSize: 14,
    color: "#666",
  },
  list: {
    padding: 20,
    gap: 16,
  },
  card: {
    padding: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  issuer: {
    fontSize: 18,
    fontWeight: "600",
  },
  account: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  deleteButton: {
    padding: 4,
  },
  token: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 4,
    marginTop: 8,
  },
  // Empty State Styles
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
  },
  welcomeSection: {
    alignItems: "center",
    marginBottom: 60,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 24,
    color: "#333",
  },
  mainAddButton: {
    backgroundColor: "#0a7ea4",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  mainAddButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  recoverySection: {
    alignItems: "center",
    marginBottom: 40,
  },
  recoveryTitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 4,
  },
  recoverySubtitle: {
    fontSize: 14,
    color: "#999",
    marginBottom: 12,
  },
  recoveryLink: {
    padding: 8,
  },
  recoveryLinkText: {
    color: "#0a7ea4",
    fontSize: 16,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  bottomActions: {
    position: "absolute",
    bottom: 20,
    right: 0,
  },
  fabScan: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#0a7ea4",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
});
