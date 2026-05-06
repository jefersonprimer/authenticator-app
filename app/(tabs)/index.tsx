import { useRouter } from "expo-router";
import { useEffect, useState, useCallback, useRef, useMemo, type ComponentProps } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  FlatList,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
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
type IoniconName = ComponentProps<typeof Ionicons>["name"];

const SERVICE_ICON_MAP: Record<string, IoniconName> = {
  google: "logo-google",
  github: "logo-github",
  gitlab: "logo-gitlab",
  microsoft: "logo-microsoft",
  amazon: "logo-amazon",
  apple: "logo-apple",
  facebook: "logo-facebook",
  twitter: "logo-twitter",
  twitch: "logo-twitch",
  discord: "logo-discord",
  bitbucket: "logo-bitbucket",
  linkedin: "logo-linkedin",
  dropbox: "logo-dropbox",
  yahoo: "mail-outline",
};

const SERVICE_COLOR_MAP: Record<string, { icon: string; background: string }> = {
  google: { icon: "#DB4437", background: "#FEEFEA" },
  github: { icon: "#181717", background: "#ECECEC" },
  gitlab: { icon: "#FC6D26", background: "#FFF1E8" },
  microsoft: { icon: "#00A4EF", background: "#EAF6FF" },
  amazon: { icon: "#FF9900", background: "#FFF4E5" },
  apple: { icon: "#111111", background: "#F0F0F0" },
  facebook: { icon: "#1877F2", background: "#EAF2FF" },
  twitter: { icon: "#1D9BF0", background: "#E8F6FF" },
  twitch: { icon: "#9146FF", background: "#F3ECFF" },
  discord: { icon: "#5865F2", background: "#EEF0FF" },
  bitbucket: { icon: "#0052CC", background: "#EAF1FF" },
  linkedin: { icon: "#0A66C2", background: "#E9F2FB" },
  dropbox: { icon: "#0061FF", background: "#E8F1FF" },
  yahoo: { icon: "#6001D2", background: "#F3ECFF" },
};

const getServiceName = (account: Account): string | null => {
  const source = `${account.issuer ?? ""} ${account.account ?? ""}`.toLowerCase();

  for (const serviceName of Object.keys(SERVICE_ICON_MAP)) {
    if (source.includes(serviceName)) {
      return serviceName;
    }
  }

  return null;
};

const getServiceIcon = (account: Account): IoniconName => {
  const service = getServiceName(account);
  if (!service) return "key-outline";
  return SERVICE_ICON_MAP[service];
};

const getServiceColors = (account: Account): { icon: string; background: string } => {
  const service = getServiceName(account);
  if (!service) return { icon: "#0a7ea4", background: "#e0f2f1" };
  return SERVICE_COLOR_MAP[service] ?? { icon: "#0a7ea4", background: "#e0f2f1" };
};

export default function HomeScreen() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(STEP);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<TextInput>(null);
  const router = useRouter();

  useEffect(() => {
    load();
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, []),
  );

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

  const handleDelete = async (secret: string) => {
    await removeAccount(secret);
    setAccountPendingDeletion(null);
    load();
  };

  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [accountPendingDeletion, setAccountPendingDeletion] = useState<Account | null>(null);
  const sheetTranslateY = useRef(new Animated.Value(300)).current;

  const copyToClipboard = async (token: string) => {
    await Clipboard.setStringAsync(token);
  };

  const isLowTime = timeLeft <= 10;
  const progress = (timeLeft / STEP) * 100;
  const filteredAccounts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return accounts;

    return accounts.filter((account) => {
      const issuer = account.issuer?.toLowerCase() ?? "";
      const accountName = account.account?.toLowerCase() ?? "";
      return issuer.includes(normalizedQuery) || accountName.includes(normalizedQuery);
    });
  }, [accounts, searchQuery]);

  useEffect(() => {
    if (!isSearching) return;
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [isSearching]);

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
        setAccountPendingDeletion(selectedAccount);
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

  const SearchEmptyState = () => (
    <View style={styles.searchEmptyContainer}>
      <Ionicons name="search-outline" size={52} color="#9ca3af" />
      <Text style={styles.searchEmptyTitle}>Nenhuma conta encontrada</Text>
      <Text style={styles.searchEmptySubtitle}>
        Tente pesquisar por outro nome de conta ou serviço.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {isSearching ? (
          <View style={styles.searchHeaderContainer}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => {
                setIsSearching(false);
                setSearchQuery("");
              }}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Pesquisar contas"
              placeholderTextColor="#d1d5db"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              selectionColor="#ffffff"
              returnKeyType="search"
            />
          </View>
        ) : (
          <>
            <Text style={styles.title}>Authenticator</Text>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setIsSearching(true)}
              >
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
          </>
        )}
      </View>

      {filteredAccounts.length > 0 && (
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
        data={filteredAccounts}
        keyExtractor={(item, index) =>
          `${item.secret}-${item.issuer ?? "issuer"}-${item.account ?? "account"}-${index}`
        }
        contentContainerStyle={[
          styles.list,
          filteredAccounts.length === 0 && { flex: 1 },
        ]}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: getServiceColors(item).background },
                ]}
              >
                <Ionicons
                  name={getServiceIcon(item)}
                  size={24}
                  color={getServiceColors(item).icon}
                />
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
        ListEmptyComponent={
          isSearching && accounts.length > 0 ? SearchEmptyState : EmptyState
        }
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

      <Modal
        visible={!!accountPendingDeletion}
        transparent
        animationType="fade"
        onRequestClose={() => setAccountPendingDeletion(null)}
      >
        <View style={styles.deleteModalRoot}>
          <Pressable
            style={styles.deleteModalOverlay}
            onPress={() => setAccountPendingDeletion(null)}
          />
          <View style={styles.deleteModalCard}>
            <View style={styles.deleteIconContainer}>
              <Ionicons name="trash-outline" size={24} color="#ff3b30" />
            </View>
            <Text style={styles.deleteModalTitle}>Remover conta?</Text>
            <Text style={styles.deleteModalSubtitle}>
              {accountPendingDeletion?.issuer || accountPendingDeletion?.account || "Conta"}
            </Text>
            <Text style={styles.deleteModalDescription}>
              Esta conta de autenticação será removida do dispositivo. Tenha certeza de que você
              possui um backup antes de continuar.
            </Text>

            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={styles.deleteCancelButton}
                onPress={() => setAccountPendingDeletion(null)}
              >
                <Text style={styles.deleteCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteConfirmButton}
                onPress={() =>
                  accountPendingDeletion?.secret
                    ? handleDelete(accountPendingDeletion.secret)
                    : setAccountPendingDeletion(null)
                }
              >
                <Text style={styles.deleteConfirmText}>Remover</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  searchHeaderContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 18,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.45)",
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
  deleteModalRoot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 22,
  },
  deleteModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  deleteModalCard: {
    width: "100%",
    maxWidth: 390,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
  },
  deleteIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ffeceb",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  deleteModalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  deleteModalSubtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginTop: 4,
    marginBottom: 10,
  },
  deleteModalDescription: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
  deleteModalActions: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  deleteCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
  },
  deleteCancelText: {
    color: "#374151",
    fontWeight: "600",
  },
  deleteConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#ff3b30",
    alignItems: "center",
  },
  deleteConfirmText: {
    color: "#fff",
    fontWeight: "700",
  },
  // Empty State Styles
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
  },
  searchEmptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
    gap: 8,
  },
  searchEmptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#4b5563",
    textAlign: "center",
  },
  searchEmptySubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
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
