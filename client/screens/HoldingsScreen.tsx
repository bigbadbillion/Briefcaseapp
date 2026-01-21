import React, { useState, useCallback } from "react";
import { StyleSheet, View, FlatList, TextInput, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeIn, FadeInDown, Layout } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";

import { HoldingItem } from "@/components/HoldingItem";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Fonts } from "@/constants/theme";
import { getHoldings, Holding, initializeSampleData } from "@/lib/storage";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const emptyPortfolioImage = require("../assets/images/empty-portfolio.png");

export default function HoldingsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const filteredHoldings = holdings.filter(
    (h) =>
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedHoldings = filteredHoldings.reduce((acc, holding) => {
    const type = holding.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(holding);
    return acc;
  }, {} as Record<string, Holding[]>);

  const sections = Object.entries(groupedHoldings).map(([type, items]) => ({
    type,
    title: type.charAt(0).toUpperCase() + type.slice(1).replace("_", " "),
    data: items,
    totalValue: items.reduce((sum, h) => sum + h.currentPrice * h.quantity, 0),
  }));

  sections.sort((a, b) => b.totalValue - a.totalValue);

  const renderHeader = () => (
    <Animated.View entering={FadeIn.duration(300)} style={styles.searchContainer}>
      <View
        style={[
          styles.searchInputContainer,
          {
            backgroundColor: theme.backgroundSecondary,
            borderColor: isDark ? theme.border : "transparent",
            borderWidth: isDark ? 1 : 0,
          },
        ]}
      >
        <Feather name="search" size={18} color={theme.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text, fontFamily: Fonts?.sans }]}
          placeholder="Search holdings..."
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 ? (
          <Feather
            name="x"
            size={18}
            color={theme.textSecondary}
            onPress={() => setSearchQuery("")}
          />
        ) : null}
      </View>
    </Animated.View>
  );

  const renderSectionList = () => {
    return sections.map((section, sectionIndex) => (
      <Animated.View
        key={section.type}
        entering={FadeIn.delay(sectionIndex * 100).duration(300)}
        style={styles.section}
      >
        <View style={styles.sectionHeader}>
          <ThemedText type="h4">{section.title}</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            ${section.totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </ThemedText>
        </View>
        {section.data.map((item, index) => {
          const change = item.currentPrice - item.purchasePrice;
          const changePercent =
            ((item.currentPrice - item.purchasePrice) / item.purchasePrice) * 100;

          return (
            <Animated.View
              key={item.id}
              entering={FadeInDown.delay(index * 50).duration(300)}
              layout={Layout.springify()}
            >
              <HoldingItem
                name={item.name}
                symbol={item.symbol}
                value={item.currentPrice * item.quantity}
                quantity={item.quantity}
                change={change}
                changePercent={changePercent}
                type={item.type}
                onPress={() => navigation.navigate("AssetDetail", { id: item.id })}
              />
            </Animated.View>
          );
        })}
      </Animated.View>
    ));
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View
          style={{
            paddingTop: headerHeight + Spacing.xl,
            paddingHorizontal: Spacing.lg,
          }}
        >
          <SkeletonLoader height={48} style={{ marginBottom: Spacing.lg }} />
          {[1, 2, 3, 4].map((i) => (
            <SkeletonLoader
              key={i}
              height={76}
              style={{ marginBottom: Spacing.sm }}
            />
          ))}
        </View>
      </View>
    );
  }

  return (
    <FlatList
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.xl,
        paddingBottom: tabBarHeight + Spacing["5xl"],
        paddingHorizontal: Spacing.lg,
        flexGrow: 1,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      data={[]}
      renderItem={() => null}
      ListHeaderComponent={
        <>
          {renderHeader()}
          {holdings.length > 0 ? (
            renderSectionList()
          ) : (
            <EmptyState
              image={emptyPortfolioImage}
              title="No holdings yet"
              description="Add your first investment to start tracking your portfolio"
              actionLabel="Add Holding"
              onAction={() => navigation.navigate("AddHoldingModal")}
            />
          )}
        </>
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    marginBottom: Spacing.lg,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    height: 48,
    borderRadius: BorderRadius.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: 16,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
});
