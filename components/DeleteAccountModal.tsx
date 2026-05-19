import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type DeleteAccountModalProps = {
  visible: boolean;
  isDeleting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteAccountModal({
  visible,
  isDeleting = false,
  onClose,
  onConfirm,
}: DeleteAccountModalProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable
          style={styles.overlay}
          onPress={isDeleting ? undefined : onClose}
        />
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.headerBorder,
            },
          ]}
        >
          <Text style={[styles.title, { color: theme.text }]}>
            Remover conta?
          </Text>

          <Text style={[styles.description, { color: theme.icon }]}>
            Esta conta de autenticacao sera removida do dispositivo. Verifique
            se voce possui backup antes de continuar.
          </Text>

          <View style={styles.actions}>
            <Pressable
              style={[
                styles.confirmButton,
                isDeleting && styles.confirmButtonDisabled,
              ]}
              onPress={onConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.confirmText}>Remover</Text>
              )}
            </Pressable>
            <Pressable
              style={[styles.cancelButton, { borderColor: theme.headerBorder }]}
              onPress={onClose}
              disabled={isDeleting}
            >
              <Text style={[styles.cancelText, { color: theme.text }]}>
                Cancelar
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 26,
    alignItems: "center",
    borderWidth: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 8,
  },
  secondarySubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 14,
  },
  actions: {
    width: "100%",
    flexDirection: "column",
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    width: "100%",
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "700",
  },
  confirmButton: {
    width: "100%",
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ff3b30",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  confirmButtonDisabled: {
    opacity: 0.8,
  },
  confirmText: {
    color: "#ff3b30",
    fontSize: 15,
    fontWeight: "800",
  },
});
