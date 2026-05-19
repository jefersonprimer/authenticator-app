import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const theme = Colors[colorScheme ?? "light"];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: colorScheme === "dark" ? "#9BA1A6" : "#687076",
        headerShown: true,
        headerTintColor: theme.tint,
        headerStyle: {
          backgroundColor: theme.headerBackground,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: {
          color: theme.text,
          fontSize: 18,
          fontWeight: "600",
        },
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: theme.headerBackground,
          height: 60 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          elevation: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Contas",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <Ionicons size={24} name="key" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Escanear",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <Ionicons size={24} name="qr-code" color={color} />
          ),
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Backup",
          tabBarIcon: ({ color }) => (
            <Ionicons size={24} name="cloud-upload" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="export"
        options={{
          headerShown: false,
          title: "Exportar",
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="import"
        options={{
          headerShown: false,
          title: "Importar",
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
    </Tabs>
  );
}
