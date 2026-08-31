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
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function Scan() {
  const [permission, requestPermission] = useCameraPermissions();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
      <SafeAreaView
        style={[
          styles.permissionContainer,
          { backgroundColor: theme.background },
        ]}
      >
        <View style={styles.permissionHeader}>
          <TouchableOpacity
            style={styles.permissionCloseButton}
            onPress={() => router.replace("/")}
          >
            <Ionicons name="close" size={26} color={theme.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.permissionContent}>
          <View
            style={[
              styles.permissionIconContainer,
              {
                backgroundColor: colorScheme === "dark" ? "#1C1C1E" : "#E8F0FE",
              },
            ]}
          >
            <Ionicons name="camera" size={48} color="#0a7ea4" />
          </View>

          <Text style={[styles.permissionTitle, { color: theme.text }]}>
            Permissão da Câmera
          </Text>

          <Text style={[styles.permissionDescription, { color: theme.icon }]}>
            Para escanear o QR Code de autenticação e adicionar sua conta,
            precisamos de permissão para acessar a câmera do seu dispositivo.
          </Text>
        </View>

        <View style={styles.permissionActions}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.tint }]}
            onPress={requestPermission}
          >
            <Text
              style={[
                styles.primaryButtonText,
                { color: colorScheme === "dark" ? "#000" : "#fff" },
              ]}
            >
              Permitir Acesso
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push("/manual-entry")}
          >
            <Text style={[styles.secondaryButtonText, { color: "#0a7ea4" }]}>
              Inserir código manualmente
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.headerBackground,
            paddingTop: insets.top > 0 ? insets.top + 12 : 50,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.replace("/")}
        >
          <Ionicons name="chevron-back-outline" size={24} color={theme.text} />
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
  permissionContainer: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  permissionHeader: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingTop: 12,
  },
  permissionCloseButton: {
    padding: 8,
    borderRadius: 20,
  },
  permissionContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
    width: "100%",
  },
  permissionIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  permissionDescription: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  permissionActions: {
    width: "100%",
    gap: 16,
  },
  primaryButton: {
    width: "100%",
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    width: "100%",
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  camera: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  header: {
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "400",
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
