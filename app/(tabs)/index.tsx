import { CompanyLogo } from "@/components/company-logo";
import { DeleteAccountModal } from "@/components/DeleteAccountModal";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { generateToken } from "@/services/totp";
import type { Account } from "@/storage/secureStore";
import { getAccounts, removeAccount } from "@/storage/secureStore";
import {
  getAccountDisplayName,
  getAccountSubtitle,
} from "@/utils/account-display";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const STEP = 30;
const MINI_TIMER_SIZE = 54;
const MINI_TIMER_SEGMENTS = 30;
const MINI_TIMER_TRACK_SIZE = MINI_TIMER_SIZE - 8;
const MINI_TIMER_SEGMENT_WIDTH = 3;
const MINI_TIMER_SEGMENT_HEIGHT = 9;

export default function HomeScreen() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(STEP);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isHeaderMenuVisible, setIsHeaderMenuVisible] = useState(false);
  const [isShowingCodes, setIsShowingCodes] = useState(false);
  const [isFabExpanded, setIsFabExpanded] = useState(false);
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
      setTimeLeft(STEP - (now % STEP));

      const nextTokens: Record<string, string> = {};
      accounts.forEach((item) => {
        try {
          nextTokens[item.id] = generateToken(item);
        } catch {
          nextTokens[item.id] = "";
        }
      });
      setTokens(nextTokens);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [accounts]);

  const load = async () => {
    setIsLoadingAccounts(true);
    try {
      const data = await getAccounts();
      setAccounts(data);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const [accountPendingDeletion, setAccountPendingDeletion] =
    useState<Account | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const isLowTime = timeLeft <= 10;
  const progress = (timeLeft / STEP) * 100;
  const filteredAccounts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return accounts;

    return accounts.filter((account) => {
      const issuer = account.issuer?.toLowerCase() ?? "";
      const accountName = account.account?.toLowerCase() ?? "";
      return (
        issuer.includes(normalizedQuery) ||
        accountName.includes(normalizedQuery)
      );
    });
  }, [accounts, searchQuery]);

  useEffect(() => {
    if (!isSearching) return;
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [isSearching]);

  const handleDelete = useCallback(async () => {
    if (!accountPendingDeletion?.id || isDeletingAccount) return;

    setIsDeletingAccount(true);

    try {
      await removeAccount(accountPendingDeletion.id);
      setAccountPendingDeletion(null);
      await load();
    } finally {
      setIsDeletingAccount(false);
    }
  }, [accountPendingDeletion, isDeletingAccount]);

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.welcomeSection}>
        <View
          style={[
            styles.welcomeIconContainer,
            { backgroundColor: colorScheme === "dark" ? "#1C1C1E" : "#F2F2F7" },
          ]}
        >
          <Ionicons name="shield-checkmark" size={60} color={theme.tint} />
        </View>
        <Text style={[styles.welcomeTitle, { color: theme.text }]}>
          Segurança em primeiro lugar
        </Text>
        <Text style={[styles.welcomeDescription, { color: theme.icon }]}>
          Adicione suas contas para protegê-las com autenticação de dois
          fatores.
        </Text>
        <Pressable
          style={[styles.mainAddButton, { backgroundColor: theme.text }]}
          onPress={() => router.push("/scan")}
        >
          <Text style={[styles.mainAddButtonText, { color: theme.background }]}>
            Começar agora
          </Text>
        </Pressable>
      </View>

      <View style={styles.recoverySection}>
        <Text style={[styles.recoveryTitle, { color: theme.icon }]}>
          Já possui um backup?
        </Text>
        <Pressable
          style={styles.recoveryLink}
          onPress={() => router.push("/explore")}
        >
          <Text style={[styles.recoveryLinkText, { color: theme.tint }]}>
            Restaurar contas
          </Text>
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

  const LoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#0a7ea4" />
      <Text style={styles.loadingText}>Carregando contas...</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.headerBackground,
          },
        ]}
      >
        {isSearching ? (
          <View style={styles.searchHeaderContainer}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => {
                setIsSearching(false);
                setSearchQuery("");
                setIsHeaderMenuVisible(false);
              }}
            >
              <Ionicons
                name="chevron-back-outline"
                size={24}
                color={theme.text}
              />
            </TouchableOpacity>
            <TextInput
              ref={searchInputRef}
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Pesquisar contas"
              placeholderTextColor={
                colorScheme === "dark" ? "#9ca3af" : "#6b7280"
              }
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              selectionColor={theme.tint}
              returnKeyType="search"
            />
          </View>
        ) : (
          <>
            <Text style={[styles.title, { color: theme.text }]}>
              Authenticator
            </Text>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => {
                  setIsSearching(true);
                  setIsHeaderMenuVisible(false);
                }}
              >
                <Ionicons name="search-outline" size={24} color={theme.text} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setIsHeaderMenuVisible((prev) => !prev)}
              >
                <Ionicons
                  name="ellipsis-vertical"
                  size={24}
                  color={theme.text}
                />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
      {isHeaderMenuVisible && !isSearching && (
        <>
          <Pressable
            style={styles.headerMenuBackdrop}
            onPress={() => setIsHeaderMenuVisible(false)}
          />
          <View
            style={[
              styles.headerMenu,
              {
                backgroundColor: theme.cardBackground,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.headerMenuItem}
              onPress={() => {
                setIsHeaderMenuVisible(false);
                router.push("/settings");
              }}
            >
              <Ionicons name="settings-outline" size={20} color={theme.text} />
              <Text style={[styles.headerMenuText, { color: theme.text }]}>
                Configurações
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerMenuItem}
              onPress={() => {
                setIsShowingCodes((prev) => !prev);
                setIsHeaderMenuVisible(false);
              }}
            >
              <Ionicons
                name={isShowingCodes ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={theme.text}
              />
              <Text style={[styles.headerMenuText, { color: theme.text }]}>
                {isShowingCodes ? "Ocultar códigos" : "Mostrar os códigos"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerMenuItem}
              onPress={() => {
                setIsHeaderMenuVisible(false);
                Alert.alert("Ajuda", "Central de ajuda em breve.");
              }}
            >
              <Ionicons
                name="help-circle-outline"
                size={20}
                color={theme.text}
              />
              <Text style={[styles.headerMenuText, { color: theme.text }]}>
                Ajuda
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {filteredAccounts.length > 0 && (
        <View style={styles.timerContainer}>
          <View
            style={[
              styles.timerBar,
              {
                backgroundColor: colorScheme === "dark" ? "#2C2C2E" : "#E5E5E7",
              },
            ]}
          >
            <View
              style={[
                styles.timerFill,
                {
                  width: `${progress}%`,
                  backgroundColor: isLowTime ? "#ff3b30" : theme.tint,
                },
              ]}
            />
          </View>
          <Text
            style={[
              styles.timerText,
              { color: theme.icon },
              isLowTime && { color: "#ff3b30", fontWeight: "600" },
            ]}
          >
            {timeLeft}s
          </Text>
        </View>
      )}

      <FlatList
        data={filteredAccounts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          filteredAccounts.length === 0 && { flex: 1 },
        ]}
        renderItem={({ item }) => {
          const displayName = getAccountDisplayName(item);
          const subtitle = getAccountSubtitle(item);
          const token = tokens[item.id] || "";
          const activeSegments = Math.max(
            0,
            Math.min(MINI_TIMER_SEGMENTS, timeLeft),
          );

          return (
            <Pressable
              style={[
                styles.card,
                {
                  backgroundColor: theme.cardBackground,
                  borderLeftColor: "#2563eb",
                },
              ]}
              onPress={() =>
                router.push({
                  pathname: "/account/[secret]",
                  params: { secret: item.id },
                })
              }
            >
              <View style={styles.cardContent}>
                <View style={styles.cardLead}>
                  <CompanyLogo
                    label={`${displayName} ${subtitle}`}
                    size={46}
                    dark={colorScheme === "dark"}
                  />
                  <View style={styles.cardText}>
                    <Text
                      style={[styles.cardTitle, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {displayName}
                    </Text>
                    <Text
                      style={[styles.cardSubtitle, { color: theme.icon }]}
                      numberOfLines={1}
                    >
                      {subtitle}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    onPress={(event) => {
                      event.stopPropagation();
                      router.push({
                        pathname: "/account/[secret]",
                        params: { secret: item.id },
                      });
                    }}
                    style={styles.chevronButton}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={theme.icon}
                    />
                  </TouchableOpacity>
                </View>
              </View>
              {isShowingCodes ? (
                <View
                  style={[
                    styles.cardCodeSection,
                    { borderTopColor: theme.headerBorder },
                  ]}
                >
                  <View style={styles.cardCodeRow}>
                    <Text
                      style={[
                        styles.cardCodeValue,
                        { color: isLowTime ? "#ef4444" : theme.text },
                      ]}
                    >
                      {token
                        ? `${token.slice(0, 3)} ${token.slice(3)}`
                        : "--- ---"}
                    </Text>
                    <TouchableOpacity
                      onPress={(event) => {
                        event.stopPropagation();
                        if (token) {
                          Clipboard.setStringAsync(token);
                        }
                      }}
                      style={[
                        styles.copyCodeButton,
                        {
                          backgroundColor: theme.text,
                          borderColor: theme.text,
                        },
                      ]}
                    >
                      <Ionicons
                        name="copy-outline"
                        size={18}
                        color={theme.background}
                      />
                    </TouchableOpacity>
                    <View style={styles.miniTimerWrap}>
                      <View style={styles.miniTimerTrack}>
                        {Array.from({ length: MINI_TIMER_SEGMENTS }).map(
                          (_, index) => {
                            const angle = (360 / MINI_TIMER_SEGMENTS) * index;
                            const isActive = index < activeSegments;

                            return (
                              <View
                                key={index}
                                style={[
                                  styles.miniTimerSegment,
                                  {
                                    backgroundColor: isActive
                                      ? isLowTime
                                        ? "#ef4444"
                                        : "#2563eb"
                                      : colorScheme === "dark"
                                        ? "#2C2C2E"
                                        : "#E5E7EB",
                                    transform: [
                                      { rotate: `${angle}deg` },
                                      {
                                        translateY: -(
                                          MINI_TIMER_TRACK_SIZE / 2 -
                                          4
                                        ),
                                      },
                                    ],
                                  },
                                ]}
                              />
                            );
                          },
                        )}
                      </View>
                      <View
                        style={[
                          styles.miniTimerCenter,
                          {
                            backgroundColor:
                              colorScheme === "dark" ? "#111827" : "#ffffff",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.miniTimerValue,
                            { color: isLowTime ? "#ef4444" : theme.text },
                          ]}
                        >
                          {timeLeft}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ) : null}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          isLoadingAccounts
            ? LoadingState
            : isSearching && accounts.length > 0
              ? SearchEmptyState
              : EmptyState
        }
      />

      {!isSearching && (
        <>
          {isFabExpanded && (
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setIsFabExpanded(false)}
            />
          )}
          <View style={styles.fabContainer}>
            {isFabExpanded && (
              <View style={styles.fabOptions}>
                <TouchableOpacity
                  style={styles.fabOption}
                  onPress={() => {
                    setIsFabExpanded(false);
                    router.push("/scan");
                  }}
                >
                  <Text
                    style={[
                      styles.fabOptionLabel,
                      {
                        color: theme.text,
                        backgroundColor:
                          colorScheme === "dark" ? "#1C1C1E" : "#F2F2F7",
                      },
                    ]}
                  >
                    Fazer leitura de um QR code
                  </Text>
                  <View
                    style={[
                      styles.fabOptionIcon,
                      { backgroundColor: theme.text },
                    ]}
                  >
                    <Ionicons
                      name="camera-outline"
                      size={20}
                      color={theme.background}
                    />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.fabOption}
                  onPress={() => {
                    setIsFabExpanded(false);
                    router.push("/manual-entry");
                  }}
                >
                  <Text
                    style={[
                      styles.fabOptionLabel,
                      {
                        color: theme.text,
                        backgroundColor:
                          colorScheme === "dark" ? "#1C1C1E" : "#F2F2F7",
                      },
                    ]}
                  >
                    Inserir chave de configuração
                  </Text>
                  <View
                    style={[
                      styles.fabOptionIcon,
                      { backgroundColor: theme.text },
                    ]}
                  >
                    <Ionicons
                      name="keypad"
                      size={20}
                      color={theme.background}
                    />
                  </View>
                </TouchableOpacity>
              </View>
            )}
            <Pressable
              style={[styles.fabMain, { backgroundColor: theme.text }]}
              onPress={() => setIsFabExpanded(!isFabExpanded)}
            >
              <Ionicons
                name={isFabExpanded ? "close" : "add"}
                size={32}
                color={theme.background}
              />
            </Pressable>
          </View>
        </>
      )}

      <DeleteAccountModal
        visible={!!accountPendingDeletion}
        accountName={
          accountPendingDeletion
            ? getAccountDisplayName(accountPendingDeletion)
            : "Conta"
        }
        accountSubtitle={
          accountPendingDeletion
            ? getAccountSubtitle(accountPendingDeletion)
            : undefined
        }
        isDeleting={isDeletingAccount}
        onClose={() => {
          if (!isDeletingAccount) {
            setAccountPendingDeletion(null);
          }
        }}
        onConfirm={handleDelete}
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
    paddingHorizontal: 16,
    paddingTop: 42,
    paddingBottom: 6,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerButton: {
    padding: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: "400",
  },
  searchHeaderContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(150, 150, 150, 0.1)",
    borderRadius: 10,
  },
  headerMenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  headerMenu: {
    position: "absolute",
    top: 90,
    right: 16,
    borderRadius: 12,
    minWidth: 200,
    zIndex: 6,
    elevation: 8,
    overflow: "hidden",
  },
  headerMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerMenuText: {
    fontSize: 16,
    fontWeight: "400",
  },
  timerContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  timerBar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
  },
  timerFill: {
    height: "100%",
  },
  timerText: {
    fontSize: 12,
    width: 25,
    textAlign: "right",
  },
  list: {
    paddingTop: 16,
    paddingBottom: 96,
    gap: 12,
  },
  card: {
    paddingVertical: 18,
    paddingLeft: 14,
    paddingRight: 10,
    width: "100%",
    borderLeftWidth: 4,
    borderRadius: 0,
  },
  cardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardLead: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
  },
  cardText: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  cardSubtitle: {
    marginTop: 4,
    fontSize: 14,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
  },
  chevronButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cardCodeSection: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  cardCodeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardCodeValue: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 1.2,
    flex: 1,
  },
  miniTimerWrap: {
    width: MINI_TIMER_SIZE,
    height: MINI_TIMER_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  miniTimerTrack: {
    position: "absolute",
    width: MINI_TIMER_TRACK_SIZE,
    height: MINI_TIMER_TRACK_SIZE,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  miniTimerSegment: {
    position: "absolute",
    width: MINI_TIMER_SEGMENT_WIDTH,
    height: MINI_TIMER_SEGMENT_HEIGHT,
    borderRadius: 999,
  },
  miniTimerCenter: {
    width: MINI_TIMER_SIZE - 18,
    height: MINI_TIMER_SIZE - 18,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  miniTimerValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  copyCodeButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // Empty State Styles
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 16,
    color: "#6b7280",
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
    width: "100%",
    marginBottom: 48,
  },
  welcomeIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  welcomeDescription: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  mainAddButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    width: "100%",
    alignItems: "center",
  },
  mainAddButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  recoverySection: {
    alignItems: "center",
  },
  recoveryTitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  recoveryLink: {
    padding: 8,
  },
  recoveryLinkText: {
    fontSize: 15,
    fontWeight: "600",
  },
  fabContainer: {
    position: "absolute",
    bottom: 24,
    right: 24,
    alignItems: "flex-end",
  },
  fabOptions: {
    alignItems: "flex-end",
    gap: 16,
    marginBottom: 16,
  },
  fabOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  fabOptionLabel: {
    fontSize: 14,
    fontWeight: "600",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  fabOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  fabMain: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
});
