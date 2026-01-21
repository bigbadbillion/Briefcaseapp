import React, { useEffect } from "react";
import { StyleSheet, ViewStyle, TextStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  interpolate,
  runOnJS,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";

interface AnimatedValueProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  style?: TextStyle;
  containerStyle?: ViewStyle;
  showChange?: boolean;
  previousValue?: number;
}

export function AnimatedValue({
  value,
  prefix = "$",
  suffix = "",
  decimals = 2,
  duration = 800,
  style,
  containerStyle,
  showChange = false,
  previousValue,
}: AnimatedValueProps) {
  const { theme } = useTheme();
  const animatedValue = useSharedValue(previousValue ?? value);
  const flashOpacity = useSharedValue(0);
  const scale = useSharedValue(1);

  const isGain = previousValue !== undefined && value > previousValue;
  const isLoss = previousValue !== undefined && value < previousValue;

  useEffect(() => {
    if (previousValue !== undefined && previousValue !== value) {
      flashOpacity.value = withTiming(1, { duration: 100 }, () => {
        flashOpacity.value = withTiming(0, { duration: 400 });
      });
      scale.value = withSpring(1.02, { damping: 10, stiffness: 200 }, () => {
        scale.value = withSpring(1, { damping: 15, stiffness: 150 });
      });
    }
    animatedValue.value = withTiming(value, {
      duration,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [value, previousValue]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const flashColor = isGain ? theme.gainColor : isLoss ? theme.lossColor : "transparent";

  const formatNumber = (num: number) => {
    return num.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  return (
    <Animated.View style={[styles.container, containerStyle, containerAnimatedStyle]}>
      <Animated.View style={[styles.flash, { backgroundColor: flashColor }, flashStyle]} />
      <AnimatedNumber
        animatedValue={animatedValue}
        prefix={prefix}
        suffix={suffix}
        decimals={decimals}
        style={style}
        formatNumber={formatNumber}
      />
    </Animated.View>
  );
}

interface AnimatedNumberProps {
  animatedValue: Animated.SharedValue<number>;
  prefix: string;
  suffix: string;
  decimals: number;
  style?: TextStyle;
  formatNumber: (num: number) => string;
}

function AnimatedNumber({
  animatedValue,
  prefix,
  suffix,
  decimals,
  style,
  formatNumber,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = React.useState(
    formatNumber(animatedValue.value)
  );

  useEffect(() => {
    const updateDisplay = () => {
      setDisplayValue(formatNumber(animatedValue.value));
    };

    const interval = setInterval(() => {
      updateDisplay();
    }, 16);

    return () => clearInterval(interval);
  }, [animatedValue, formatNumber]);

  return (
    <ThemedText type="mono" style={style}>
      {prefix}{displayValue}{suffix}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    overflow: "hidden",
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
  },
});
