import type { BackupPreview, ImportMode } from "@/services/backup";
import { Platform, StyleSheet } from "react-native";

export const backupModes: { value: ImportMode; title: string; description: string }[] = [
  {
    value: "merge",
    title: "Mesclar",
    description: "Atualiza contas com o mesmo rótulo e adiciona contas novas.",
  },
  {
    value: "replace",
    title: "Substituir",
    description: "Apaga as contas atuais e restaura apenas o conteúdo do backup.",
  },
  {
    value: "skip-duplicates",
    title: "Ignorar duplicadas",
    description: "Mantém as contas atuais e importa só o que ainda não existe.",
  },
];

export const formatBackupDate = (timestamp?: BackupPreview["createdAt"]) => {
  if (!timestamp) return "Data indisponível";

  return new Date(timestamp).toLocaleString("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export const backupScreenStyles = StyleSheet.create({
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
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    gap: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  passwordField: {
    position: "relative",
    justifyContent: "center",
  },
  passwordInput: {
    paddingRight: 52,
  },
  passwordToggle: {
    position: "absolute",
    right: 16,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButton: {
    borderRadius: 16,
    backgroundColor: "#0a7ea4",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    marginTop: 8,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 10,
    borderStyle: "dashed",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  importFlow: {
    gap: 20,
  },
  previewCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  previewTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  previewMeta: {
    gap: 4,
  },
  previewText: {
    fontSize: 14,
  },
  modeList: {
    gap: 12,
  },
  modeCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  modeRadio: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  modeTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  modeDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 30,
  },
  resetButton: {
    alignItems: "center",
    paddingVertical: 10,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.78)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  processingContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    maxWidth: 320,
  },
  processingTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  processingDescription: {
    color: "rgba(255, 255, 255, 0.82)",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
});
