import type { Account } from "@/storage/secureStore";
import { getAccounts, saveAccounts } from "@/storage/secureStore";
import { createOtpEntry } from "@/utils/otp";
import { parseOtpUri } from "@/utils/parseOtp";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  Button,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function Scan() {
  const [permission, requestPermission] = useCameraPermissions();
  const router = useRouter();
  const [isTorchEnabled, setIsTorchEnabled] = useState(false);
  const [isDuplicateModalVisible, setIsDuplicateModalVisible] = useState(false);
  const [pendingAccount, setPendingAccount] = useState<Account | null>(null);
  const [existingAccount, setExistingAccount] = useState<Account | null>(null);
  const [newAccountName, setNewAccountName] = useState("");
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const scanLockRef = useRef(false);
  const isFocused = useIsFocused();

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const normalize = (value?: string) => (value ?? "").trim().toLowerCase();

  const resetDuplicateModalState = (unlockScanner = true) => {
    setIsDuplicateModalVisible(false);
    setPendingAccount(null);
    setExistingAccount(null);
    setNewAccountName("");

    if (unlockScanner) {
      scanLockRef.current = false;
      setIsProcessingScan(false);
    }
  };

  const closeDuplicateModal = () => {
    resetDuplicateModalState(true);
  };

  useFocusEffect(
    useCallback(() => {
      scanLockRef.current = false;
      setIsProcessingScan(false);
      setIsDuplicateModalVisible(false);

      return () => {
        scanLockRef.current = false;
        setIsProcessingScan(false);
      };
    }, []),
  );

  const saveRenamedAccount = async () => {
    if (!pendingAccount) return;
    const nextName = newAccountName.trim();
    if (!nextName) return;

    const accounts = await getAccounts();
    await saveAccounts([
      ...accounts,
      {
        ...pendingAccount,
        account: nextName,
      },
    ]);
    resetDuplicateModalState(false);
    router.replace("/");
  };

  if (!permission?.granted) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.permissionText, { color: theme.text }]}>
          Permissão da câmera necessária
        </Text>
        <View style={styles.permissionActions}>
          <Button title="Permitir" onPress={requestPermission} />
          <Pressable
            onPress={() => router.push("/manual-entry")}
            style={styles.permissionManualButton}
          >
            <Text style={styles.permissionManualText}>
              Inserir código manualmente
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.headerBackground,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.replace("/")}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Scan QR Code
        </Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setIsTorchEnabled((value) => !value)}
        >
          <Ionicons
            name={isTorchEnabled ? "flash" : "flash-outline"}
            size={22}
            color={theme.text}
          />
        </TouchableOpacity>
      </View>

      {isFocused ? (
        <CameraView
          style={styles.camera}
          enableTorch={isTorchEnabled}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={
            isProcessingScan || isDuplicateModalVisible
              ? undefined
              : async (result) => {
                  if (scanLockRef.current) return;

                  scanLockRef.current = true;
                  setIsProcessingScan(true);
                  let shouldUnlockScanner = true;

                  try {
                    const data = parseOtpUri(result.data);

                    if (!data) {
                      alert(
                        "QR code inválido. Escaneie um QR code de autenticação.",
                      );
                      return;
                    }

                    const account: Account = createOtpEntry(data);

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
                      shouldUnlockScanner = false;
                      return;
                    }

                    await saveAccounts([...accounts, account]);
                    shouldUnlockScanner = false;
                    router.replace("/");
                  } finally {
                    if (shouldUnlockScanner) {
                      scanLockRef.current = false;
                      setIsProcessingScan(false);
                    }
                  }
                }
          }
        />
      ) : (
        <View style={styles.camera} />
      )}

      <SafeAreaView pointerEvents="box-none" style={styles.overlay}>
        <View pointerEvents="none" style={styles.scanArea}>
          <View style={[styles.scanFrame, { borderColor: theme.tint }]} />
        </View>

        <View style={styles.bottomSection}>
          <Pressable
            onPress={() => router.push("/manual-entry")}
            style={[
              styles.manualEntryButton,
              {
                backgroundColor: "rgba(255,255,255,0.15)",
                borderColor: "rgba(255,255,255,0.3)",
              },
            ]}
          >
            <Text style={[styles.manualEntryText, { color: "#fff" }]}>
              Inserir código manualmente
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <Modal
        visible={isDuplicateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeDuplicateModal}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalOverlay}
            onPress={closeDuplicateModal}
          />
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.cardBackground },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Escolha um nome diferente para sua nova conta
            </Text>
            <Text style={[styles.modalParagraph, { color: theme.icon }]}>
              {`Você tem uma conta do ${existingAccount?.issuer || "provedor"} existente para ${
                existingAccount?.account || "conta"
              }.`}
            </Text>

            <TextInput
              style={[
                styles.modalInput,
                {
                  color: theme.text,
                  borderColor: theme.cardBorder,
                  backgroundColor: colorScheme === "dark" ? "#111" : "#f9f9f9",
                },
              ]}
              value={newAccountName}
              onChangeText={setNewAccountName}
              placeholder="Alterar conta / e-mail (ex: user@email.com)"
              placeholderTextColor="#8A8A8A"
              autoCapitalize="none"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  {
                    backgroundColor:
                      colorScheme === "dark" ? "#2C2C2E" : "#f3f4f6",
                  },
                ]}
                onPress={closeDuplicateModal}
              >
                <Text style={[styles.cancelButtonText, { color: theme.text }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  !newAccountName.trim() && styles.saveButtonDisabled,
                  { backgroundColor: theme.tint },
                ]}
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
  },
  permissionText: {
    fontSize: 16,
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
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    paddingTop: 80, // Offset for header
  },
  bottomSection: {
    position: "absolute",
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 20,
  },
  manualEntryButton: {
    minWidth: 240,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
  },
  manualEntryText: {
    fontSize: 15,
    fontWeight: "600",
  },
  scanArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scanFrame: {
    width: 260,
    height: 260,
    borderWidth: 2,
    borderRadius: 24,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
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
    borderRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },
  modalParagraph: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  cancelButtonText: {
    fontWeight: "600",
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: "#000",
    fontWeight: "600",
  },
});
