import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Switch, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { isAppLockEnabled, setAppLockEnabled } from "@/storage/secureStore";

export default function SettingsScreen() {
  const router = useRouter();
  const [appLockEnabled, setAppLockEnabledState] = useState(true);

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
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configurações</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.settingItem}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingTitle}>Bloqueio de aplicativo</Text>
            <Text style={styles.settingDescription}>
              Solicita a senha do celular ao abrir o app.
            </Text>
          </View>
          <Switch
            value={appLockEnabled}
            onValueChange={handleToggleAppLock}
            thumbColor="#ffffff"
            trackColor={{ false: "#d1d5db", true: "#0a7ea4" }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    backgroundColor: "#0a7ea4",
    paddingTop: 50,
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
    color: "#fff",
  },
  content: {
    padding: 16,
  },
  settingItem: {
    backgroundColor: "#fff",
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
    color: "#111827",
  },
  settingDescription: {
    marginTop: 4,
    fontSize: 13,
    color: "#6b7280",
  },
});
