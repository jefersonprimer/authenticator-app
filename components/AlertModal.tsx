import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type AlertModalProps = {
  visible: boolean;
  title: string;
  description: string;
  buttonText?: string;
  onClose: () => void;
};

export function AlertModal({
  visible,
  title,
  description,
  buttonText = "Entendido",
  onClose,
}: AlertModalProps) {
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
          onPress={onClose}
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
            {title}
          </Text>

          <Text style={[styles.description, { color: theme.icon }]}>
            {description}
          </Text>

          <View style={styles.actions}>
            <Pressable
              style={[styles.primaryButton, { backgroundColor: theme.tint }]}
              onPress={onClose}
            >
              <Text style={[styles.primaryText, { color: colorScheme === 'dark' ? '#000' : '#fff' }]}>
                {buttonText}
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
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 26,
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 14,
  },
  actions: {
    width: "100%",
    marginTop: 24,
  },
  primaryButton: {
    width: "100%",
    minHeight: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primaryText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
