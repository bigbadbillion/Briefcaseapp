import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Fonts } from "@/constants/theme";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  isPositive?: boolean;
  icon: keyof typeof Feather.glyphMap;
  delay?: number;
  onPress?: () => void;
}

export function StatCard({
  title,
  value,
  change,
  isPositive = true,
  icon,
  delay = 0,
  onPress,
}: StatCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    scale.value = withDelay(delay, withSpring(1, { damping: 12, stiffness: 100 }));
    translateY.value = withDelay(delay, withSpring(0, { damping: 12, stiffness: 100 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: scale.value,
    transform: [{ translateY: translateY.value }],
  }));

  const changeColor = isPositive ? theme.gainColor : theme.lossColor;

  return (
    <Animated.View style={[styles.wrapper, animatedStyle]}>
      <Card style={styles.card} onPress={onPress}>
        <View style={styles.header}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather name={icon} size={16} color={theme.primary} />
          </View>
        </View>
        <ThemedText
          type="caption"
          style={[styles.title, { color: theme.textSecondary }]}
        >
          {title}
        </ThemedText>
        <ThemedText
          type="h3"
          style={[styles.value, { fontFamily: Fonts?.mono }]}
        >
          {value}
        </ThemedText>
        {change ? (
          <View style={styles.changeContainer}>
            <Feather
              name={isPositive ? "trending-up" : "trending-down"}
              size={12}
              color={changeColor}
            />
            <ThemedText
              type="caption"
              style={[styles.change, { color: changeColor }]}
            >
              {change}
            </ThemedText>
          </View>
        ) : null}
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  card: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    marginBottom: Spacing.xs,
  },
  value: {
    marginBottom: Spacing.xs,
  },
  changeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  change: {
    fontWeight: "500",
  },
});
