import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Switch, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { isAppLockEnabled, setAppLockEnabled } from "@/storage/secureStore";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";

export default function SettingsScreen() {
  const router = useRouter();
  const [appLockEnabled, setAppLockEnabledState] = useState(true);
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const loadSetting = async () => {
        const enabled = await isAppLockEnabled();
        if (isMounted) {
          setAppLockEnabledState(enabled);
        }
      };
      loadSetting();
      return () => {
        isMounted = false;
      };
    }, []),
  );

  const handleToggleAppLock = async (value: boolean) => {
    setAppLockEnabledState(value);
    await setAppLockEnabled(value);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.headerBackground,
            borderBottomWidth: 1,
            borderBottomColor: theme.headerBorder,
          },
        ]}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Configurações</Text>
      </View>

      <View style={styles.content}>
        <View style={[styles.settingItem, { backgroundColor: theme.cardBackground, borderColor: theme.cardBorder, borderWidth: 1 }]}>
          <View style={styles.settingTextContainer}>
            <Text style={[styles.settingTitle, { color: theme.text }]}>Bloqueio de aplicativo</Text>
            <Text style={[styles.settingDescription, { color: theme.icon }]}>
              Solicita a senha do celular ao abrir o app.
            </Text>
          </View>
          <Switch
            value={appLockEnabled}
            onValueChange={handleToggleAppLock}
            thumbColor="#ffffff"
            trackColor={{ false: "#d1d5db", true: theme.tint }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backButton: {
    padding: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "600",
  },
  content: {
    padding: 16,
  },
  settingItem: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  settingDescription: {
    marginTop: 4,
    fontSize: 13,
  },
});
