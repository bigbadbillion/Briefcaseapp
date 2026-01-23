import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  FlatList,
  Pressable,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Spacing, BorderRadius, Fonts } from "@/constants/theme";
import { useHoldings, calculatePortfolioMetrics, Holding } from "@/hooks/useHoldings";
import { sendChatMessage, type ChatMessage as APIChatMessage, type PortfolioContext } from "@/lib/aiService";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function AIChatModal() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { isPremium } = useSubscription();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const flatListRef = useRef<FlatList>(null);

  const { data: holdings = [] } = useHoldings();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleUpgrade = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.replace("Paywall");
  };

  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: "welcome",
        role: "assistant",
        content:
          "Hello! I'm your AI portfolio assistant powered by Gemini. I can help you understand your investments, analyze your risk, and provide personalized insights. Try asking me about your diversification, risk level, or recommendations!",
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, []);

  const buildPortfolioContext = (): PortfolioContext => {
    const metrics = calculatePortfolioMetrics(holdings);
    return {
      totalValue: metrics.totalValue,
      riskScore: metrics.riskScore,
      diversificationScore: metrics.diversificationScore,
      holdings: holdings.map((h) => ({
        name: h.name,
        symbol: h.symbol,
        type: h.type,
        value: h.currentPrice * h.quantity,
        gain: (h.currentPrice - h.purchasePrice) * h.quantity,
        gainPercent: ((h.currentPrice - h.purchasePrice) / h.purchasePrice) * 100,
      })),
    };
  };

  const buildChatHistory = (): APIChatMessage[] => {
    return messages
      .filter((m) => m.id !== "welcome")
      .slice(0, 10)
      .reverse()
      .map((m) => ({
        role: m.role === "user" ? "user" : "model",
        content: m.content,
      }));
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMessageText = inputText.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userMessageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [userMessage, ...prev]);
    setInputText("");
    setIsTyping(true);
    Keyboard.dismiss();

    try {
      const history = buildChatHistory();
      const context = buildPortfolioContext();
      
      const response = await sendChatMessage(userMessageText, history, context);

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.response,
        timestamp: new Date(),
      };
      setMessages((prev) => [aiResponse, ...prev]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [errorMessage, ...prev]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsTyping(false);
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isUser = item.role === "user";

    return (
      <Animated.View
        entering={FadeInUp.delay(index * 50).duration(300)}
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.assistantMessageContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isUser
              ? [styles.userBubble, { backgroundColor: theme.primary }]
              : [styles.assistantBubble, { backgroundColor: theme.backgroundSecondary }],
          ]}
        >
          <ThemedText
            type="body"
            style={[
              styles.messageText,
              { color: isUser ? "#FFFFFF" : theme.text },
            ]}
          >
            {item.content}
          </ThemedText>
        </View>
      </Animated.View>
    );
  };

  const renderTypingIndicator = () => {
    if (!isTyping) return null;

    return (
      <Animated.View
        entering={FadeIn.duration(200)}
        style={[styles.messageContainer, styles.assistantMessageContainer]}
      >
        <View
          style={[
            styles.messageBubble,
            styles.assistantBubble,
            styles.typingBubble,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <View style={styles.typingDots}>
            <TypingDot delay={0} theme={theme} />
            <TypingDot delay={200} theme={theme} />
            <TypingDot delay={400} theme={theme} />
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Feather name="message-circle" size={48} color={theme.textSecondary} />
      <ThemedText type="h3" style={[styles.emptyTitle, { color: theme.textSecondary }]}>
        Ask me anything
      </ThemedText>
      <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
        I can help analyze your portfolio, assess risk, and provide insights.
      </ThemedText>
    </View>
  );

  const suggestedQuestions = [
    "How diversified am I?",
    "What's my risk level?",
    "Best performing asset?",
    "Any recommendations?",
  ];

  if (!isPremium) {
    return (
      <View style={[styles.container, styles.premiumContainer, { backgroundColor: theme.backgroundRoot }]}>
        <View style={styles.premiumContent}>
          <View style={[styles.premiumIconContainer, { backgroundColor: `${theme.primary}20` }]}>
            <Feather name="cpu" size={32} color={theme.primary} />
          </View>
          <ThemedText type="h2" style={styles.premiumTitle}>
            AI Chat Assistant
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginBottom: Spacing.xl }}>
            Get instant answers about your portfolio with our AI-powered assistant. Ask about risk, diversification, recommendations, and more.
          </ThemedText>
          <Button onPress={handleUpgrade} style={styles.premiumButton}>
            Upgrade to Premium
          </Button>
          <Pressable 
            onPress={() => navigation.goBack()} 
            style={styles.backLink}
          >
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              Maybe later
            </ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <FlatList
        ref={flatListRef}
        inverted={messages.length > 0}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Spacing.lg },
        ]}
        ListHeaderComponent={renderTypingIndicator}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {messages.length === 1 ? (
        <Animated.View entering={FadeIn.delay(300).duration(400)} style={styles.suggestionsContainer}>
          {suggestedQuestions.map((question) => (
            <Pressable
              key={question}
              onPress={() => {
                setInputText(question);
              }}
              style={[
                styles.suggestionChip,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <ThemedText type="caption" style={{ color: theme.primary }}>
                {question}
              </ThemedText>
            </Pressable>
          ))}
        </Animated.View>
      ) : null}

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.backgroundRoot,
            paddingBottom: insets.bottom > 0 ? insets.bottom : Spacing.lg,
            borderTopColor: theme.border,
          },
        ]}
      >
        <View
          style={[
            styles.inputWrapper,
            {
              backgroundColor: theme.backgroundSecondary,
              borderColor: isDark ? theme.border : "transparent",
              borderWidth: isDark ? 1 : 0,
            },
          ]}
        >
          <TextInput
            style={[styles.textInput, { color: theme.text, fontFamily: Fonts?.sans }]}
            placeholder="Ask about your portfolio..."
            placeholderTextColor={theme.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            onSubmitEditing={handleSend}
          />
          <Pressable
            onPress={handleSend}
            disabled={!inputText.trim() || isTyping}
            style={[
              styles.sendButton,
              {
                backgroundColor: inputText.trim() && !isTyping ? theme.primary : theme.backgroundTertiary,
              },
            ]}
          >
            <Feather
              name="send"
              size={18}
              color={inputText.trim() && !isTyping ? "#FFFFFF" : theme.textSecondary}
            />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function TypingDot({ delay, theme }: { delay: number; theme: any }) {
  const [opacity, setOpacity] = useState(0.3);

  useEffect(() => {
    const interval = setInterval(() => {
      setOpacity((prev) => (prev === 0.3 ? 1 : 0.3));
    }, 600);

    const timeout = setTimeout(() => {}, delay);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [delay]);

  return (
    <View
      style={[
        styles.typingDot,
        { backgroundColor: theme.primary, opacity },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    flexGrow: 1,
  },
  messageContainer: {
    marginBottom: Spacing.sm,
  },
  userMessageContainer: {
    alignItems: "flex-end",
  },
  assistantMessageContainer: {
    alignItems: "flex-start",
  },
  messageBubble: {
    maxWidth: "85%",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  userBubble: {
    borderBottomRightRadius: BorderRadius.xs,
  },
  assistantBubble: {
    borderBottomLeftRadius: BorderRadius.xs,
  },
  typingBubble: {
    paddingVertical: Spacing.lg,
  },
  messageText: {
    lineHeight: 22,
  },
  typingDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["3xl"],
    transform: [{ scaleY: -1 }],
  },
  emptyTitle: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  suggestionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  suggestionChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  inputContainer: {
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: BorderRadius.lg,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: Spacing.sm,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  premiumContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  premiumContent: {
    alignItems: "center",
    maxWidth: 320,
  },
  premiumIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  premiumTitle: {
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  premiumButton: {
    width: "100%",
    marginBottom: Spacing.lg,
  },
  backLink: {
    padding: Spacing.md,
  },
});
