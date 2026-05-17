import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Button, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Account } from "@/storage/secureStore";
import { getAccounts, saveAccounts } from "@/storage/secureStore";
import { parseOtpUri } from "@/utils/parseOtp";

export default function Scan() {
  const [permission, requestPermission] = useCameraPermissions();
  const router = useRouter();
  const [isTorchEnabled, setIsTorchEnabled] = useState(false);
  const [isDuplicateModalVisible, setIsDuplicateModalVisible] = useState(false);
  const [pendingAccount, setPendingAccount] = useState<Account | null>(null);
  const [existingAccount, setExistingAccount] = useState<Account | null>(null);
  const [newAccountName, setNewAccountName] = useState("");

  const normalize = (value?: string) => (value ?? "").trim().toLowerCase();

  const closeDuplicateModal = () => {
    setIsDuplicateModalVisible(false);
    setPendingAccount(null);
    setExistingAccount(null);
    setNewAccountName("");
  };

  const saveRenamedAccount = async () => {
    if (!pendingAccount) return;
    const nextName = newAccountName.trim();
    if (!nextName) return;

    const accounts = await getAccounts();
    await saveAccounts([
      ...accounts,
      {
        ...pendingAccount,
        issuer: nextName,
      },
    ]);
    closeDuplicateModal();
    router.replace("/");
  };

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Permissão da câmera necessária</Text>
        <View style={styles.permissionActions}>
          <Button title="Permitir" onPress={requestPermission} />
          <Pressable onPress={() => router.push("/manual-entry")} style={styles.permissionManualButton}>
            <Text style={styles.permissionManualText}>Enter code manually</Text>
          </Pressable>
        </View>
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
          if (isDuplicateModalVisible) return;

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
          const sameNameExists = accounts.find(
            (a) =>
              normalize(a.issuer) === normalize(account.issuer) &&
              normalize(a.account) === normalize(account.account),
          );

          if (sameNameExists) {
            setPendingAccount(account);
            setExistingAccount(sameNameExists);
            setNewAccountName(`${account.issuer || "Serviço"} 2`);
            setIsDuplicateModalVisible(true);
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

        <View style={styles.bottomSection}>
          <Pressable onPress={() => router.push("/manual-entry")} style={styles.manualEntryButton}>
            <Text style={styles.manualEntryText}>Enter code manually</Text>
          </Pressable>

          <View style={styles.footerCenter}>
            <Ionicons color="#fff" name="shield-checkmark-outline" size={16} />
            <Text style={styles.footerText}>Lido por PrimerLabs em nome de Authenticator</Text>
            <Ionicons color="#fff" name="alert-circle-outline" size={16} />
          </View>
        </View>
      </SafeAreaView>

      <Modal
        visible={isDuplicateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeDuplicateModal}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalOverlay} onPress={closeDuplicateModal} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Escolha um nome diferente para sua nova conta</Text>
            <Text style={styles.modalParagraph}>
              {`Você tem uma conta do ${existingAccount?.issuer || "provedor"} existente para ${
                existingAccount?.account || "conta"
              }.`}
            </Text>

            <TextInput
              style={styles.modalInput}
              value={newAccountName}
              onChangeText={setNewAccountName}
              placeholder="Alterar o nome da chave (ex: Google)"
              placeholderTextColor="#8A8A8A"
              autoCapitalize="none"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={closeDuplicateModal}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, !newAccountName.trim() && styles.saveButtonDisabled]}
                disabled={!newAccountName.trim()}
                onPress={saveRenamedAccount}
              >
                <Text style={styles.saveButtonText}>Salvar</Text>
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
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 16,
    backgroundColor: "#fff",
  },
  permissionText: {
    fontSize: 16,
    color: "#111827",
    textAlign: "center",
  },
  permissionActions: {
    width: "100%",
    alignItems: "center",
    gap: 12,
  },
  permissionManualButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#eef6f9",
  },
  permissionManualText: {
    color: "#0a7ea4",
    fontWeight: "600",
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
  bottomSection: {
    alignItems: "center",
    gap: 14,
    paddingBottom: 16,
  },
  manualEntryButton: {
    minWidth: 220,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.24)",
  },
  manualEntryText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
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
  modalRoot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 10,
  },
  modalParagraph: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
    marginBottom: 14,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: "#111827",
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  cancelButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
  },
  cancelButtonText: {
    color: "#374151",
    fontWeight: "600",
  },
  saveButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#0a7ea4",
  },
  saveButtonDisabled: {
    backgroundColor: "#8fb8c7",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
