import React, { useState } from "react";
import { StyleSheet, View, ScrollView, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeIn } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { PortfolioChart } from "@/components/PortfolioChart";
import { TimeRangeSelector } from "@/components/TimeRangeSelector";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Fonts } from "@/constants/theme";
import { useHoldings, useDeleteHolding, Holding } from "@/hooks/useHoldings";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type TimeRange = "1D" | "1W" | "1M" | "3M" | "1Y" | "ALL";

const TYPE_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  stock: "trending-up",
  crypto: "dollar-sign",
  etf: "layers",
  bond: "file-text",
  real_estate: "home",
  commodity: "box",
  cash: "credit-card",
};

export default function AssetDetailScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "AssetDetail">>();
  const { id } = route.params;

  const { data: holdings = [], isLoading: loading } = useHoldings();
  const deleteHolding = useDeleteHolding();
  const [timeRange, setTimeRange] = useState<TimeRange>("1M");

  const holding = holdings.find((h) => h.id === id) || null;

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Delete Holding",
      `Are you sure you want to delete ${holding?.name}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteHolding.mutateAsync(id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            navigation.goBack();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]} />
    );
  }

  if (!holding) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: theme.backgroundRoot, paddingTop: headerHeight },
        ]}
      >
        <Feather name="alert-circle" size={48} color={theme.textSecondary} />
        <ThemedText type="h3" style={{ marginTop: Spacing.lg }}>
          Asset not found
        </ThemedText>
        <Button onPress={() => navigation.goBack()} style={{ marginTop: Spacing.lg }}>
          Go Back
        </Button>
      </View>
    );
  }

  const totalValue = holding.currentPrice * holding.quantity;
  const totalCost = holding.purchasePrice * holding.quantity;
  const gainLoss = totalValue - totalCost;
  const gainLossPercent = ((holding.currentPrice - holding.purchasePrice) / holding.purchasePrice) * 100;
  const isPositive = gainLoss >= 0;

  const generateChartData = () => {
    const points = 30;
    const baseValue = holding.purchasePrice * 0.9;
    const data = [];
    for (let i = 0; i < points; i++) {
      const progress = i / (points - 1);
      const trend = progress * (holding.currentPrice - baseValue);
      const noise = (Math.random() - 0.5) * holding.currentPrice * 0.05;
      data.push(baseValue + trend + noise);
    }
    return data;
  };

  const icon = TYPE_ICONS[holding.type] || "circle";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.xl,
        paddingBottom: insets.bottom + Spacing["3xl"],
        paddingHorizontal: Spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeIn.duration(400)}>
        <View style={styles.header}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather name={icon} size={28} color={theme.primary} />
          </View>
          <View style={styles.headerInfo}>
            <ThemedText type="h1">{holding.symbol}</ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              {holding.name}
            </ThemedText>
          </View>
          <View
            style={[
              styles.typeChip,
              { backgroundColor: `${theme.primary}20` },
            ]}
          >
            <ThemedText type="caption" style={{ color: theme.primary }}>
              {holding.type.charAt(0).toUpperCase() + holding.type.slice(1).replace("_", " ")}
            </ThemedText>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(100).duration(400)}>
        <Card style={styles.valueCard}>
          <View style={styles.valueRow}>
            <View>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Current Value
              </ThemedText>
              <ThemedText type="display" style={{ fontFamily: Fonts?.mono }}>
                ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </ThemedText>
            </View>
            <View style={styles.changeContainer}>
              <Feather
                name={isPositive ? "trending-up" : "trending-down"}
                size={20}
                color={isPositive ? theme.gainColor : theme.lossColor}
              />
              <ThemedText
                type="h3"
                style={[
                  styles.changeText,
                  { color: isPositive ? theme.gainColor : theme.lossColor },
                ]}
              >
                {isPositive ? "+" : ""}
                {gainLossPercent.toFixed(2)}%
              </ThemedText>
            </View>
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(200).duration(400)}>
        <Card style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <ThemedText type="h3">Price History</ThemedText>
            <ThemedText type="body" style={{ fontFamily: Fonts?.mono }}>
              ${holding.currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </ThemedText>
          </View>
          <TimeRangeSelector selected={timeRange} onSelect={setTimeRange} />
          <View style={styles.chartContainer}>
            <PortfolioChart data={generateChartData()} height={160} />
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(300).duration(400)}>
        <Card style={styles.detailsCard}>
          <ThemedText type="h3" style={styles.sectionTitle}>
            Position Details
          </ThemedText>
          <DetailRow
            label="Quantity"
            value={holding.quantity.toLocaleString()}
            theme={theme}
          />
          <DetailRow
            label="Purchase Price"
            value={`$${holding.purchasePrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
            theme={theme}
          />
          <DetailRow
            label="Current Price"
            value={`$${holding.currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
            theme={theme}
          />
          <DetailRow
            label="Total Cost"
            value={`$${totalCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
            theme={theme}
          />
          <DetailRow
            label="Gain/Loss"
            value={`${isPositive ? "+" : ""}$${Math.abs(gainLoss).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
            valueColor={isPositive ? theme.gainColor : theme.lossColor}
            theme={theme}
          />
          <DetailRow
            label="Purchase Date"
            value={new Date(holding.purchaseDate).toLocaleDateString()}
            theme={theme}
            noBorder
          />
        </Card>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(400).duration(400)}>
        <Button variant="danger" onPress={handleDelete}>
          Delete Holding
        </Button>
      </Animated.View>
    </ScrollView>
  );
}

function DetailRow({
  label,
  value,
  valueColor,
  theme,
  noBorder = false,
}: {
  label: string;
  value: string;
  valueColor?: string;
  theme: any;
  noBorder?: boolean;
}) {
  return (
    <View
      style={[
        styles.detailRow,
        !noBorder && { borderBottomColor: theme.border, borderBottomWidth: 1 },
      ]}
    >
      <ThemedText type="body" style={{ color: theme.textSecondary }}>
        {label}
      </ThemedText>
      <ThemedText
        type="body"
        style={[{ fontFamily: Fonts?.mono }, valueColor ? { color: valueColor } : null]}
      >
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  headerInfo: {
    flex: 1,
  },
  typeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  valueCard: {
    marginBottom: Spacing.lg,
  },
  valueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  changeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  changeText: {
    marginLeft: Spacing.xs,
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
  detailsCard: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
});
