import React, { useState, useEffect, useCallback } from "react";
import { StyleSheet, View, ScrollView, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  FadeIn,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { PortfolioChart } from "@/components/PortfolioChart";
import { AllocationChart } from "@/components/AllocationChart";
import { StatCard } from "@/components/StatCard";
import { TimeRangeSelector } from "@/components/TimeRangeSelector";
import { AnimatedValue } from "@/components/AnimatedValue";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Fonts, BorderRadius } from "@/constants/theme";
import {
  getHoldings,
  calculatePortfolioMetrics,
  initializeSampleData,
  Holding,
} from "@/lib/storage";

type TimeRange = "1D" | "1W" | "1M" | "3M" | "1Y" | "ALL";

const CHART_COLORS = [
  "#1B4332",
  "#F4A259",
  "#059669",
  "#6366F1",
  "#EC4899",
  "#14B8A6",
];

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();

  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>("1M");
  const [previousValue, setPreviousValue] = useState<number | undefined>(undefined);

  const loadData = useCallback(async () => {
    await initializeSampleData();
    const data = await getHoldings();
    setHoldings(data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const oldMetrics = calculatePortfolioMetrics(holdings);
    setPreviousValue(oldMetrics.totalValue);

    const data = await getHoldings();
    const updatedHoldings = data.map((h) => ({
      ...h,
      currentPrice: h.currentPrice * (1 + (Math.random() - 0.45) * 0.02),
    }));
    setHoldings(updatedHoldings);
    setRefreshing(false);
  }, [holdings]);

  const metrics = calculatePortfolioMetrics(holdings);

  const generateChartData = () => {
    const points = 30;
    const baseValue = metrics.totalValue * 0.85;
    const data = [];
    for (let i = 0; i < points; i++) {
      const progress = i / (points - 1);
      const trend = progress * (metrics.totalValue - baseValue);
      const noise = (Math.random() - 0.5) * metrics.totalValue * 0.03;
      data.push(baseValue + trend + noise);
    }
    return data;
  };

  const getAllocationData = () => {
    return Object.entries(metrics.typeAllocation).map(([type, value], index) => ({
      label: type.charAt(0).toUpperCase() + type.slice(1).replace("_", " "),
      value,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));
  };

  if (loading) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: tabBarHeight + Spacing["5xl"],
          paddingHorizontal: Spacing.lg,
        }}
      >
        <SkeletonLoader height={160} style={{ marginBottom: Spacing.lg }} />
        <SkeletonLoader height={200} style={{ marginBottom: Spacing.lg }} />
        <View style={styles.statRow}>
          <SkeletonLoader height={120} style={{ flex: 1, marginRight: Spacing.sm }} />
          <SkeletonLoader height={120} style={{ flex: 1 }} />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.xl,
        paddingBottom: tabBarHeight + Spacing["5xl"],
        paddingHorizontal: Spacing.lg,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeIn.delay(100).duration(400)}>
        <Card style={styles.portfolioCard}>
          <View style={styles.portfolioHeader}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Total Portfolio Value
            </ThemedText>
            <View style={[styles.liveIndicator, { backgroundColor: theme.gainColor }]} />
          </View>
          <AnimatedValue
            value={metrics.totalValue}
            previousValue={previousValue}
            decimals={2}
            style={styles.portfolioValue}
          />
          <View style={styles.changeContainer}>
            <Feather
              name={metrics.totalGainLoss >= 0 ? "trending-up" : "trending-down"}
              size={16}
              color={metrics.totalGainLoss >= 0 ? theme.gainColor : theme.lossColor}
            />
            <ThemedText
              type="body"
              style={[
                styles.changeText,
                { color: metrics.totalGainLoss >= 0 ? theme.gainColor : theme.lossColor },
              ]}
            >
              {metrics.totalGainLoss >= 0 ? "+" : ""}
              ${Math.abs(metrics.totalGainLoss).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              {" ("}
              {metrics.totalGainLossPercent >= 0 ? "+" : ""}
              {metrics.totalGainLossPercent.toFixed(2)}%)
            </ThemedText>
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(200).duration(400)}>
        <Card style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <ThemedText type="h3">Performance</ThemedText>
          </View>
          <TimeRangeSelector selected={timeRange} onSelect={setTimeRange} />
          <View style={styles.chartContainer}>
            <PortfolioChart data={generateChartData()} height={160} />
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(300).duration(400)}>
        <Card style={styles.allocationCard}>
          <ThemedText type="h3" style={styles.sectionTitle}>
            Allocation
          </ThemedText>
          {holdings.length > 0 ? (
            <AllocationChart data={getAllocationData()} />
          ) : (
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              Add holdings to see allocation
            </ThemedText>
          )}
        </Card>
      </Animated.View>

      <ThemedText type="h3" style={styles.sectionTitle}>
        Quick Stats
      </ThemedText>
      <View style={styles.statRow}>
        <StatCard
          title="Best Performer"
          value={metrics.bestPerformer?.symbol || "-"}
          change={
            metrics.bestPerformer
              ? `+${(
                  ((metrics.bestPerformer.currentPrice - metrics.bestPerformer.purchasePrice) /
                    metrics.bestPerformer.purchasePrice) *
                  100
                ).toFixed(1)}%`
              : undefined
          }
          isPositive
          icon="arrow-up-circle"
          delay={400}
        />
        <View style={{ width: Spacing.sm }} />
        <StatCard
          title="Worst Performer"
          value={metrics.worstPerformer?.symbol || "-"}
          change={
            metrics.worstPerformer
              ? `${(
                  ((metrics.worstPerformer.currentPrice - metrics.worstPerformer.purchasePrice) /
                    metrics.worstPerformer.purchasePrice) *
                  100
                ).toFixed(1)}%`
              : undefined
          }
          isPositive={false}
          icon="arrow-down-circle"
          delay={500}
        />
      </View>
      <View style={styles.statRow}>
        <StatCard
          title="Diversification"
          value={`${metrics.diversificationScore.toFixed(0)}/100`}
          icon="pie-chart"
          delay={600}
        />
        <View style={{ width: Spacing.sm }} />
        <StatCard
          title="Holdings"
          value={holdings.length.toString()}
          icon="layers"
          delay={700}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  portfolioCard: {
    marginBottom: Spacing.lg,
  },
  portfolioHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: Spacing.sm,
  },
  portfolioValue: {
    fontSize: 36,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  changeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  changeText: {
    marginLeft: Spacing.xs,
    fontWeight: "500",
  },
  chartCard: {
    marginBottom: Spacing.lg,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  chartContainer: {
    marginTop: Spacing.lg,
    marginHorizontal: -Spacing.xl,
  },
  allocationCard: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  statRow: {
    flexDirection: "row",
    marginBottom: Spacing.sm,
  },
});
