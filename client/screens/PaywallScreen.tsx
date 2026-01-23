import React, { useState } from "react";
import { StyleSheet, View, ScrollView, Pressable, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Spacing, BorderRadius, Fonts } from "@/constants/theme";

const PREMIUM_FEATURES = [
  {
    icon: "cpu" as const,
    title: "AI-Powered Insights",
    description: "Get personalized portfolio analysis and recommendations powered by advanced AI",
  },
  {
    icon: "message-circle" as const,
    title: "AI Chat Assistant",
    description: "Ask questions about your investments and get instant, intelligent answers",
  },
  {
    icon: "trending-up" as const,
    title: "Portfolio Optimization",
    description: "Receive tailored suggestions to improve your portfolio's performance and reduce risk",
  },
  {
    icon: "bell" as const,
    title: "Smart Alerts",
    description: "Get notified about important market movements and portfolio changes",
  },
];

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { offering, purchasePackage, restorePurchases, isLoading } = useSubscription();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Try to find monthly package first, then fall back to any available package
  const monthlyPackage = offering?.availablePackages.find(
    (pkg) => pkg.packageType === "MONTHLY" || pkg.identifier === "$rc_monthly"
  ) || offering?.availablePackages.find(
    (pkg) => pkg.product?.identifier === "monthly_499"
  ) || (offering?.availablePackages.length ? offering.availablePackages[0] : null);

  // Detailed debug logging
  console.log("[Paywall] === SUBSCRIPTION DEBUG ===");
  console.log("[Paywall] Offering exists:", !!offering);
  console.log("[Paywall] Offering identifier:", offering?.identifier);
  console.log("[Paywall] Available packages count:", offering?.availablePackages?.length || 0);
  
  if (offering?.availablePackages) {
    offering.availablePackages.forEach((pkg, index) => {
      console.log(`[Paywall] Package ${index}:`, {
        identifier: pkg.identifier,
        packageType: pkg.packageType,
        productIdentifier: pkg.product?.identifier,
        productTitle: pkg.product?.title,
        priceString: pkg.product?.priceString,
      });
    });
  }
  
  console.log("[Paywall] Selected package:", monthlyPackage ? {
    identifier: monthlyPackage.identifier,
    packageType: monthlyPackage.packageType,
    productIdentifier: monthlyPackage.product?.identifier,
  } : "NONE - subscription not ready");
  console.log("[Paywall] === END DEBUG ===");

  const handlePurchase = async () => {
    console.log("[Paywall] Purchase button pressed");
    console.log("[Paywall] monthlyPackage exists:", !!monthlyPackage);
    
    if (!monthlyPackage) {
      console.log("[Paywall] No monthly package available - showing alert");
      const debugInfo = `Offering: ${offering ? offering.identifier : 'null'}\nPackages: ${offering?.availablePackages?.length || 0}`;
      Alert.alert(
        "Subscription Not Ready", 
        `The subscription product hasn't loaded yet.\n\nDebug:\n${debugInfo}\n\nPlease try closing and reopening the app.`
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsPurchasing(true);

    try {
      const result = await purchasePackage(monthlyPackage);
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        navigation.goBack();
      } else if (result.error) {
        Alert.alert("Purchase Failed", result.error);
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRestoring(true);

    try {
      const result = await restorePurchases();
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Success", "Your subscription has been restored!", [
          { text: "OK", onPress: () => navigation.goBack() }
        ]);
      } else if (result.error) {
        Alert.alert("No Subscription Found", result.error);
      }
    } catch (error) {
      Alert.alert("Error", "Could not restore purchases. Please try again.");
    } finally {
      setIsRestoring(false);
    }
  };

  const priceString = monthlyPackage?.product.priceString || "$4.99";

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: theme.primary }]}>
            <Feather name="star" size={32} color="#FFFFFF" />
          </View>
          <ThemedText type="display" style={styles.title}>
            Briefcase Premium
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
            Unlock the full power of AI-driven investment insights
          </ThemedText>
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(200).duration(400)} 
          style={styles.featuresSection}
        >
          {PREMIUM_FEATURES.map((feature, index) => (
            <Animated.View
              key={feature.title}
              entering={FadeInUp.delay(300 + index * 100).duration(400)}
            >
              <Card style={styles.featureCard}>
                <View style={[styles.featureIcon, { backgroundColor: `${theme.primary}20` }]}>
                  <Feather name={feature.icon} size={20} color={theme.primary} />
                </View>
                <View style={styles.featureContent}>
                  <ThemedText type="body" style={styles.featureTitle}>
                    {feature.title}
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                    {feature.description}
                  </ThemedText>
                </View>
              </Card>
            </Animated.View>
          ))}
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(700).duration(400)}
          style={styles.pricingSection}
        >
          <Card style={{...styles.pricingCard, borderColor: theme.primary, borderWidth: 2}}>
            <View style={styles.priceRow}>
              <ThemedText type="h1" style={{ color: theme.primary }}>
                {priceString}
              </ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>
                /month
              </ThemedText>
            </View>
            <View style={[styles.trialBadge, { backgroundColor: `${theme.success}20` }]}>
              <Feather name="gift" size={14} color={theme.success} />
              <ThemedText type="caption" style={{ color: theme.success, marginLeft: Spacing.xs }}>
                3-day free trial
              </ThemedText>
            </View>
            <ThemedText 
              type="caption" 
              style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}
            >
              Cancel anytime. No commitment required.
            </ThemedText>
          </Card>
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(900).duration(400)}
          style={styles.ctaSection}
        >
          <Button
            onPress={handlePurchase}
            disabled={isPurchasing || isRestoring}
            style={styles.ctaButton}
          >
            {isPurchasing ? "Processing..." : isLoading ? "Loading..." : "Start Free Trial"}
          </Button>
          
          <Pressable 
            onPress={handleRestore}
            disabled={isRestoring || isPurchasing}
            style={styles.restoreButton}
          >
            <ThemedText 
              type="body" 
              style={{ color: isRestoring ? theme.textSecondary : theme.primary }}
            >
              {isRestoring ? "Restoring..." : "Restore Purchases"}
            </ThemedText>
          </Pressable>

          {Platform.OS === "ios" && (
            <ThemedText 
              type="caption" 
              style={[styles.disclaimer, { color: theme.textSecondary }]}
            >
              Payment will be charged to your Apple ID account at the confirmation of purchase. 
              Subscription automatically renews unless it is canceled at least 24 hours before 
              the end of the current period. Your account will be charged for renewal within 
              24 hours prior to the end of the current period.
            </ThemedText>
          )}
        </Animated.View>
      </ScrollView>

      <Pressable
        onPress={() => navigation.goBack()}
        style={[styles.closeButton, { top: insets.top + Spacing.md }]}
      >
        <View style={[styles.closeButtonBg, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="x" size={20} color={theme.text} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  featuresSection: {
    gap: Spacing.md,
    marginBottom: Spacing["2xl"],
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    marginBottom: Spacing.xs,
  },
  pricingSection: {
    marginBottom: Spacing["2xl"],
  },
  pricingCard: {
    alignItems: "center",
    padding: Spacing.xl,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  trialBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.md,
  },
  ctaSection: {
    alignItems: "center",
  },
  ctaButton: {
    width: "100%",
  },
  restoreButton: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  disclaimer: {
    marginTop: Spacing.xl,
    textAlign: "center",
    lineHeight: 18,
  },
  closeButton: {
    position: "absolute",
    right: Spacing.lg,
    zIndex: 10,
  },
  closeButtonBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
