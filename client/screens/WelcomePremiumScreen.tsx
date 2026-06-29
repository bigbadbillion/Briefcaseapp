import React from "react";
import { StyleSheet, View, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CommonActions } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

const AI_FEATURES = [
  {
    icon: "cpu" as const,
    title: "Live AI Insights",
    description: "Portfolio analysis powered by real-time market data and cited research",
  },
  {
    icon: "message-circle" as const,
    title: "Research Assistant",
    description: "Ask about prices, news, holdings, and market sentiment — with sources",
  },
  {
    icon: "search" as const,
    title: "Web & Market Research",
    description: "Finnhub quotes, CoinGecko crypto data, and trusted web search built in",
  },
  {
    icon: "book-open" as const,
    title: "Your Research Notes",
    description: "The AI remembers notes you've saved on holdings for personalized answers",
  },
];

function navigateToInsights(
  navigation: NativeStackNavigationProp<RootStackParamList>
) {
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [
        {
          name: "Main",
          state: {
            routes: [
              { name: "Dashboard" },
              { name: "Holdings" },
              { name: "Insights" },
              { name: "Profile" },
            ],
            index: 2,
          },
        },
      ],
    })
  );
}

export default function WelcomePremiumScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme } = useTheme();

  const handleContinue = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigateToInsights(navigation);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing["3xl"],
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: theme.primary }]}>
            <Feather name="star" size={36} color="#FFFFFF" />
          </View>
          <ThemedText type="display" style={styles.title}>
            Welcome to Premium
          </ThemedText>
          <ThemedText
            type="body"
            style={{ color: theme.textSecondary, textAlign: "center", lineHeight: 22 }}
          >
            You just unlocked Briefcase's most powerful tools. Dive into AI-driven
            insights tailored to your portfolio.
          </ThemedText>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(200).duration(400)}
          style={styles.featuresSection}
        >
          {AI_FEATURES.map((feature, index) => (
            <Animated.View
              key={feature.title}
              entering={FadeInUp.delay(300 + index * 80).duration(400)}
            >
              <Card style={styles.featureCard}>
                <View
                  style={[styles.featureIcon, { backgroundColor: `${theme.primary}20` }]}
                >
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

        <Animated.View entering={FadeInDown.delay(700).duration(400)}>
          <View
            style={[
              styles.disclaimerBox,
              { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
            ]}
          >
            <Feather
              name="info"
              size={16}
              color={theme.textSecondary}
              style={{ marginTop: 2 }}
            />
            <ThemedText
              type="caption"
              style={[styles.disclaimerText, { color: theme.textSecondary }]}
            >
              AI insights are a research starting point, not financial advice. Always
              do your own due diligence before making investment decisions.
            </ThemedText>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(900).duration(400)}
          style={styles.ctaSection}
        >
          <Button onPress={handleContinue} style={styles.ctaButton}>
            Explore AI Insights
          </Button>
        </Animated.View>
      </ScrollView>

      <Pressable
        onPress={handleContinue}
        hitSlop={12}
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
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  featuresSection: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
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
  disclaimerBox: {
    flexDirection: "row",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  disclaimerText: {
    flex: 1,
    lineHeight: 18,
  },
  ctaSection: {
    alignItems: "center",
  },
  ctaButton: {
    width: "100%",
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
