import { useRouter } from "expo-router";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  FlatList,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  Alert,
  TouchableOpacity,
  Modal,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
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
      ],
    );
  };

  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const sheetTranslateY = useRef(new Animated.Value(300)).current;

  const copyToClipboard = async (token: string) => {
    await Clipboard.setStringAsync(token);
  };

  const isLowTime = timeLeft <= 10;
  const progress = (timeLeft / STEP) * 100;

  const openMenu = useCallback((account: Account) => {
    setSelectedAccount(account);
    setIsMenuVisible(true);
    Animated.timing(sheetTranslateY, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [sheetTranslateY]);

  const closeMenu = useCallback(() => {
    Animated.timing(sheetTranslateY, {
      toValue: 300,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsMenuVisible(false);
      }
    });
  }, [sheetTranslateY]);

  const handleMenuOption = (option: string) => {
    if (!selectedAccount) return;

    switch (option) {
      case "delete":
        handleDelete(selectedAccount.secret, selectedAccount.issuer || selectedAccount.account || "Conta");
        break;
      // Other options will be implemented later
      default:
        Alert.alert("Em breve", `A opção "${option}" será implementada em breve.`);
        break;
    }
    closeMenu();
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) &&
          gestureState.dy > 4,
        onPanResponderMove: (_, gestureState) => {
          const nextY = Math.max(0, gestureState.dy);
          sheetTranslateY.setValue(nextY);
        },
        onPanResponderRelease: (_, gestureState) => {
          const shouldClose = gestureState.dy > 90 || gestureState.vy > 1.15;
          if (shouldClose) {
            closeMenu();
            return;
          }
          Animated.timing(sheetTranslateY, {
            toValue: 0,
            duration: 180,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.timing(sheetTranslateY, {
            toValue: 0,
            duration: 180,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start();
        },
      }),
    [closeMenu, sheetTranslateY]
  );

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.welcomeSection}>
        <Ionicons name="shield-checkmark-outline" size={80} color="#0a7ea4" />
        <Text style={styles.welcomeTitle}>
          Vamos adicionar sua primeira conta!
        </Text>
        <Pressable
          style={styles.mainAddButton}
          onPress={() => router.push("/scan")}
        >
          <Text style={styles.mainAddButtonText}>Adicionar conta</Text>
        </Pressable>
      </View>

      <View style={styles.recoverySection}>
        <Text style={styles.recoveryTitle}>Já tem um backup?</Text>
        <Text style={styles.recoverySubtitle}>
          Entre na sua conta de recuperação
        </Text>
        <Pressable
          style={styles.recoveryLink}
          onPress={() => router.push("/explore")}
        >
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

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="search-outline" size={24} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push("/scan")}
          >
            <Ionicons name="add" size={30} color="white" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="ellipsis-vertical" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {accounts.length > 0 && (
        <>
          <View style={styles.timerBar}>
            <View
              style={[
                styles.timerFill,
                {
                  width: `${progress}%`,
                  backgroundColor: isLowTime ? "#ff3b30" : "#0a7ea4",
                },
              ]}
            />
          </View>
          <Text
            style={[
              styles.timerText,
              isLowTime && { color: "#ff3b30", fontWeight: "700" },
            ]}
          >
            {timeLeft}s
          </Text>
        </>
      )}

      <FlatList
        data={accounts}
        keyExtractor={(item) => item.secret}
        contentContainerStyle={[
          styles.list,
          accounts.length === 0 && { flex: 1 },
        ]}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <Ionicons name="key-outline" size={24} color="#0a7ea4" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.issuer}>
                  {item.issuer || item.account || "Conta"}
                </Text>
                {item.issuer && (
                  <Text style={styles.account}>{item.account}</Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => openMenu(item)}
                style={styles.editButton}
              >
                <Ionicons name="pencil-outline" size={22} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.tokenContainer}>
              <Text style={[styles.token, isLowTime && { color: "#ff3b30" }]}>
                {tokens[item.secret] || "------"}
              </Text>
              <View style={styles.tokenActions}>
                <TouchableOpacity
                  onPress={() => copyToClipboard(tokens[item.secret] || "")}
                  style={styles.actionButton}
                >
                  <Ionicons name="copy-outline" size={24} color="#0a7ea4" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={EmptyState}
      />

      <Modal
        visible={isMenuVisible}
        transparent
        animationType="none"
        onRequestClose={closeMenu}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalOverlay} onPress={closeMenu} />
          <Animated.View
            style={[
              styles.modalContent,
              { transform: [{ translateY: sheetTranslateY }] },
            ]}
            {...panResponder.panHandlers}
          >
          <View style={styles.sheetHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Opções da Conta</Text>
            <Text style={styles.modalSubtitle}>
              {selectedAccount?.issuer || selectedAccount?.account}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMenuOption("edit")}
          >
            <Ionicons name="create-outline" size={24} color="#333" />
            <Text style={styles.menuText}>Editar código 2FA</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMenuOption("icon")}
          >
            <Ionicons name="image-outline" size={24} color="#333" />
            <Text style={styles.menuText}>Alterar ícone de Serviço</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMenuOption("move")}
          >
            <Ionicons name="folder-outline" size={24} color="#333" />
            <Text style={styles.menuText}>Mover para pasta</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMenuOption("export")}
          >
            <Ionicons name="share-outline" size={24} color="#333" />
            <Text style={styles.menuText}>Exportar Código 2FA</Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={[styles.menuItem, styles.deleteItem]}
            onPress={() => handleMenuOption("delete")}
          >
            <Ionicons name="trash-outline" size={24} color="#ff3b30" />
            <Text style={[styles.menuText, styles.deleteText]}>
              Excluir código
            </Text>
          </TouchableOpacity>
          </Animated.View>
      </View>
      </Modal>
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
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "#0a7ea4",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerButton: {
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "500",
    color: "white",
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
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e0f2f1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
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
  editButton: {
    padding: 8,
  },
  token: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 4,
  },
  tokenContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  tokenActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    padding: 8,
    backgroundColor: "#fff",
    borderRadius: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  // Account options modal styles
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: "55%",
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#d1d5db",
    marginTop: 10,
    marginBottom: 2,
  },
  modalHeader: {
    paddingVertical: 20,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
    gap: 12,
  },
  menuText: {
    fontSize: 16,
    color: "#333",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginVertical: 8,
  },
  deleteItem: {
    marginTop: 8,
  },
  deleteText: {
    color: "#ff3b30",
    fontWeight: "600",
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
