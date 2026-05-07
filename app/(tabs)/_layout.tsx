import { Tabs } from "expo-router";
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        tabBarInactiveTintColor: colorScheme === "dark" ? "#9BA1A6" : "#687076",
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: colorScheme === "dark" ? "#151718" : "#fff",
          borderTopWidth: 1,
          borderTopColor: colorScheme === "dark" ? "#222" : "#eee",
          height: 60 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Contas",
          tabBarIcon: ({ color }) => <Ionicons size={24} name="key" color={color} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Escanear",
          tabBarIcon: ({ color }) => <Ionicons size={24} name="qr-code" color={color} />,
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Backup",
          tabBarIcon: ({ color }) => <Ionicons size={24} name="cloud-upload" color={color} />,
        }}
      />
    </Tabs>
  );
}
