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
import { Spacing, BorderRadius } from "@/constants/theme";

type InsightType = "warning" | "opportunity" | "info" | "success";

interface InsightCardProps {
  type: InsightType;
  title: string;
  description: string;
  delay?: number;
  onPress?: () => void;
}

const INSIGHT_CONFIG: Record<
  InsightType,
  { icon: keyof typeof Feather.glyphMap; colorKey: string }
> = {
  warning: { icon: "alert-triangle", colorKey: "warning" },
  opportunity: { icon: "zap", colorKey: "accent" },
  info: { icon: "info", colorKey: "primary" },
  success: { icon: "check-circle", colorKey: "success" },
};

export function InsightCard({
  type,
  title,
  description,
  delay = 0,
  onPress,
}: InsightCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(0);
  const translateX = useSharedValue(-20);

  useEffect(() => {
    scale.value = withDelay(delay, withSpring(1, { damping: 12, stiffness: 100 }));
    translateX.value = withDelay(delay, withSpring(0, { damping: 12, stiffness: 100 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: scale.value,
    transform: [{ translateX: translateX.value }],
  }));

  const config = INSIGHT_CONFIG[type];
  const iconColor = theme[config.colorKey as keyof typeof theme] as string;

  return (
    <Animated.View style={animatedStyle}>
      <Card style={styles.card} onPress={onPress}>
        <View style={styles.content}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${iconColor}20` },
            ]}
          >
            <Feather name={config.icon} size={18} color={iconColor} />
          </View>
          <View style={styles.textContainer}>
            <ThemedText type="h4" style={styles.title}>
              {title}
            </ThemedText>
            <ThemedText
              type="small"
              style={[styles.description, { color: theme.textSecondary }]}
              numberOfLines={2}
            >
              {description}
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </View>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.sm,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  textContainer: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  title: {
    marginBottom: 2,
  },
  description: {
    lineHeight: 18,
  },
});
