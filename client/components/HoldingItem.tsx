import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Fonts } from "@/constants/theme";

interface HoldingItemProps {
  name: string;
  symbol: string;
  value: number;
  quantity: number;
  change: number;
  changePercent: number;
  type: string;
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TYPE_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  stock: "trending-up",
  crypto: "dollar-sign",
  etf: "layers",
  bond: "file-text",
  real_estate: "home",
  commodity: "box",
  cash: "credit-card",
};

export function HoldingItem({
  name,
  symbol,
  value,
  quantity,
  change,
  changePercent,
  type,
  onPress,
}: HoldingItemProps) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98);
    opacity.value = withSpring(0.8);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
    opacity.value = withSpring(1);
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  const isPositive = change >= 0;
  const changeColor = isPositive ? theme.gainColor : theme.lossColor;
  const icon = TYPE_ICONS[type] || "circle";

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: isDark ? theme.border : "transparent",
          borderWidth: isDark ? 1 : 0,
        },
        animatedStyle,
      ]}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: theme.backgroundSecondary },
        ]}
      >
        <Feather name={icon} size={18} color={theme.primary} />
      </View>

      <View style={styles.info}>
        <ThemedText type="h4" numberOfLines={1}>
          {name}
        </ThemedText>
        <ThemedText
          type="caption"
          style={{ color: theme.textSecondary }}
          numberOfLines={1}
        >
          {symbol} · {quantity.toLocaleString()} units
        </ThemedText>
      </View>

      <View style={styles.valueContainer}>
        <ThemedText type="h4" style={{ fontFamily: Fonts?.mono }}>
          ${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </ThemedText>
        <View style={styles.changeRow}>
          <Feather
            name={isPositive ? "arrow-up-right" : "arrow-down-right"}
            size={12}
            color={changeColor}
          />
          <ThemedText
            type="caption"
            style={[styles.changeText, { color: changeColor }]}
          >
            {isPositive ? "+" : ""}
            {changePercent.toFixed(2)}%
          </ThemedText>
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  info: {
    flex: 1,
    marginRight: Spacing.md,
  },
  valueContainer: {
    alignItems: "flex-end",
  },
  changeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  changeText: {
    fontWeight: "500",
    marginLeft: 2,
  },
});
