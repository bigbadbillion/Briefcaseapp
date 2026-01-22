import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Path, G, Defs, LinearGradient, Stop, Ellipse } from "react-native-svg";
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

const lightenColor = (hex: string, percent: number) => {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const B = Math.min(255, (num & 0x0000ff) + amt);
  return `#${((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1)}`;
};

const darkenColor = (hex: string, percent: number) => {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
  const B = Math.max(0, (num & 0x0000ff) - amt);
  return `#${((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1)}`;
};

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
      <View style={styles.chartWrapper}>
        <Svg width={size} height={size + 12}>
          <Defs>
            {segments.map((segment, i) => (
              <LinearGradient
                key={`grad-${segment.label}`}
                id={`gradient-${i}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <Stop offset="0%" stopColor={lightenColor(segment.color, 20)} />
                <Stop offset="50%" stopColor={segment.color} />
                <Stop offset="100%" stopColor={darkenColor(segment.color, 15)} />
              </LinearGradient>
            ))}
          </Defs>
          <G transform="translate(0, 6)">
            <Ellipse
              cx={centerX}
              cy={centerY + 4}
              rx={radius}
              ry={radius * 0.15}
              fill="rgba(0,0,0,0.15)"
            />
          </G>
          <G>
            {segments.map((segment, i) => (
              <AnimatedSegment
                key={segment.label}
                path={segment.path}
                gradientId={`gradient-${i}`}
                delay={segment.index * 100}
              />
            ))}
          </G>
          <Ellipse
            cx={centerX}
            cy={centerY}
            rx={innerRadius - 2}
            ry={innerRadius - 2}
            fill={theme.backgroundSecondary}
          />
          <Ellipse
            cx={centerX}
            cy={centerY - 2}
            rx={innerRadius - 6}
            ry={innerRadius - 6}
            fill={theme.backgroundDefault}
          />
        </Svg>
      </View>
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
  gradientId,
  delay,
}: {
  path: string;
  gradientId: string;
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
      fill={`url(#${gradientId})`}
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
  chartWrapper: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
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
