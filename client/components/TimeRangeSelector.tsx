import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

type TimeRange = "1D" | "1W" | "1M" | "3M" | "1Y" | "ALL";

interface TimeRangeSelectorProps {
  selected: TimeRange;
  onSelect: (range: TimeRange) => void;
}

const RANGES: TimeRange[] = ["1D", "1W", "1M", "3M", "1Y", "ALL"];

export function TimeRangeSelector({ selected, onSelect }: TimeRangeSelectorProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
      {RANGES.map((range) => (
        <TimeRangeButton
          key={range}
          range={range}
          isSelected={range === selected}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSelect(range);
          }}
        />
      ))}
    </View>
  );
}

function TimeRangeButton({
  range,
  isSelected,
  onPress,
}: {
  range: TimeRange;
  isSelected: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: isSelected ? theme.primary : "transparent",
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.92);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.buttonWrapper}
    >
      <Animated.View style={[styles.button, animatedStyle]}>
        <ThemedText
          type="caption"
          style={[
            styles.buttonText,
            { color: isSelected ? "#FFFFFF" : theme.textSecondary },
          ]}
        >
          {range}
        </ThemedText>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: BorderRadius.sm,
    padding: 4,
  },
  buttonWrapper: {
    flex: 1,
  },
  button: {
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontWeight: "600",
  },
});
