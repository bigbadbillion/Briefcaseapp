import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#2B2D35",
    textSecondary: "#6B7280",
    buttonText: "#FFFFFF",
    tabIconDefault: "#6B7280",
    tabIconSelected: "#1B4332",
    link: "#1B4332",
    primary: "#1B4332",
    accent: "#F4A259",
    success: "#059669",
    error: "#DC2626",
    warning: "#F4A259",
    backgroundRoot: "#FAFAFA",
    backgroundDefault: "#FFFFFF",
    backgroundSecondary: "#F3F4F6",
    backgroundTertiary: "#E5E7EB",
    border: "#E5E7EB",
    cardShadow: "rgba(0,0,0,0.08)",
    chartGradientStart: "rgba(27, 67, 50, 0.3)",
    chartGradientEnd: "rgba(27, 67, 50, 0.0)",
    gainColor: "#059669",
    lossColor: "#DC2626",
  },
  dark: {
    text: "#E8E9ED",
    textSecondary: "#9CA3AF",
    buttonText: "#FFFFFF",
    tabIconDefault: "#9CA3AF",
    tabIconSelected: "#4ADE80",
    link: "#4ADE80",
    primary: "#4ADE80",
    accent: "#F4A259",
    success: "#34D399",
    error: "#F87171",
    warning: "#FBBF24",
    backgroundRoot: "#1A1D23",
    backgroundDefault: "#252932",
    backgroundSecondary: "#2D3340",
    backgroundTertiary: "#3D4451",
    border: "#3D4451",
    cardShadow: "rgba(0,0,0,0.3)",
    chartGradientStart: "rgba(74, 222, 128, 0.3)",
    chartGradientEnd: "rgba(74, 222, 128, 0.0)",
    gainColor: "#34D399",
    lossColor: "#F87171",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 48,
  buttonHeight: 52,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  full: 9999,
};

export const Typography = {
  display: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "700" as const,
  },
  h1: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "600" as const,
  },
  h2: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "600" as const,
  },
  h3: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400" as const,
  },
  mono: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "500" as const,
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "IBMPlexSans_400Regular",
    sansMedium: "IBMPlexSans_500Medium",
    sansSemiBold: "IBMPlexSans_600SemiBold",
    sansBold: "IBMPlexSans_700Bold",
    mono: "IBMPlexMono_500Medium",
  },
  default: {
    sans: "IBMPlexSans_400Regular",
    sansMedium: "IBMPlexSans_500Medium",
    sansSemiBold: "IBMPlexSans_600SemiBold",
    sansBold: "IBMPlexSans_700Bold",
    mono: "IBMPlexMono_500Medium",
  },
  web: {
    sans: "'IBM Plex Sans', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    sansMedium: "'IBM Plex Sans', system-ui, sans-serif",
    sansSemiBold: "'IBM Plex Sans', system-ui, sans-serif",
    sansBold: "'IBM Plex Sans', system-ui, sans-serif",
    mono: "'IBM Plex Mono', monospace",
  },
});

export const Shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  float: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
};
