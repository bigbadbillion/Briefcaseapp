import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Path, G } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withDelay,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Fonts } from "@/constants/theme";

interface AllocationData {
  label: string;
  value: number;
  color: string;
}

interface AllocationChartProps {
  data: AllocationData[];
  size?: number;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

const CHART_COLORS = [
  "#1B4332",
  "#F4A259",
  "#059669",
  "#6366F1",
  "#EC4899",
  "#14B8A6",
  "#F59E0B",
  "#8B5CF6",
];

export function AllocationChart({ data, size = 160 }: AllocationChartProps) {
  const { theme } = useTheme();
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (!data.length || total === 0) {
    return null;
  }

  const radius = size / 2 - 8;
  const innerRadius = radius * 0.6;
  const centerX = size / 2;
  const centerY = size / 2;

  const createArcPath = (
    startAngle: number,
    endAngle: number,
    outerR: number,
    innerR: number
  ) => {
    const startAngleRad = (startAngle - 90) * (Math.PI / 180);
    const endAngleRad = (endAngle - 90) * (Math.PI / 180);

    const x1 = centerX + outerR * Math.cos(startAngleRad);
    const y1 = centerY + outerR * Math.sin(startAngleRad);
    const x2 = centerX + outerR * Math.cos(endAngleRad);
    const y2 = centerY + outerR * Math.sin(endAngleRad);

    const x3 = centerX + innerR * Math.cos(endAngleRad);
    const y3 = centerY + innerR * Math.sin(endAngleRad);
    const x4 = centerX + innerR * Math.cos(startAngleRad);
    const y4 = centerY + innerR * Math.sin(startAngleRad);

    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

    return `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${x4} ${y4} Z`;
  };

  let currentAngle = 0;
  const segments = data.map((item, index) => {
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle - 1;
    currentAngle += angle;

    return {
      ...item,
      path: createArcPath(startAngle, endAngle, radius, innerRadius),
      color: item.color || CHART_COLORS[index % CHART_COLORS.length],
      index,
    };
  });

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <G>
          {segments.map((segment) => (
            <AnimatedSegment
              key={segment.label}
              path={segment.path}
              color={segment.color}
              delay={segment.index * 100}
            />
          ))}
        </G>
      </Svg>
      <View style={styles.legend}>
        {data.map((item, index) => (
          <View key={item.label} style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: item.color || CHART_COLORS[index % CHART_COLORS.length] },
              ]}
            />
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {item.label}
            </ThemedText>
            <ThemedText
              type="caption"
              style={[styles.legendValue, { fontFamily: Fonts?.mono }]}
            >
              {((item.value / total) * 100).toFixed(0)}%
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

function AnimatedSegment({
  path,
  color,
  delay,
}: {
  path: string;
  color: string;
  delay: number;
}) {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(delay, withSpring(1, { damping: 12, stiffness: 100 }));
  }, []);

  const animatedProps = useAnimatedProps(() => ({
    opacity: scale.value,
    transform: [{ scale: 0.9 + scale.value * 0.1 }],
  }));

  return (
    <AnimatedPath
      d={path}
      fill={color}
      animatedProps={animatedProps}
      origin={`80, 80`}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  legend: {
    marginLeft: Spacing.xl,
    flex: 1,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.sm,
  },
  legendValue: {
    marginLeft: "auto",
    fontWeight: "500",
  },
});
