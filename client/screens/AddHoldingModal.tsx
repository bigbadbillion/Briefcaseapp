import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Fonts } from "@/constants/theme";
import { saveHolding, Holding } from "@/lib/storage";
import {
  searchAssets,
  getPopularAssets,
  fetchAssetPrice,
  type AssetSearchResult,
} from "@/lib/assetSearchService";

type AssetType = Holding["type"];

const ASSET_TYPES: { type: AssetType; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { type: "stock", label: "Stock", icon: "trending-up" },
  { type: "crypto", label: "Crypto", icon: "dollar-sign" },
  { type: "etf", label: "ETF", icon: "layers" },
  { type: "bond", label: "Bond", icon: "file-text" },
  { type: "real_estate", label: "Real Estate", icon: "home" },
  { type: "commodity", label: "Commodity", icon: "box" },
  { type: "cash", label: "Cash", icon: "credit-card" },
];

export default function AddHoldingModal() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const [type, setType] = useState<AssetType>("stock");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AssetSearchResult[]>([]);
  const [popularAssets, setPopularAssets] = useState<AssetSearchResult[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<AssetSearchResult | null>(null);
  const [quantity, setQuantity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    loadPopularAssets(type);
    setSelectedAsset(null);
    setSearchQuery("");
    setSearchResults([]);
    setCurrentPrice("");
    setShowSearch(false);
  }, [type]);

  const loadPopularAssets = async (assetType: string) => {
    const assets = await getPopularAssets(assetType);
    setPopularAssets(assets);
  };

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);

      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }

      if (!query.trim()) {
        setSearchResults([]);
        setSearching(false);
        return;
      }

      setSearching(true);
      searchTimeout.current = setTimeout(async () => {
        const results = await searchAssets(query, type);
        setSearchResults(results);
        setSearching(false);
      }, 300);
    },
    [type]
  );

  const handleSelectAsset = async (asset: AssetSearchResult) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedAsset(asset);
    setSearchQuery("");
    setSearchResults([]);
    setShowSearch(false);

    if (asset.type === "crypto" || asset.type === "stock" || asset.type === "etf") {
      setFetchingPrice(true);
      const price = await fetchAssetPrice(asset.symbol, asset.type, asset.id);
      if (price !== null) {
        setCurrentPrice(price.toFixed(2));
      }
      setFetchingPrice(false);
    }
  };

  const handleTypeSelect = (assetType: AssetType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setType(assetType);
    setSelectedAsset(null);
  };

  const isValid =
    selectedAsset !== null &&
    parseFloat(quantity) > 0 &&
    parseFloat(purchasePrice) > 0 &&
    parseFloat(currentPrice) > 0;

  const handleSave = async () => {
    if (!isValid || !selectedAsset) return;

    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await saveHolding({
        name: selectedAsset.name,
        symbol: selectedAsset.symbol.toUpperCase(),
        type: selectedAsset.type,
        quantity: parseFloat(quantity),
        purchasePrice: parseFloat(purchasePrice),
        currentPrice: parseFloat(currentPrice),
        purchaseDate: new Date().toISOString().split("T")[0],
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Failed to save holding. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.backgroundSecondary,
      color: theme.text,
      borderColor: isDark ? theme.border : "transparent",
      borderWidth: isDark ? 1 : 0,
      fontFamily: Fonts?.sans,
    },
  ];

  const renderAssetChip = (asset: AssetSearchResult, index: number) => (
    <Animated.View
      key={`${asset.id}-${asset.symbol}`}
      entering={FadeInDown.delay(index * 30).duration(200)}
    >
      <Pressable
        onPress={() => handleSelectAsset(asset)}
        style={[
          styles.assetChip,
          {
            backgroundColor: theme.backgroundSecondary,
            borderColor: isDark ? theme.border : "transparent",
            borderWidth: isDark ? 1 : 0,
          },
        ]}
      >
        <ThemedText type="caption" style={styles.chipSymbol}>
          {asset.symbol}
        </ThemedText>
        <ThemedText
          type="small"
          style={{ color: theme.textSecondary }}
          numberOfLines={1}
        >
          {asset.name}
        </ThemedText>
      </Pressable>
    </Animated.View>
  );

  const renderSearchResult = ({ item }: { item: AssetSearchResult }) => (
    <Pressable
      onPress={() => handleSelectAsset(item)}
      style={[
        styles.searchResultItem,
        { borderBottomColor: theme.border },
      ]}
    >
      <View style={styles.searchResultContent}>
        <ThemedText type="body" style={{ fontWeight: "600" }}>
          {item.symbol}
        </ThemedText>
        <ThemedText
          type="caption"
          style={{ color: theme.textSecondary }}
          numberOfLines={1}
        >
          {item.name}
        </ThemedText>
      </View>
      <Feather name="plus" size={18} color={theme.primary} />
    </Pressable>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: Spacing.lg,
        paddingBottom: insets.bottom + Spacing["3xl"],
        paddingHorizontal: Spacing.lg,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeIn.duration(300)}>
        <ThemedText type="h3" style={styles.sectionTitle}>
          Asset Type
        </ThemedText>
        <View style={styles.typeGrid}>
          {ASSET_TYPES.map((assetType, index) => (
            <Animated.View
              key={assetType.type}
              entering={FadeInDown.delay(index * 50).duration(300)}
              style={styles.typeItem}
            >
              <Pressable
                onPress={() => handleTypeSelect(assetType.type)}
                style={[
                  styles.typeButton,
                  {
                    backgroundColor:
                      type === assetType.type
                        ? theme.primary
                        : theme.backgroundSecondary,
                    borderColor:
                      type === assetType.type
                        ? theme.primary
                        : isDark
                        ? theme.border
                        : "transparent",
                    borderWidth: isDark ? 1 : 0,
                  },
                ]}
              >
                <Feather
                  name={assetType.icon}
                  size={20}
                  color={type === assetType.type ? "#FFFFFF" : theme.textSecondary}
                />
                <ThemedText
                  type="caption"
                  style={[
                    styles.typeLabel,
                    { color: type === assetType.type ? "#FFFFFF" : theme.text },
                  ]}
                >
                  {assetType.label}
                </ThemedText>
              </Pressable>
            </Animated.View>
          ))}
        </View>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(150).duration(300)}>
        <ThemedText type="h3" style={styles.sectionTitle}>
          Select Asset
        </ThemedText>

        {selectedAsset ? (
          <Card style={styles.selectedAssetCard}>
            <View style={styles.selectedAssetContent}>
              <View>
                <ThemedText type="h4">{selectedAsset.symbol}</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  {selectedAsset.name}
                </ThemedText>
              </View>
              <Pressable
                onPress={() => {
                  setSelectedAsset(null);
                  setCurrentPrice("");
                }}
                style={[styles.changeButton, { backgroundColor: theme.backgroundTertiary }]}
              >
                <ThemedText type="caption" style={{ color: theme.primary }}>
                  Change
                </ThemedText>
              </Pressable>
            </View>
            {fetchingPrice ? (
              <View style={styles.priceLoading}>
                <ActivityIndicator size="small" color={theme.primary} />
                <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: Spacing.sm }}>
                  Fetching current price...
                </ThemedText>
              </View>
            ) : currentPrice ? (
              <View style={styles.pricePreview}>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Current Price
                </ThemedText>
                <ThemedText type="h4" style={{ color: theme.gainColor, fontFamily: Fonts?.mono }}>
                  ${parseFloat(currentPrice).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </ThemedText>
              </View>
            ) : null}
          </Card>
        ) : (
          <>
            {showSearch ? (
              <View style={styles.searchContainer}>
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
                    placeholder={`Search ${ASSET_TYPES.find((t) => t.type === type)?.label || "assets"}...`}
                    placeholderTextColor={theme.textSecondary}
                    value={searchQuery}
                    onChangeText={handleSearch}
                    autoFocus
                  />
                  {searching ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : searchQuery ? (
                    <Pressable onPress={() => handleSearch("")}>
                      <Feather name="x" size={18} color={theme.textSecondary} />
                    </Pressable>
                  ) : null}
                </View>

                <Pressable
                  onPress={() => {
                    setShowSearch(false);
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  style={styles.cancelSearch}
                >
                  <ThemedText type="caption" style={{ color: theme.primary }}>
                    Cancel
                  </ThemedText>
                </Pressable>
              </View>
            ) : null}

            {showSearch && searchResults.length > 0 ? (
              <Card style={styles.searchResultsCard}>
                <FlatList
                  data={searchResults}
                  keyExtractor={(item) => `${item.id}-${item.symbol}`}
                  renderItem={renderSearchResult}
                  scrollEnabled={false}
                />
              </Card>
            ) : null}

            {!showSearch ? (
              <>
                <Pressable
                  onPress={() => setShowSearch(true)}
                  style={[
                    styles.searchTrigger,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      borderColor: isDark ? theme.border : "transparent",
                      borderWidth: isDark ? 1 : 0,
                    },
                  ]}
                >
                  <Feather name="search" size={18} color={theme.textSecondary} />
                  <ThemedText type="body" style={{ color: theme.textSecondary, marginLeft: Spacing.sm }}>
                    Search for {ASSET_TYPES.find((t) => t.type === type)?.label || "asset"}...
                  </ThemedText>
                </Pressable>

                {popularAssets.length > 0 ? (
                  <View style={styles.popularSection}>
                    <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>
                      Popular {ASSET_TYPES.find((t) => t.type === type)?.label}s
                    </ThemedText>
                    <View style={styles.chipsContainer}>
                      {popularAssets.slice(0, 8).map((asset, index) => renderAssetChip(asset, index))}
                    </View>
                  </View>
                ) : null}
              </>
            ) : null}
          </>
        )}
      </Animated.View>

      {selectedAsset ? (
        <Animated.View entering={FadeIn.delay(200).duration(300)}>
          <ThemedText type="h3" style={styles.sectionTitle}>
            Details
          </ThemedText>
          <Card style={styles.formCard}>
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.sm }]}>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Quantity
                </ThemedText>
                <TextInput
                  style={inputStyle}
                  placeholder="0"
                  placeholderTextColor={theme.textSecondary}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Purchase Price ($)
                </ThemedText>
                <TextInput
                  style={inputStyle}
                  placeholder="0.00"
                  placeholderTextColor={theme.textSecondary}
                  value={purchasePrice}
                  onChangeText={setPurchasePrice}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {!currentPrice && !fetchingPrice ? (
              <View style={styles.inputGroup}>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Current Price ($)
                </ThemedText>
                <TextInput
                  style={inputStyle}
                  placeholder="0.00"
                  placeholderTextColor={theme.textSecondary}
                  value={currentPrice}
                  onChangeText={setCurrentPrice}
                  keyboardType="decimal-pad"
                />
              </View>
            ) : null}
          </Card>
        </Animated.View>
      ) : null}

      {isValid ? (
        <Animated.View entering={FadeIn.delay(100).duration(300)}>
          <Card style={styles.previewCard}>
            <View style={styles.previewRow}>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Total Value
              </ThemedText>
              <ThemedText type="h3" style={{ fontFamily: Fonts?.mono }}>
                $
                {(parseFloat(quantity) * parseFloat(currentPrice)).toLocaleString(
                  "en-US",
                  { minimumFractionDigits: 2 }
                )}
              </ThemedText>
            </View>
            <View style={styles.previewRow}>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Gain/Loss
              </ThemedText>
              <ThemedText
                type="h4"
                style={{
                  fontFamily: Fonts?.mono,
                  color:
                    parseFloat(currentPrice) >= parseFloat(purchasePrice)
                      ? theme.gainColor
                      : theme.lossColor,
                }}
              >
                {parseFloat(currentPrice) >= parseFloat(purchasePrice) ? "+" : ""}
                {(
                  ((parseFloat(currentPrice) - parseFloat(purchasePrice)) /
                    parseFloat(purchasePrice)) *
                  100
                ).toFixed(2)}
                %
              </ThemedText>
            </View>
          </Card>
        </Animated.View>
      ) : null}

      <View style={styles.buttonContainer}>
        <Button
          variant="secondary"
          onPress={() => navigation.goBack()}
          style={{ flex: 1, marginRight: Spacing.sm }}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onPress={handleSave}
          disabled={!isValid || saving}
          style={{ flex: 1 }}
        >
          {saving ? "Saving..." : "Add Holding"}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -Spacing.xs,
  },
  typeItem: {
    width: "25%",
    padding: Spacing.xs,
  },
  typeButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  typeLabel: {
    marginTop: Spacing.xs,
    fontWeight: "500",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: Spacing.sm,
  },
  cancelSearch: {
    padding: Spacing.sm,
  },
  searchTrigger: {
    flexDirection: "row",
    alignItems: "center",
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
  },
  popularSection: {
    marginTop: Spacing.lg,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  assetChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    minWidth: 80,
  },
  chipSymbol: {
    fontWeight: "600",
  },
  searchResultsCard: {
    marginTop: Spacing.sm,
    maxHeight: 300,
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchResultContent: {
    flex: 1,
    marginRight: Spacing.md,
  },
  selectedAssetCard: {
    marginBottom: Spacing.sm,
  },
  selectedAssetContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  changeButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  priceLoading: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pricePreview: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  formCard: {
    marginBottom: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputRow: {
    flexDirection: "row",
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.xs,
    fontSize: 16,
  },
  previewCard: {
    marginBottom: Spacing.lg,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  buttonContainer: {
    flexDirection: "row",
  },
});
