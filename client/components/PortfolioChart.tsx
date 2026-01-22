import React, { useEffect } from "react";
import { StyleSheet, View, Dimensions } from "react-native";
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

interface PortfolioChartProps {
  data: number[];
  width?: number;
  height?: number;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function PortfolioChart({
  data,
  width = Dimensions.get("window").width - Spacing.lg * 2,
  height = 180,
}: PortfolioChartProps) {
  const { theme } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: 1200,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [data]);

  if (data.length < 2 || data.every(v => !isFinite(v) || isNaN(v))) {
    return null;
  }

  const validData = data.filter(v => isFinite(v) && !isNaN(v));
  if (validData.length < 2) {
    return null;
  }

  const padding = { top: 20, right: 10, bottom: 20, left: 10 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const minValue = Math.min(...data) * 0.95;
  const maxValue = Math.max(...data) * 1.05;
  const valueRange = maxValue - minValue || 1;

  const points = data.map((value, index) => {
    const safeValue = isFinite(value) && !isNaN(value) ? value : minValue;
    return {
      x: padding.left + (index / (data.length - 1)) * chartWidth,
      y: padding.top + chartHeight - ((safeValue - minValue) / valueRange) * chartHeight,
    };
  });

  const createSmoothPath = () => {
    if (points.length < 2) return "";

    let path = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      const controlX = (current.x + next.x) / 2;

      path += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
    }

    return path;
  };

  const createAreaPath = () => {
    const linePath = createSmoothPath();
    const lastPoint = points[points.length - 1];
    const firstPoint = points[0];

    return `${linePath} L ${lastPoint.x} ${height - padding.bottom} L ${firstPoint.x} ${height - padding.bottom} Z`;
  };

  const linePath = createSmoothPath();
  const areaPath = createAreaPath();

  const lastPoint = points[points.length - 1];
  const isPositive = data[data.length - 1] >= data[0];
  const lineColor = isPositive ? theme.gainColor : theme.lossColor;

  const animatedLineProps = useAnimatedProps(() => ({
    strokeDashoffset: (1 - progress.value) * 2000,
  }));

  const animatedAreaProps = useAnimatedProps(() => ({
    opacity: progress.value * 0.3,
  }));

  const animatedDotProps = useAnimatedProps(() => ({
    opacity: progress.value,
    r: progress.value * 6,
  }));

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={lineColor} stopOpacity="0.4" />
            <Stop offset="1" stopColor={lineColor} stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={lineColor} stopOpacity="0.6" />
            <Stop offset="1" stopColor={lineColor} stopOpacity="1" />
          </LinearGradient>
        </Defs>

        <AnimatedPath
          d={areaPath}
          fill="url(#areaGradient)"
          animatedProps={animatedAreaProps}
        />

        <AnimatedPath
          d={linePath}
          stroke="url(#lineGradient)"
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={2000}
          animatedProps={animatedLineProps}
        />

        <AnimatedCircle
          cx={lastPoint.x}
          cy={lastPoint.y}
          fill={lineColor}
          animatedProps={animatedDotProps}
        />
        <Circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={12}
          fill={lineColor}
          opacity={0.2}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
});
