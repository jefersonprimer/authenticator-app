import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View, Alert } from "react-native";
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Authenticator</Text>
        <Pressable style={styles.addButton} onPress={() => router.push("/scan")}>
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>

      <View style={styles.timerBar}>
        <View style={[styles.timerFill, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.timerText}>{timeLeft}s</Text>

      <FlatList
        data={accounts}
        keyExtractor={(item) => item.secret}
        contentContainerStyle={styles.list}
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
                <Text style={styles.deleteButtonText}>Remover</Text>
              </Pressable>
            </View>
            <Text style={styles.token}>{tokens[item.secret] || "------"}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhuma conta. Toque em + para adicionar.</Text>
        }
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0a7ea4",
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 24,
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
  deleteButtonText: {
    color: "#ff3b30",
    fontSize: 12,
    fontWeight: "600",
  },
  token: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 4,
    marginTop: 8,
  },
  empty: {
    textAlign: "center",
    marginTop: 60,
    fontSize: 16,
    color: "#999",
  },
});
