import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { Button, StyleSheet, Text, View } from "react-native";
import type { Account } from "@/storage/secureStore";
import { getAccounts, saveAccounts } from "@/storage/secureStore";
import { parseOtpUri } from "@/utils/parseOtp";

export default function Scan() {
  const [permission, requestPermission] = useCameraPermissions();
  const router = useRouter();

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Text>Permissão da câmera necessária</Text>
        <Button title="Permitir" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <CameraView
      style={styles.camera}
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
});
