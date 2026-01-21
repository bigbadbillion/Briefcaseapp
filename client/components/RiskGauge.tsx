import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Path, Circle, G, Text as SvgText } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withDelay,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Fonts } from "@/constants/theme";

interface RiskGaugeProps {
  score: number;
  size?: number;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

export function RiskGauge({ score, size = 140 }: RiskGaugeProps) {
  const { theme } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(200, withSpring(score / 100, { damping: 15, stiffness: 80 }));
  }, [score]);

  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2 - 12;
  const strokeWidth = 12;

  const startAngle = 135;
  const endAngle = 405;
  const totalAngle = endAngle - startAngle;

  const createArc = (start: number, end: number) => {
    const startRad = (start * Math.PI) / 180;
    const endRad = (end * Math.PI) / 180;

    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);

    const largeArcFlag = end - start > 180 ? 1 : 0;

    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
  };

  const backgroundPath = createArc(startAngle, endAngle);

  const getRiskColor = () => {
    if (score < 30) return theme.gainColor;
    if (score < 60) return theme.warning;
    return theme.error;
  };

  const getRiskLabel = () => {
    if (score < 30) return "Low Risk";
    if (score < 60) return "Moderate";
    return "High Risk";
  };

  const animatedProps = useAnimatedProps(() => {
    const currentEndAngle = startAngle + totalAngle * progress.value;
    const path = createArc(startAngle, currentEndAngle);
    return {
      d: path,
    };
  });

  return (
    <View style={styles.container}>
      <Svg width={size} height={size * 0.75}>
        <Path
          d={backgroundPath}
          stroke={theme.backgroundTertiary}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
        <AnimatedPath
          animatedProps={animatedProps}
          stroke={getRiskColor()}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
      </Svg>
      <View style={styles.labelContainer}>
        <ThemedText type="display" style={[styles.score, { fontFamily: Fonts?.mono }]}>
          {score}
        </ThemedText>
        <ThemedText
          type="caption"
          style={[styles.label, { color: theme.textSecondary }]}
        >
          {getRiskLabel()}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  labelContainer: {
    position: "absolute",
    alignItems: "center",
    bottom: 0,
  },
  score: {
    fontSize: 36,
  },
  label: {
    marginTop: -4,
  },
});
