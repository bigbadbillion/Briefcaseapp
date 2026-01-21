import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Alert,
  Switch,
  Pressable,
  Modal,
  Platform,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Fonts } from "@/constants/theme";
import {
  getHoldings,
  calculatePortfolioMetrics,
  clearAllHoldings,
  Holding,
} from "@/lib/storage";

const CURRENCY_STORAGE_KEY = "@briefcase/currency";
const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "\u20AC", name: "Euro" },
  { code: "GBP", symbol: "\u00A3", name: "British Pound" },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();

  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationPermission, setNotificationPermission] =
    useState<Notifications.PermissionStatus | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  const loadData = useCallback(async () => {
    const data = await getHoldings();
    setHoldings(data);

    const permission = await Notifications.getPermissionsAsync();
    setNotificationPermission(permission.status);
    setNotificationsEnabled(permission.status === "granted");

    const storedCurrency = await AsyncStorage.getItem(CURRENCY_STORAGE_KEY);
    if (storedCurrency) {
      setSelectedCurrency(storedCurrency);
    }

    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const metrics = calculatePortfolioMetrics(holdings);

  const handleNotificationToggle = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (notificationsEnabled) {
      setNotificationsEnabled(false);
      return;
    }

    const permission = await Notifications.getPermissionsAsync();

    if (permission.status === "granted") {
      setNotificationsEnabled(true);
      setNotificationPermission("granted");
    } else if (permission.status === "denied" && !permission.canAskAgain) {
      Alert.alert(
        "Enable Notifications",
        "Notification permissions were denied. Please enable them in your device settings.",
        [
          { text: "Cancel", style: "cancel" },
          Platform.OS !== "web"
            ? {
                text: "Open Settings",
                onPress: async () => {
                  try {
                    await Linking.openSettings();
                  } catch (error) {}
                },
              }
            : { text: "OK" },
        ].filter(Boolean)
      );
    } else {
      const { status } = await Notifications.requestPermissionsAsync();
      setNotificationPermission(status);
      setNotificationsEnabled(status === "granted");

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Enable notifications to receive portfolio alerts and market updates."
        );
      }
    }
  };

  const handleCurrencySelect = async (currencyCode: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCurrency(currencyCode);
    await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, currencyCode);
    setShowCurrencyPicker(false);
  };

  const handleClearData = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Clear All Data",
      "This will permanently delete all your holdings. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await clearAllHoldings();
            setHoldings([]);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const currencySymbol =
    CURRENCIES.find((c) => c.code === selectedCurrency)?.symbol || "$";

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: tabBarHeight + Spacing["5xl"],
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.delay(100).duration(400)}>
          <View style={styles.profileHeader}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: theme.primary },
              ]}
            >
              <Feather name="user" size={40} color="#FFFFFF" />
            </View>
            <ThemedText type="h1" style={styles.userName}>
              Investor
            </ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              Portfolio Manager
            </ThemedText>
          </View>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(200).duration(400)}>
          <Card style={styles.statsCard}>
            <ThemedText type="h3" style={styles.sectionTitle}>
              Portfolio Summary
            </ThemedText>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary }}
                >
                  Total Value
                </ThemedText>
                <ThemedText type="h3" style={{ fontFamily: Fonts?.mono }}>
                  {currencySymbol}
                  {metrics.totalValue.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary }}
                >
                  Holdings
                </ThemedText>
                <ThemedText type="h3" style={{ fontFamily: Fonts?.mono }}>
                  {holdings.length}
                </ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary }}
                >
                  Total Gain/Loss
                </ThemedText>
                <ThemedText
                  type="h3"
                  style={{
                    fontFamily: Fonts?.mono,
                    color:
                      metrics.totalGainLoss >= 0
                        ? theme.gainColor
                        : theme.lossColor,
                  }}
                >
                  {metrics.totalGainLoss >= 0 ? "+" : ""}
                  {currencySymbol}
                  {Math.abs(metrics.totalGainLoss).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary }}
                >
                  Risk Score
                </ThemedText>
                <ThemedText type="h3" style={{ fontFamily: Fonts?.mono }}>
                  {metrics.riskScore.toFixed(0)}/100
                </ThemedText>
              </View>
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(300).duration(400)}>
          <Card style={styles.themeCard}>
            <ThemedText type="h3" style={styles.sectionTitle}>
              Appearance
            </ThemedText>
            <ThemeToggle />
          </Card>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(400).duration(400)}>
          <Card style={styles.settingsCard}>
            <ThemedText type="h3" style={styles.sectionTitle}>
              Settings
            </ThemedText>

            <View style={styles.settingsRow}>
              <View style={styles.settingsRowLeft}>
                <View
                  style={[
                    styles.settingsIcon,
                    { backgroundColor: theme.backgroundSecondary },
                  ]}
                >
                  <Feather name="bell" size={16} color={theme.primary} />
                </View>
                <ThemedText type="body">Notifications</ThemedText>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleNotificationToggle}
                trackColor={{
                  false: theme.backgroundSecondary,
                  true: theme.primary,
                }}
                thumbColor="#FFFFFF"
              />
            </View>

            <SettingsRow
              icon="shield"
              label="Privacy"
              value="Standard"
              theme={theme}
            />

            <Pressable
              onPress={() => setShowCurrencyPicker(true)}
              style={({ pressed }) => [
                styles.settingsRow,
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={styles.settingsRowLeft}>
                <View
                  style={[
                    styles.settingsIcon,
                    { backgroundColor: theme.backgroundSecondary },
                  ]}
                >
                  <Feather name="globe" size={16} color={theme.primary} />
                </View>
                <ThemedText type="body">Currency</ThemedText>
              </View>
              <View style={styles.settingsRowRight}>
                <ThemedText type="body" style={{ color: theme.textSecondary }}>
                  {selectedCurrency}
                </ThemedText>
                <Feather
                  name="chevron-right"
                  size={18}
                  color={theme.textSecondary}
                  style={{ marginLeft: Spacing.xs }}
                />
              </View>
            </Pressable>

            <SettingsRow
              icon="info"
              label="App Version"
              value="1.0.0"
              theme={theme}
              showChevron={false}
            />
          </Card>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(500).duration(400)}>
          <Card style={styles.dangerCard}>
            <ThemedText
              type="h3"
              style={[styles.sectionTitle, { color: theme.error }]}
            >
              Danger Zone
            </ThemedText>
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, marginBottom: Spacing.lg }}
            >
              These actions are permanent and cannot be undone.
            </ThemedText>
            <Button variant="danger" onPress={handleClearData}>
              Clear All Data
            </Button>
          </Card>
        </Animated.View>

        <View style={styles.footer}>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, textAlign: "center" }}
          >
            Briefcase v1.0.0
          </ThemedText>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, textAlign: "center" }}
          >
            Built for Gemini Hackathon
          </ThemedText>
        </View>
      </ScrollView>

      <Modal
        visible={showCurrencyPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCurrencyPicker(false)}
      >
        <Pressable
          style={[
            styles.modalOverlay,
            { backgroundColor: "rgba(0,0,0,0.5)" },
          ]}
          onPress={() => setShowCurrencyPicker(false)}
        >
          <Pressable
            style={[
              styles.currencyModal,
              { backgroundColor: theme.backgroundSurface },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <ThemedText type="h2" style={styles.modalTitle}>
              Select Currency
            </ThemedText>
            {CURRENCIES.map((currency) => (
              <Pressable
                key={currency.code}
                style={({ pressed }) => [
                  styles.currencyOption,
                  { borderBottomColor: theme.backgroundSecondary },
                  selectedCurrency === currency.code && {
                    backgroundColor: theme.backgroundSecondary,
                  },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => handleCurrencySelect(currency.code)}
              >
                <View style={styles.currencyInfo}>
                  <ThemedText type="h3">{currency.symbol}</ThemedText>
                  <View style={{ marginLeft: Spacing.md }}>
                    <ThemedText type="body">{currency.code}</ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textSecondary }}
                    >
                      {currency.name}
                    </ThemedText>
                  </View>
                </View>
                {selectedCurrency === currency.code ? (
                  <Feather name="check" size={20} color={theme.primary} />
                ) : null}
              </Pressable>
            ))}
            <Button
              variant="secondary"
              onPress={() => setShowCurrencyPicker(false)}
              style={{ marginTop: Spacing.lg }}
            >
              Cancel
            </Button>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function SettingsRow({
  icon,
  label,
  value,
  theme,
  showChevron = true,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  theme: any;
  showChevron?: boolean;
}) {
  return (
    <View style={styles.settingsRow}>
      <View style={styles.settingsRowLeft}>
        <View
          style={[
            styles.settingsIcon,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <Feather name={icon} size={16} color={theme.primary} />
        </View>
        <ThemedText type="body">{label}</ThemedText>
      </View>
      <View style={styles.settingsRowRight}>
        <ThemedText type="body" style={{ color: theme.textSecondary }}>
          {value}
        </ThemedText>
        {showChevron ? (
          <Feather
            name="chevron-right"
            size={18}
            color={theme.textSecondary}
            style={{ marginLeft: Spacing.xs }}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  userName: {
    marginBottom: Spacing.xs,
  },
  statsCard: {
    marginBottom: Spacing.lg,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  statItem: {
    width: "50%",
    marginBottom: Spacing.md,
  },
  themeCard: {
    marginBottom: Spacing.lg,
  },
  settingsCard: {
    marginBottom: Spacing.lg,
  },
  settingsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  settingsRowLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingsRowRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingsIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  dangerCard: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  footer: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  currencyModal: {
    width: "100%",
    maxWidth: 400,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  modalTitle: {
    marginBottom: Spacing.lg,
    textAlign: "center",
  },
  currencyOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderRadius: BorderRadius.md,
  },
  currencyInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
});
