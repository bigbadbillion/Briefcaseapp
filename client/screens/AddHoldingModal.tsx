import React, { useState } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
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

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [type, setType] = useState<AssetType>("stock");
  const [quantity, setQuantity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [saving, setSaving] = useState(false);

  const isValid =
    name.trim().length > 0 &&
    symbol.trim().length > 0 &&
    parseFloat(quantity) > 0 &&
    parseFloat(purchasePrice) > 0 &&
    parseFloat(currentPrice) > 0;

  const handleSave = async () => {
    if (!isValid) return;

    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await saveHolding({
        name: name.trim(),
        symbol: symbol.trim().toUpperCase(),
        type,
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
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setType(assetType.type);
                }}
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

      <Animated.View entering={FadeIn.delay(200).duration(300)}>
        <ThemedText type="h3" style={styles.sectionTitle}>
          Details
        </ThemedText>
        <Card style={styles.formCard}>
          <View style={styles.inputGroup}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Asset Name
            </ThemedText>
            <TextInput
              style={inputStyle}
              placeholder="e.g., Apple Inc."
              placeholderTextColor={theme.textSecondary}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Symbol / Ticker
            </ThemedText>
            <TextInput
              style={inputStyle}
              placeholder="e.g., AAPL"
              placeholderTextColor={theme.textSecondary}
              value={symbol}
              onChangeText={setSymbol}
              autoCapitalize="characters"
            />
          </View>

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
        </Card>
      </Animated.View>

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
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: Spacing.lg,
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
