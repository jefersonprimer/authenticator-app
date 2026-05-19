import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { router } from "expo-router";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export default function BackupScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: colorScheme === "dark" ? "#1f2937" : "#f1f5f9" },
            ]}
          >
            <IconSymbol name="shield.fill" size={32} color={theme.tint} />
          </View>
          <Text style={[styles.heroTitle, { color: theme.text }]}>Segurança e Backup</Text>
          <Text style={[styles.heroText, { color: theme.icon }]}>
            Seus dados são criptografados localmente. O app não faz sincronização em nuvem para
            garantir sua privacidade total.
          </Text>
        </View>

        <View style={styles.actionGrid}>
          <Pressable
            style={({ pressed }) => [
              styles.actionCard,
              {
                backgroundColor: theme.cardBackground,
                borderColor: theme.cardBorder,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            onPress={() => router.push("/export")}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#e0f2fe" }]}>
              <IconSymbol name="arrow.up.doc.fill" size={24} color="#0369a1" />
            </View>
            <Text style={[styles.actionTitle, { color: theme.text }]}>Exportar</Text>
            <Text style={[styles.actionDescription, { color: theme.icon }]}>
              Criar um arquivo protegido por senha
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionCard,
              {
                backgroundColor: theme.cardBackground,
                borderColor: theme.cardBorder,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            onPress={() => router.push("/import")}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#f0fdf4" }]}>
              <IconSymbol name="arrow.down.doc.fill" size={24} color="#15803d" />
            </View>
            <Text style={[styles.actionTitle, { color: theme.text }]}>Importar</Text>
            <Text style={[styles.actionDescription, { color: theme.icon }]}>
              Restaurar de um arquivo .backup.json
            </Text>
          </Pressable>
        </View>

        <View style={[styles.warningBox, { borderColor: theme.cardBorder }]}>
          <View style={styles.warningHeader}>
            <IconSymbol name="exclamationmark.triangle.fill" size={20} color="#b45309" />
            <Text style={styles.warningTitle}>Aviso Importante</Text>
          </View>
          <Text style={styles.warningText}>
            Se você perder o aparelho e não tiver um backup, suas contas 2FA podem ficar
            inacessíveis permanentemente. Guarde seu backup em um local seguro.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    gap: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
    gap: 12,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  heroText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  actionGrid: {
    flexDirection: "row",
    gap: 16,
  },
  actionCard: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  actionDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  warningBox: {
    marginTop: 10,
    padding: 20,
    borderRadius: 24,
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    gap: 10,
  },
  warningHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#92400e",
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#b45309",
  },
});
