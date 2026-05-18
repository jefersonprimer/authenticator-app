import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as LocalAuthentication from 'expo-local-authentication';
import { isAppLockEnabled } from '@/storage/secureStore';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const isAuthenticatingRef = useRef(false);

  const requestUnlock = useCallback(async () => {
    if (isAuthenticatingRef.current) return;
    isAuthenticatingRef.current = true;
    setAuthErrorMessage(null);

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
        promptMessage: 'Desbloquear app',
        promptSubtitle: 'Confirme sua identidade para continuar',
        promptDescription: 'Use a biometria ou a senha de bloqueio do aparelho',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
        fallbackLabel: 'Usar senha do celular',
      });

      if (result.success) {
        setIsUnlocked(true);
        return;
      }

      setIsUnlocked(false);
      setAuthErrorMessage(
        result.error === 'user_cancel'
          ? 'Desbloqueio cancelado. Toque abaixo para tentar novamente.'
          : 'Nao foi possivel validar o bloqueio do aparelho. Tente novamente.',
      );
    } finally {
      isAuthenticatingRef.current = false;
    }
  }, []);

  useEffect(() => {
    requestUnlock();
  }, [requestUnlock]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        setIsUnlocked(false);
        requestUnlock();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [requestUnlock]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="account/[secret]" options={{ headerShown: false }} />
          <Stack.Screen name="manual-entry" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
        </Stack>
        {!isUnlocked ? (
          <View
            style={[
              styles.lockScreen,
              { backgroundColor: colorScheme === 'dark' ? '#000' : '#f8fafc' },
            ]}>
            <View
              style={[
                styles.lockCard,
                {
                  backgroundColor: colorScheme === 'dark' ? '#111827' : '#fff',
                  shadowColor: colorScheme === 'dark' ? '#000' : '#0f172a',
                },
              ]}>
              <Text
                style={[
                  styles.lockTitle,
                  { color: colorScheme === 'dark' ? '#f8fafc' : '#0f172a' },
                ]}>
                App bloqueado
              </Text>
              <Text
                style={[
                  styles.lockDescription,
                  { color: colorScheme === 'dark' ? '#cbd5e1' : '#475569' },
                ]}>
                Use a senha, PIN, padrao ou biometria do celular para entrar.
              </Text>
              {authErrorMessage ? (
                <Text
                  style={[
                    styles.lockError,
                    { color: colorScheme === 'dark' ? '#fda4af' : '#b91c1c' },
                  ]}>
                  {authErrorMessage}
                </Text>
              ) : null}
              <Pressable
                onPress={requestUnlock}
                style={({ pressed }) => [
                  styles.retryButton,
                  { opacity: pressed ? 0.88 : 1 },
                ]}>
                <Text style={styles.retryButtonText}>Desbloquear</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  lockScreen: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 10,
  },
  lockCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    padding: 24,
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  lockTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  lockDescription: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
  },
  lockError: {
    marginTop: 16,
    fontSize: 14,
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 22,
    borderRadius: 14,
    backgroundColor: '#0a7ea4',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
