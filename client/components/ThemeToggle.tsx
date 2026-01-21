import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  interpolateColor,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useThemeContext } from "@/contexts/ThemeContext";
import { Spacing, BorderRadius } from "@/constants/theme";

type ThemeMode = "light" | "dark" | "system";

const OPTIONS: { mode: ThemeMode; icon: keyof typeof Feather.glyphMap; label: string }[] = [
  { mode: "light", icon: "sun", label: "Light" },
  { mode: "dark", icon: "moon", label: "Dark" },
  { mode: "system", icon: "smartphone", label: "System" },
];

export function ThemeToggle() {
  const { theme } = useTheme();
  const { themeMode, setThemeMode } = useThemeContext();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
      {OPTIONS.map((option) => (
        <ThemeOption
          key={option.mode}
          mode={option.mode}
          icon={option.icon}
          label={option.label}
          isSelected={themeMode === option.mode}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setThemeMode(option.mode);
          }}
        />
      ))}
    </View>
  );
}

function ThemeOption({
  mode,
  icon,
  label,
  isSelected,
  onPress,
}: {
  mode: ThemeMode;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: isSelected ? theme.backgroundDefault : "transparent",
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.optionWrapper}
    >
      <Animated.View style={[styles.option, animatedStyle]}>
        <Feather
          name={icon}
          size={18}
          color={isSelected ? theme.primary : theme.textSecondary}
        />
        <ThemedText
          type="caption"
          style={[
            styles.optionLabel,
            { color: isSelected ? theme.text : theme.textSecondary },
          ]}
        >
          {label}
        </ThemedText>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    padding: 4,
  },
  optionWrapper: {
    flex: 1,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  optionLabel: {
    fontWeight: "600",
  },
});
