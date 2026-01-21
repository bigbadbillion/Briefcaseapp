import React, { ReactNode } from "react";
import { StyleSheet, Pressable, ViewStyle, StyleProp } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Shadows, Fonts } from "@/constants/theme";

interface ButtonProps {
  onPress?: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  haptic?: boolean;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  onPress,
  children,
  style,
  disabled = false,
  variant = "primary",
  size = "md",
  haptic = true,
}: ButtonProps) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.97, springConfig);
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      scale.value = withSpring(1, springConfig);
    }
  };

  const handlePress = () => {
    if (!disabled && onPress) {
      if (haptic) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onPress();
    }
  };

  const getBackgroundColor = () => {
    if (disabled) return theme.backgroundTertiary;
    switch (variant) {
      case "primary":
        return theme.primary;
      case "secondary":
        return theme.backgroundSecondary;
      case "ghost":
        return "transparent";
      case "danger":
        return theme.error;
      default:
        return theme.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return theme.textSecondary;
    switch (variant) {
      case "primary":
        return "#FFFFFF";
      case "secondary":
        return theme.text;
      case "ghost":
        return theme.primary;
      case "danger":
        return "#FFFFFF";
      default:
        return "#FFFFFF";
    }
  };

  const getHeight = () => {
    switch (size) {
      case "sm":
        return 36;
      case "md":
        return 48;
      case "lg":
        return 56;
      default:
        return 48;
    }
  };

  const getPaddingHorizontal = () => {
    switch (size) {
      case "sm":
        return Spacing.md;
      case "md":
        return Spacing.xl;
      case "lg":
        return Spacing["2xl"];
      default:
        return Spacing.xl;
    }
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          height: getHeight(),
          paddingHorizontal: getPaddingHorizontal(),
          borderWidth: variant === "ghost" ? 1 : 0,
          borderColor: variant === "ghost" ? theme.border : "transparent",
        },
        variant === "primary" && !disabled && Shadows.card,
        style,
        animatedStyle,
      ]}
    >
      <ThemedText
        type="body"
        style={[
          styles.buttonText,
          {
            color: getTextColor(),
            fontSize: size === "sm" ? 14 : 16,
            fontFamily: Fonts?.sansSemiBold,
          },
        ]}
      >
        {children}
      </ThemedText>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontWeight: "600",
  },
});
