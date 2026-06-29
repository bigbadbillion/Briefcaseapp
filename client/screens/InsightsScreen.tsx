import React, { useCallback } from "react";
import { StyleSheet, View, ScrollView, RefreshControl, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeIn } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { RiskGauge } from "@/components/RiskGauge";
import { InsightCard } from "@/components/InsightCard";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Spacing, BorderRadius, Fonts } from "@/constants/theme";
import { useHoldings, calculatePortfolioMetrics } from "@/hooks/useHoldings";
import { useAIInsights } from "@/hooks/useAIInsights";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

const emptyInsightsImage = require("../assets/images/empty-insights.png");

interface Insight {
  type: "warning" | "opportunity" | "info" | "success";
  title: string;
  description: string;
}

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { isPremium, isLoading: subscriptionLoading } = useSubscription();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();

  const { data: holdings = [], isLoading: loading, refetch, isRefetching } = useHoldings();
  const {
    data: aiResult,
    isLoading: loadingAiInsights,
    isFetching: fetchingAiInsights,
  } = useAIInsights();

  const aiInsightsText =
    aiResult?.configured && aiResult.insights ? aiResult.insights : null;
  const aiInsightsFailed = !!aiResult && (!aiResult.configured || !aiResult.insights);

  const handleUpgrade = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("Paywall");
  };

  const onRefresh = useCallback(async () => {
    await refetch();
    await queryClient.invalidateQueries({ queryKey: ["/api/ai/insights"] });
  }, [refetch, queryClient]);

  const metrics = calculatePortfolioMetrics(holdings);

  const generateRuleBasedInsights = (): Insight[] => {
    const insights: Insight[] = [];

    if (holdings.length === 0) return insights;

    if (metrics.riskScore > 70) {
      insights.push({
        type: "warning",
        title: "High Portfolio Risk",
        description:
          "Your portfolio has significant exposure to volatile assets. Consider adding more stable investments like bonds.",
      });
    }

    const cryptoWeight = (metrics.typeAllocation["crypto"] || 0) / metrics.totalValue;
    if (cryptoWeight > 0.3) {
      insights.push({
        type: "warning",
        title: "Crypto Concentration Risk",
        description: `Cryptocurrency makes up ${(cryptoWeight * 100).toFixed(0)}% of your portfolio. Consider diversifying.`,
      });
    }

    if (metrics.diversificationScore < 50) {
      insights.push({
        type: "info",
        title: "Improve Diversification",
        description:
          "Your portfolio could benefit from more asset variety. Consider adding different sectors or asset types.",
      });
    }

    if (metrics.bestPerformer) {
      const gain =
        ((metrics.bestPerformer.currentPrice - metrics.bestPerformer.purchasePrice) /
          metrics.bestPerformer.purchasePrice) *
        100;
      if (gain > 20) {
        insights.push({
          type: "opportunity",
          title: "Consider Taking Profits",
          description: `${metrics.bestPerformer.symbol} is up ${gain.toFixed(1)}%. You might want to lock in some gains.`,
        });
      }
    }

    if (metrics.worstPerformer) {
      const loss =
        ((metrics.worstPerformer.currentPrice - metrics.worstPerformer.purchasePrice) /
          metrics.worstPerformer.purchasePrice) *
        100;
      if (loss < -15) {
        insights.push({
          type: "warning",
          title: "Review Underperforming Asset",
          description: `${metrics.worstPerformer.symbol} is down ${Math.abs(loss).toFixed(1)}%. Evaluate if it still fits your strategy.`,
        });
      }
    }

    if (metrics.diversificationScore > 70 && metrics.riskScore < 50) {
      insights.push({
        type: "success",
        title: "Well Balanced Portfolio",
        description:
          "Your portfolio shows good diversification and manageable risk levels. Keep up the good work!",
      });
    }

    const bondWeight = (metrics.typeAllocation["bond"] || 0) / metrics.totalValue;
    if (bondWeight === 0 && holdings.length > 2) {
      insights.push({
        type: "info",
        title: "Consider Fixed Income",
        description:
          "Adding bonds could help reduce volatility and provide steady income during market downturns.",
      });
    }

    return insights;
  };

  const fallbackInsights = generateRuleBasedInsights();
  const useFallback = !isPremium || aiInsightsFailed || !aiInsightsText;
  const insights = useFallback ? fallbackInsights : [];

  const getDiversificationBreakdown = () => {
    return Object.entries(metrics.typeAllocation).map(([type, value]) => ({
      type: type.charAt(0).toUpperCase() + type.slice(1).replace("_", " "),
      value,
      percentage: (value / metrics.totalValue) * 100,
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
        <SkeletonLoader height={80} style={{ marginBottom: Spacing.sm }} />
        <SkeletonLoader height={80} style={{ marginBottom: Spacing.sm }} />
      </ScrollView>
    );
  }

  if (holdings.length === 0) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: tabBarHeight + Spacing["5xl"],
          paddingHorizontal: Spacing.lg,
        }}
      >
        <EmptyState
          image={emptyInsightsImage}
          title="No insights yet"
          description="Add some holdings to get AI-powered insights about your portfolio"
        />
        
        <ThemedText type="h3" style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>
          AI Recommendations
        </ThemedText>
        {subscriptionLoading ? (
          <Card>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              Checking subscription...
            </ThemedText>
          </Card>
        ) : isPremium ? (
          <Card>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              Add holdings to receive personalized AI recommendations.
            </ThemedText>
          </Card>
        ) : (
          <Animated.View entering={FadeIn.delay(200).duration(400)}>
            <Card style={styles.premiumCard}>
              <View style={[styles.premiumIconContainer, { backgroundColor: `${theme.primary}20` }]}>
                <Feather name="star" size={24} color={theme.primary} />
              </View>
              <ThemedText type="h3" style={styles.premiumTitle}>
                Unlock AI Insights
              </ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginBottom: Spacing.lg }}>
                Get personalized portfolio recommendations powered by advanced AI analysis
              </ThemedText>
              <Button onPress={handleUpgrade} style={styles.upgradeButton}>
                Upgrade to Premium
              </Button>
            </Card>
          </Animated.View>
        )}
      </ScrollView>
    );
  }

  const breakdown = getDiversificationBreakdown();

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
          refreshing={isRefetching || fetchingAiInsights}
          onRefresh={onRefresh}
          tintColor={theme.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeIn.delay(100).duration(400)}>
        <Card style={styles.riskCard}>
          <ThemedText type="h3" style={styles.sectionTitle}>
            Risk Score
          </ThemedText>
          <View style={styles.riskGaugeContainer}>
            <RiskGauge score={Math.round(metrics.riskScore)} />
          </View>
          <View style={styles.riskLabels}>
            <ThemedText type="caption" style={{ color: theme.gainColor }}>
              Low
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.warning }}>
              Moderate
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.error }}>
              High
            </ThemedText>
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(200).duration(400)}>
        <Card style={styles.diversificationCard}>
          <View style={styles.diversificationHeader}>
            <ThemedText type="h3">Asset Breakdown</ThemedText>
            <View style={styles.scoreChip}>
              <ThemedText type="caption" style={{ color: theme.primary }}>
                Score: {metrics.diversificationScore.toFixed(0)}
              </ThemedText>
            </View>
          </View>
          {breakdown.map((item, index) => (
            <View key={item.type} style={styles.breakdownItem}>
              <View style={styles.breakdownLabel}>
                <ThemedText type="body">{item.type}</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  ${item.value.toLocaleString("en-US", { minimumFractionDigits: 0 })}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.breakdownBar,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <View
                  style={[
                    styles.breakdownFill,
                    {
                      width: `${item.percentage}%`,
                      backgroundColor: theme.primary,
                    },
                  ]}
                />
              </View>
              <ThemedText
                type="caption"
                style={[styles.breakdownPercent, { fontFamily: Fonts?.mono }]}
              >
                {item.percentage.toFixed(1)}%
              </ThemedText>
            </View>
          ))}
        </Card>
      </Animated.View>

      <ThemedText type="h3" style={styles.sectionTitle}>
        AI Recommendations
      </ThemedText>
      {subscriptionLoading ? (
        <Card>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            Checking subscription...
          </ThemedText>
        </Card>
      ) : isPremium ? (
        loadingAiInsights ? (
          <Card>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              Generating AI insights with live data...
            </ThemedText>
          </Card>
        ) : !useFallback && aiInsightsText ? (
          <Card>
            <ThemedText type="body" style={{ lineHeight: 22 }}>
              {aiInsightsText}
            </ThemedText>
          </Card>
        ) : insights.length > 0 ? (
          insights.map((insight, index) => (
            <InsightCard
              key={index}
              type={insight.type}
              title={insight.title}
              description={insight.description}
              delay={400 + index * 100}
            />
          ))
        ) : (
          <Card>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              No specific recommendations at this time. Your portfolio looks balanced!
            </ThemedText>
          </Card>
        )
      ) : (
        <Animated.View entering={FadeIn.delay(400).duration(400)}>
          <Card style={styles.premiumCard}>
            <View style={[styles.premiumIconContainer, { backgroundColor: `${theme.primary}20` }]}>
              <Feather name="star" size={24} color={theme.primary} />
            </View>
            <ThemedText type="h3" style={styles.premiumTitle}>
              Unlock AI Insights
            </ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginBottom: Spacing.lg }}>
              Get live portfolio insights with cited market data and research tools
            </ThemedText>
            <Button onPress={handleUpgrade} style={styles.upgradeButton}>
              Upgrade to Premium
            </Button>
          </Card>
        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  riskCard: {
    marginBottom: Spacing.lg,
    alignItems: "center",
  },
  riskGaugeContainer: {
    marginVertical: Spacing.lg,
  },
  riskLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: Spacing["2xl"],
  },
  diversificationCard: {
    marginBottom: Spacing.lg,
  },
  diversificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  scoreChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(27, 67, 50, 0.1)",
  },
  breakdownItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  breakdownLabel: {
    width: 100,
  },
  breakdownBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    marginHorizontal: Spacing.sm,
    overflow: "hidden",
  },
  breakdownFill: {
    height: "100%",
    borderRadius: 4,
  },
  breakdownPercent: {
    width: 50,
    textAlign: "right",
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  premiumCard: {
    alignItems: "center",
    padding: Spacing.xl,
  },
  premiumIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  premiumTitle: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  upgradeButton: {
    width: "100%",
  },
});
