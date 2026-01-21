import { Text, type TextProps } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { Typography, Fonts } from "@/constants/theme";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: "display" | "h1" | "h2" | "h3" | "h4" | "body" | "small" | "caption" | "mono" | "link";
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "body",
  ...rest
}: ThemedTextProps) {
  const { theme, isDark } = useTheme();

  const getColor = () => {
    if (isDark && darkColor) {
      return darkColor;
    }

    if (!isDark && lightColor) {
      return lightColor;
    }

    if (type === "link") {
      return theme.link;
    }

    return theme.text;
  };

  const getTypeStyle = () => {
    switch (type) {
      case "display":
        return { ...Typography.display, fontFamily: Fonts?.sansBold };
      case "h1":
        return { ...Typography.h1, fontFamily: Fonts?.sansSemiBold };
      case "h2":
        return { ...Typography.h2, fontFamily: Fonts?.sansSemiBold };
      case "h3":
        return { ...Typography.h3, fontFamily: Fonts?.sansSemiBold };
      case "h4":
        return { ...Typography.h4, fontFamily: Fonts?.sansSemiBold };
      case "body":
        return { ...Typography.body, fontFamily: Fonts?.sans };
      case "small":
        return { ...Typography.small, fontFamily: Fonts?.sans };
      case "caption":
        return { ...Typography.caption, fontFamily: Fonts?.sans };
      case "mono":
        return { ...Typography.mono, fontFamily: Fonts?.mono };
      case "link":
        return { ...Typography.link, fontFamily: Fonts?.sans };
      default:
        return { ...Typography.body, fontFamily: Fonts?.sans };
    }
  };

  return (
    <Text style={[{ color: getColor() }, getTypeStyle(), style]} {...rest} />
  );
}
