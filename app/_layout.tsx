import { Colors } from "@/constants/theme";
import { isAppLockEnabled } from "@/storage/secureStore";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import * as LocalAuthentication from "expo-local-authentication";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useColorScheme } from "@/hooks/use-color-scheme";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const [isUnlocked, setIsUnlocked] = useState(false);
  const isAuthenticatingRef = useRef(false);

  const requestUnlock = useCallback(async () => {
    if (isAuthenticatingRef.current) return;
    isAuthenticatingRef.current = true;

    try {
      const lockEnabled = await isAppLockEnabled();
      if (!lockEnabled) {
        setIsUnlocked(true);
        return;
      }

      const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();

      if (securityLevel === LocalAuthentication.SecurityLevel.NONE) {
        setIsUnlocked(true);
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticator",
        promptSubtitle: "Confirme sua identidade para continuar",
        promptDescription: "Use a biometria ou a senha de bloqueio do aparelho",
        cancelLabel: "Cancelar",
        disableDeviceFallback: false,
        fallbackLabel: "Usar senha do celular",
      });

      if (result.success) {
        setIsUnlocked(true);
        return;
      }

      setIsUnlocked(false);
    } finally {
      isAuthenticatingRef.current = false;
    }
  }, []);

  useEffect(() => {
    requestUnlock();
  }, [requestUnlock]);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.headerBackground);
  }, [theme.headerBackground]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        setIsUnlocked(false);
        requestUnlock();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [requestUnlock]);

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: theme.headerBackground }}
    >
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        {isUnlocked ? (
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="account/[secret]"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="account/[secret]/edit"
              options={{ headerShown: false }}
            />
            <Stack.Screen name="manual-entry" options={{ headerShown: false }} />
            <Stack.Screen name="settings" options={{ headerShown: false }} />
          </Stack>
        ) : (
          <View style={{ flex: 1, backgroundColor: theme.headerBackground }} />
        )}
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
