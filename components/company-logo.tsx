import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

type CompanyLogoProps = {
  label: string;
  size?: number;
  dark?: boolean;
};

const BRAND_ICON_MAP: Record<string, string> = {
  google: "google",
  github: "github",
  gitlab: "gitlab",
  microsoft: "microsoft",
  apple: "apple",
  amazon: "amazon",
  facebook: "facebook",
  meta: "meta",
  discord: "discord",
  slack: "slack",
  figma: "figma",
  dropbox: "dropbox",
  linkedin: "linkedin",
  paypal: "paypal",
  twitch: "twitch",
  x: "x-twitter",
  twitter: "x-twitter",
  bitbucket: "bitbucket",
};

const getInitials = (value: string) => {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
};

const getBrandIcon = (value: string) => {
  const source = value.toLowerCase();

  for (const [key, icon] of Object.entries(BRAND_ICON_MAP)) {
    if (source.includes(key)) return icon;
  }

  return null;
};

export function CompanyLogo({
  label,
  size = 48,
  dark = false,
}: CompanyLogoProps) {
  const safeLabel = label.trim() || "Conta";
  const brandIcon = getBrandIcon(safeLabel);
  const foreground = dark ? "#f8fafc" : "#111111";
  const background = dark ? "#111111" : "#ffffff";
  const borderColor = dark ? "#2C2C2E" : "#e5e7eb";

  return (
    <View
      style={[
        styles.logo,
        {
          width: size,
          height: size,
          borderRadius: "100%",
          backgroundColor: background,
          borderColor,
        },
      ]}
    >
      {brandIcon ? (
        <FontAwesome6
          brand
          name={brandIcon}
          size={Math.max(18, size * 0.42)}
          color={foreground}
        />
      ) : (
        <>
          <Ionicons
            name="ellipse-outline"
            size={Math.max(16, size * 0.3)}
            color={foreground}
            style={styles.fallbackGlyph}
          />
          <Text
            style={[
              styles.fallbackText,
              {
                color: foreground,
                fontSize: Math.max(11, size * 0.22),
              },
            ]}
          >
            {getInitials(safeLabel)}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    overflow: "hidden",
  },
  fallbackGlyph: {
    position: "absolute",
    opacity: 0.18,
  },
  fallbackText: {
    fontWeight: "800",
    letterSpacing: 0.4,
  },
});
