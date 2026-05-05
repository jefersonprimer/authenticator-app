import { useState } from "react";
import { StyleSheet, Text, View, Pressable, Alert, Share, TextInput, ScrollView } from "react-native";
import { exportBackup, importBackup } from "@/storage/secureStore";

export default function BackupScreen() {
  const [importText, setImportText] = useState("");

  const handleExport = async () => {
    try {
      const data = await exportBackup();
      await Share.share({
        message: data,
        title: "Backup do Authenticator",
      });
    } catch (error) {
      Alert.alert("Erro", "Não foi possível exportar o backup.");
    }
  };

  const handleImport = async () => {
    if (!importText.trim()) {
      Alert.alert("Erro", "Cole o texto do backup no campo abaixo.");
      return;
    }

    Alert.alert(
      "Confirmar Importação",
      "Isso irá substituir todas as suas contas atuais pelas do backup. Deseja continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Importar",
          style: "destructive",
          onPress: async () => {
            const success = await importBackup(importText);
            if (success) {
              Alert.alert("Sucesso", "Backup importado com sucesso!");
              setImportText("");
            } else {
              Alert.alert("Erro", "O código de backup é inválido.");
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Backup</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Exportar</Text>
        <Text style={styles.description}>
          Gere um código de backup para salvar suas contas em outro lugar ou transferir para outro celular.
        </Text>
        <Pressable style={styles.button} onPress={handleExport}>
          <Text style={styles.buttonText}>Gerar e Compartilhar Backup</Text>
        </Pressable>
      </View>

      <View style={[styles.section, { marginTop: 32 }]}>
        <Text style={styles.sectionTitle}>Importar</Text>
        <Text style={styles.description}>
          Cole aqui o código de backup que você gerou anteriormente para restaurar suas contas.
        </Text>
        <TextInput
          style={styles.input}
          multiline
          placeholder="Cole o código aqui..."
          value={importText}
          onChangeText={setImportText}
        />
        <Pressable style={[styles.button, { backgroundColor: "#28a745" }]} onPress={handleImport}>
          <Text style={styles.buttonText}>Importar Backup</Text>
        </Pressable>
      </View>

      <View style={styles.warningBox}>
        <Text style={styles.warningText}>
          Atenção: Guarde seu backup em um local seguro. Qualquer pessoa com esse código pode acessar seus tokens 2FA.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: "#fff",
    flexGrow: 1,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  section: {
    backgroundColor: "#f8f9fa",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#eee",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
    lineHeight: 20,
  },
  button: {
    backgroundColor: "#0a7ea4",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  warningBox: {
    marginTop: 40,
    padding: 16,
    backgroundColor: "#fff3cd",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ffeeba",
  },
  warningText: {
    color: "#856404",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
});
