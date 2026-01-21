import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  runOnJS,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Fonts } from "@/constants/theme";

interface RiskGaugeProps {
  score: number;
  size?: number;
}

export function RiskGauge({ score, size = 140 }: RiskGaugeProps) {
  const { theme } = useTheme();
  const animatedProgress = useSharedValue(0);
  const [displayProgress, setDisplayProgress] = useState(0);

  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2 - 12;
  const strokeWidth = 12;

  const startAngle = 135;
  const endAngle = 405;
  const totalAngle = endAngle - startAngle;

  useEffect(() => {
    setDisplayProgress(0);
    animatedProgress.value = 0;
    
    const targetProgress = score / 100;
    animatedProgress.value = withDelay(
      200,
      withSpring(targetProgress, { damping: 15, stiffness: 80 })
    );

    const interval = setInterval(() => {
      setDisplayProgress((prev) => {
        const diff = targetProgress - prev;
        if (Math.abs(diff) < 0.01) {
          clearInterval(interval);
          return targetProgress;
        }
        return prev + diff * 0.1;
      });
    }, 16);

    return () => clearInterval(interval);
  }, [score]);

  const createArc = (start: number, end: number) => {
    if (Math.abs(end - start) < 1) {
      end = start + 1;
    }
    
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
  const currentEndAngle = startAngle + totalAngle * displayProgress;
  const progressPath = displayProgress > 0.01 ? createArc(startAngle, currentEndAngle) : "";

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
        {progressPath ? (
          <Path
            d={progressPath}
            stroke={getRiskColor()}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
          />
        ) : null}
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
