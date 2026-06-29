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
  TextInput,
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
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, Fonts } from "@/constants/theme";
import { useHoldings, useClearAllHoldings, calculatePortfolioMetrics, Holding } from "@/hooks/useHoldings";

const CURRENCY_STORAGE_KEY = "@briefcase/currency";
const NOTIFICATIONS_STORAGE_KEY = "@briefcase/notifications";
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
  const { user, signOut, updateProfile, deleteAccount } = useAuth();

  const { data: holdings = [], isLoading: loading, refetch: refetchHoldings } = useHoldings();
  const clearAllHoldings = useClearAllHoldings();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationPermission, setNotificationPermission] =
    useState<Notifications.PermissionStatus | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const loadSettings = useCallback(async () => {
    const storedNotifications = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (storedNotifications !== null) {
      setNotificationsEnabled(JSON.parse(storedNotifications));
    } else if (Platform.OS !== "web") {
      const permission = await Notifications.getPermissionsAsync();
      setNotificationPermission(permission.status);
      setNotificationsEnabled(permission.status === "granted");
    }

    const storedCurrency = await AsyncStorage.getItem(CURRENCY_STORAGE_KEY);
    if (storedCurrency) {
      setSelectedCurrency(storedCurrency);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  const metrics = calculatePortfolioMetrics(holdings);

  const handleNotificationToggle = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newValue = !notificationsEnabled;
    
    if (Platform.OS === "web") {
      setNotificationsEnabled(newValue);
      await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(newValue));
      if (newValue) {
        Alert.alert(
          "Notifications Enabled",
          "For push notifications, please use the Briefcase app on your mobile device via Expo Go."
        );
      }
      return;
    }

    if (!newValue) {
      setNotificationsEnabled(false);
      await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(false));
      return;
    }

    const permission = await Notifications.getPermissionsAsync();

    if (permission.status === "granted") {
      setNotificationsEnabled(true);
      setNotificationPermission(permission.status);
      await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(true));
    } else if (permission.status === "denied" && !permission.canAskAgain) {
      const buttons: { text: string; style?: "cancel" | "default" | "destructive"; onPress?: () => void }[] = [
        { text: "Cancel", style: "cancel" as const },
        {
          text: "Open Settings",
          onPress: async () => {
            try {
              await Linking.openSettings();
            } catch (error) {}
          },
        },
      ];
      Alert.alert(
        "Enable Notifications",
        "Notification permissions were denied. Please enable them in your device settings.",
        buttons
      );
    } else {
      const { status } = await Notifications.requestPermissionsAsync();
      setNotificationPermission(status);
      const granted = status === "granted";
      setNotificationsEnabled(granted);
      await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(granted));

      if (!granted) {
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
            await clearAllHoldings.mutateAsync();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all associated data including holdings, settings, and sessions. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            setIsDeletingAccount(true);
            const result = await deleteAccount();
            setIsDeletingAccount(false);
            
            if (result.success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
              Alert.alert("Error", result.error || "Failed to delete account");
            }
          },
        },
      ]
    );
  };

  const handleEditName = () => {
    setEditingName(user?.name || "");
    setShowEditNameModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSaveName = async () => {
    if (!editingName.trim()) {
      Alert.alert("Error", "Please enter a valid name");
      return;
    }
    
    setSavingName(true);
    const result = await updateProfile(editingName.trim());
    setSavingName(false);
    
    if (result.success) {
      setShowEditNameModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Alert.alert("Error", result.error || "Failed to update name");
    }
  };

  const handleSignOut = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await signOut();
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
            <Pressable 
              onPress={handleEditName} 
              style={styles.nameContainer}
              hitSlop={8}
            >
              <ThemedText type="h1" style={styles.userName}>
                {user?.name || "Investor"}
              </ThemedText>
              <Feather 
                name="edit-2" 
                size={16} 
                color={theme.textSecondary} 
                style={{ marginLeft: Spacing.sm }}
              />
            </Pressable>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              {user?.email || "Portfolio Manager"}
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

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Alert.alert(
                  "Privacy Settings",
                  "Your data is stored securely and never shared with third parties. Portfolio data is encrypted and only accessible to you.",
                  [{ text: "OK" }]
                );
              }}
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
                  <Feather name="shield" size={16} color={theme.primary} />
                </View>
                <ThemedText type="body">Privacy</ThemedText>
              </View>
              <View style={styles.settingsRowRight}>
                <ThemedText type="body" style={{ color: theme.textSecondary }}>
                  Standard
                </ThemedText>
                <Feather
                  name="chevron-right"
                  size={18}
                  color={theme.textSecondary}
                  style={{ marginLeft: Spacing.xs }}
                />
              </View>
            </Pressable>

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

            {Platform.OS === "ios" ? (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Linking.openURL("https://apps.apple.com/account/subscriptions");
                }}
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
                    <Feather name="credit-card" size={16} color={theme.primary} />
                  </View>
                  <ThemedText type="body">Manage Subscription</ThemedText>
                </View>
                <Feather
                  name="external-link"
                  size={18}
                  color={theme.textSecondary}
                />
              </Pressable>
            ) : null}

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
            <Button 
              variant="danger" 
              onPress={handleDeleteAccount}
              disabled={isDeletingAccount}
              style={{ marginTop: Spacing.md }}
            >
              {isDeletingAccount ? "Deleting..." : "Delete Account"}
            </Button>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(600).duration(400)}>
          <Card style={styles.signOutCard}>
            <Button variant="secondary" onPress={handleSignOut}>
              Sign Out
            </Button>
          </Card>
        </Animated.View>

        <View style={styles.footer}>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, textAlign: "center" }}
          >
            Briefcase v1.1 (C) 2026 Billionware
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
              { backgroundColor: theme.backgroundDefault },
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

      <Modal
        visible={showEditNameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditNameModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowEditNameModal(false)}
        >
          <Pressable
            style={[styles.modalContent, { backgroundColor: theme.backgroundSecondary }]}
            onPress={(e) => e.stopPropagation()}
          >
            <ThemedText type="h3" style={{ marginBottom: Spacing.lg }}>
              Edit Name
            </ThemedText>
            <TextInput
              style={[
                styles.nameInput,
                {
                  backgroundColor: theme.backgroundRoot,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              value={editingName}
              onChangeText={setEditingName}
              placeholder="Enter your name"
              placeholderTextColor={theme.textSecondary}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
            />
            <View style={styles.modalButtons}>
              <Button
                variant="secondary"
                onPress={() => setShowEditNameModal(false)}
                style={{ flex: 1, marginRight: Spacing.sm }}
              >
                Cancel
              </Button>
              <Button
                onPress={handleSaveName}
                disabled={savingName}
                style={{ flex: 1, marginLeft: Spacing.sm }}
              >
                {savingName ? "Saving..." : "Save"}
              </Button>
            </View>
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
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  nameInput: {
    height: 48,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
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
  signOutCard: {
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
