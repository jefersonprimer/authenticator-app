import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Button, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Account } from "@/storage/secureStore";
import { getAccounts, saveAccounts } from "@/storage/secureStore";
import { parseOtpUri } from "@/utils/parseOtp";

export default function Scan() {
  const [permission, requestPermission] = useCameraPermissions();
  const router = useRouter();
  const [isTorchEnabled, setIsTorchEnabled] = useState(false);

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Text>Permissão da câmera necessária</Text>
        <Button title="Permitir" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <CameraView
        style={styles.camera}
        enableTorch={isTorchEnabled}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={async (result) => {
          const data = parseOtpUri(result.data);

          if (!data.secret) {
            alert("QR code inválido. Escaneie um QR code de autenticação.");
            return;
          }

          const account: Account = {
            issuer: data.issuer,
            account: data.account,
            secret: data.secret,
          };

          const accounts = await getAccounts();
          const exists = accounts.some((a) => a.secret === account.secret);

          if (exists) {
            alert("Esta conta já foi adicionada.");
            return;
          }

          await saveAccounts([...accounts, account]);
          router.replace("/");
        }}
      />

      <SafeAreaView pointerEvents="box-none" style={styles.overlay}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.replace("/")} style={styles.iconButton}>
            <Ionicons color="#fff" name="close" size={24} />
          </Pressable>

          <Text style={styles.headerTitle}>Ler código</Text>

          <Pressable onPress={() => setIsTorchEnabled((value) => !value)} style={styles.iconButton}>
            <Ionicons color="#fff" name={isTorchEnabled ? "flash" : "flash-outline"} size={22} />
          </Pressable>
        </View>

        <View pointerEvents="none" style={styles.scanArea}>
          <View style={styles.scanFrame} />
        </View>

        <View style={styles.footerCenter}>
          <Ionicons color="#fff" name="shield-checkmark-outline" size={16} />
          <Text style={styles.footerText}>Lido por PrimerLabs em nome de Authenticator</Text>
          <Ionicons color="#fff" name="alert-circle-outline" size={16} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  camera: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: "#000",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },
  topRow: {
    minHeight: 56,
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
    paddingHorizontal: 14,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  footerCenter: {
    alignSelf: "center",
    marginBottom: 16,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerText: {
    color: "#fff",
    fontSize: 12,
  },
  scanArea: {
    alignItems: "center",
    justifyContent: "center",
  },
  scanFrame: {
    width: 240,
    height: 240,
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.08)",
  },
});
