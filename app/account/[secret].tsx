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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const STEP = 30;
const TIMER_SIZE = 84;
const TIMER_SEGMENTS = 30;
const TIMER_TRACK_SIZE = TIMER_SIZE - 8;
const TIMER_SEGMENT_WIDTH = 3;
const TIMER_SEGMENT_HEIGHT = 10;

export default function AccountDetailScreen() {
  const { secret } = useLocalSearchParams<{ secret?: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const [account, setAccount] = useState<Account | null>(null);
  const [token, setToken] = useState("");
  const [timeLeft, setTimeLeft] = useState(STEP);
  const [isActionsVisible, setIsActionsVisible] = useState(false);
  const [isRemoveVisible, setIsRemoveVisible] = useState(false);
  const [isRemovingAccount, setIsRemovingAccount] = useState(false);

  const sheetTranslateY = useRef(new Animated.Value(400)).current;

  const animateSheet = useCallback(
    (toValue: number, callback?: () => void) => {
      Animated.timing(sheetTranslateY, {
        toValue,
        duration: toValue === 0 ? 250 : 200,
        easing:
          toValue === 0 ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && callback) callback();
      });
    },
    [sheetTranslateY],
  );

  const openActions = () => {
    setIsActionsVisible(true);
    animateSheet(0);
  };

  const closeActions = () => {
    animateSheet(400, () => setIsActionsVisible(false));
  };

  const openEditScreen = useCallback(() => {
    if (!account?.id) return;

    animateSheet(400, () => {
      setIsActionsVisible(false);
      router.push({
        pathname: "/account/[secret]/edit",
        params: { secret: account.id },
      });
    });
  }, [account, animateSheet, router]);

  const closeRemoveModal = useCallback(() => {
    if (isRemovingAccount) return;
    setIsRemoveVisible(false);
  }, [isRemovingAccount]);

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
    if (!account?.secret) {
      setToken("");
      return;
    }

    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      setTimeLeft(account.period - (now % account.period) || account.period);
      setToken(generateToken(account));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [account]);

  const displayName = account ? getAccountDisplayName(account) : "Conta";
  const subtitle = account ? getAccountSubtitle(account) : "";
  const formattedToken = token
    ? `${token.slice(0, 3)} ${token.slice(3)}`
    : "--- ---";
  const isLowTime = timeLeft <= 10;
  const activeSegments = Math.max(0, Math.min(TIMER_SEGMENTS, timeLeft));

  const handleRemoveAccount = useCallback(() => {
    if (!account?.id) return;

    animateSheet(400, () => {
      setIsActionsVisible(false);
      setIsRemoveVisible(true);
    });
  }, [account, animateSheet]);

  const confirmRemoveAccount = useCallback(async () => {
    if (!account?.id || isRemovingAccount) return;

    setIsRemovingAccount(true);

    try {
      await removeAccount(account.id);
      setIsRemoveVisible(false);
      router.replace("/");
    } finally {
      setIsRemovingAccount(false);
    }
  }, [account, isRemovingAccount, router]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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
          Detalhes
        </Text>
        <Pressable style={styles.headerButton} onPress={openActions}>
          <Ionicons name="settings-outline" size={22} color={theme.text} />
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
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
              Conta não encontrada
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.icon }]}>
              Essa conta pode ter sido removida ou ainda não foi carregada.
            </Text>
          </View>
        ) : null}

        {account ? (
          <View
            style={[
              styles.hero,
              {
                backgroundColor: theme.cardBackground,
                borderColor: theme.headerBorder,
              },
            ]}
          >
            <View style={styles.heroTopRow}>
              <CompanyLogo
                label={`${displayName} ${subtitle}`}
                size={64}
                dark={colorScheme === "dark"}
              />
              <View style={styles.heroTextContent}>
                <Text style={[styles.heroTitle, { color: theme.text }]}>
                  {displayName}
                </Text>
                <Text style={[styles.heroSubtitle, { color: theme.icon }]}>
                  {subtitle}
                </Text>
              </View>
            </View>

            <Pressable
              style={[
                styles.codeCard,
                {
                  backgroundColor:
                    colorScheme === "dark" ? "#101828" : "#eff6ff",
                },
              ]}
              onPress={() => {
                if (token) {
                  Clipboard.setStringAsync(token);
                }
              }}
            >
              <View style={styles.codeCardContent}>
                <View style={styles.codeTextContainer}>
                  <Text
                    style={[
                      styles.codeLabel,
                      { color: colorScheme === "dark" ? "#93c5fd" : "#2563eb" },
                    ]}
                  >
                    Código de senha de uso único
                  </Text>
                  <Text
                    style={[
                      styles.codeValue,
                      { color: isLowTime ? "#ef4444" : theme.text },
                    ]}
                  >
                    {formattedToken}
                  </Text>
                </View>

                <View style={styles.timerSection}>
                  <View style={styles.timerRingWrap}>
                    <View style={styles.timerTrack}>
                      {Array.from({ length: TIMER_SEGMENTS }).map(
                        (_, index) => {
                          const angle = (360 / TIMER_SEGMENTS) * index;
                          const isActive = index < activeSegments;

                          return (
                            <View
                              key={index}
                              style={[
                                styles.timerSegment,
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
                                    { translateY: -(TIMER_TRACK_SIZE / 2 - 8) },
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
                        styles.timerCenter,
                        {
                          backgroundColor:
                            colorScheme === "dark" ? "#111827" : "#ffffff",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.timerValue,
                          { color: isLowTime ? "#ef4444" : theme.text },
                        ]}
                      >
                        {timeLeft}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <Modal
        visible={isActionsVisible}
        transparent
        animationType="none"
        onRequestClose={closeActions}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalOverlay} onPress={closeActions} />
          <Animated.View
            style={[
              styles.actionsCard,
              {
                backgroundColor: theme.cardBackground,
                borderTopColor: theme.headerBorder,
                transform: [{ translateY: sheetTranslateY }],
              },
            ]}
          >
            <View style={styles.sheetHandle} />
            <Pressable style={styles.actionRow} onPress={openEditScreen}>
              <Ionicons name="create-outline" size={20} color={theme.text} />
              <Text style={[styles.actionText, { color: theme.text }]}>
                Editar conta
              </Text>
            </Pressable>
            <Pressable style={styles.actionRow} onPress={handleRemoveAccount}>
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
              <Text style={[styles.actionText, { color: "#ef4444" }]}>
                Remover conta
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>

      <DeleteAccountModal
        visible={isRemoveVisible}
        accountName={displayName}
        accountSubtitle={subtitle}
        isDeleting={isRemovingAccount}
        onClose={closeRemoveModal}
        onConfirm={confirmRemoveAccount}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  content: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
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
  hero: {
    flex: 1,
    padding: 20,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 18,
  },
  heroTextContent: {
    flex: 1,
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
  },
  heroSubtitle: {
    marginTop: 2,
    fontSize: 15,
  },
  timerSection: {
    alignItems: "center",
    justifyContent: "center",
  },
  timerRingWrap: {
    width: TIMER_SIZE,
    height: TIMER_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  timerTrack: {
    position: "absolute",
    width: TIMER_TRACK_SIZE,
    height: TIMER_TRACK_SIZE,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  timerSegment: {
    position: "absolute",
    width: TIMER_SEGMENT_WIDTH,
    height: TIMER_SEGMENT_HEIGHT,
    borderRadius: 999,
  },
  timerCenter: {
    width: TIMER_SIZE - 22,
    height: TIMER_SIZE - 22,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  timerValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  codeCard: {
    marginTop: 12,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  codeCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  codeTextContainer: {
    flex: 1,
  },
  codeLabel: {
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.8,
  },
  codeValue: {
    marginTop: 4,
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 1,
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(150, 150, 150, 0.3)",
    marginTop: 10,
    marginBottom: 10,
  },
  actionsCard: {
    width: "100%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingBottom: 34,
    paddingHorizontal: 8,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  actionText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
