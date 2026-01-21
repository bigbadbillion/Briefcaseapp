import { Colors } from "@/constants/theme";
import { useThemeContext } from "@/contexts/ThemeContext";

export function useTheme() {
  const { resolvedTheme, isDark } = useThemeContext();
  const theme = Colors[resolvedTheme];

  return {
    theme,
    isDark,
  };
}
