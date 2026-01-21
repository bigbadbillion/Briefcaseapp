import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  FlatList,
  Pressable,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Fonts } from "@/constants/theme";
import { getHoldings, calculatePortfolioMetrics, Holding } from "@/lib/storage";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SAMPLE_RESPONSES: Record<string, string> = {
  diversified:
    "Based on your portfolio, you have exposure to 5 different asset types: stocks (35%), crypto (32%), ETFs (15%), bonds (10%), and real estate (8%). This is a moderately diversified portfolio, but you might want to reduce crypto exposure for lower volatility.",
  risk: "Your portfolio has a risk score of 58/100, which is in the moderate range. The main contributors to risk are your cryptocurrency holdings (Bitcoin and Ethereum). Consider adding more bonds or dividend stocks for stability.",
  best: "Your best performing asset is Bitcoin (BTC), which is up 60.7% from your purchase price. However, past performance doesn't guarantee future returns. Consider taking some profits to lock in gains.",
  worst:
    "Your worst performer is the US Treasury Bond (TLT), down about 2.5% from purchase. This is typical for bonds in a rising rate environment. However, bonds provide important portfolio stability.",
  recommend:
    "Based on your current allocation, I'd suggest: 1) Reduce crypto exposure from 32% to 20%, 2) Add more international ETF exposure, 3) Consider adding a small allocation to commodities like gold for inflation protection.",
  total:
    "Your total portfolio value is approximately $68,500. You've gained about $12,800 (23%) from your total cost basis of $55,700. Congratulations on your investment gains!",
};

export default function AIChatModal() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [holdings, setHoldings] = useState<Holding[]>([]);

  useFocusEffect(
    useCallback(() => {
      getHoldings().then(setHoldings);
    }, [])
  );

  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: "welcome",
        role: "assistant",
        content:
          "Hello! I'm your AI portfolio assistant. I can help you understand your investments, analyze your risk, and provide insights. Try asking me about your diversification, risk level, or best performers!",
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, []);

  const getAIResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    const metrics = calculatePortfolioMetrics(holdings);

    if (lowerMessage.includes("diversif")) {
      return SAMPLE_RESPONSES.diversified;
    }
    if (lowerMessage.includes("risk") || lowerMessage.includes("volatile")) {
      return SAMPLE_RESPONSES.risk;
    }
    if (lowerMessage.includes("best") || lowerMessage.includes("top")) {
      return SAMPLE_RESPONSES.best;
    }
    if (lowerMessage.includes("worst") || lowerMessage.includes("underperform")) {
      return SAMPLE_RESPONSES.worst;
    }
    if (lowerMessage.includes("recommend") || lowerMessage.includes("suggest")) {
      return SAMPLE_RESPONSES.recommend;
    }
    if (lowerMessage.includes("total") || lowerMessage.includes("value") || lowerMessage.includes("worth")) {
      return `Your portfolio is worth $${metrics.totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}. You have ${holdings.length} different holdings with a total gain/loss of ${metrics.totalGainLossPercent >= 0 ? "+" : ""}${metrics.totalGainLossPercent.toFixed(1)}%.`;
    }
    if (lowerMessage.includes("holding") || lowerMessage.includes("asset")) {
      const holdingsList = holdings.map((h) => `${h.symbol} (${h.type})`).join(", ");
      return `You currently hold: ${holdingsList}. Would you like me to analyze any specific asset?`;
    }

    return `I understand you're asking about "${userMessage}". Based on your portfolio of ${holdings.length} holdings worth $${metrics.totalValue.toLocaleString()}, I can help you with diversification analysis, risk assessment, and investment recommendations. What would you like to know more about?`;
  };

  const handleSend = () => {
    if (!inputText.trim()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [userMessage, ...prev]);
    setInputText("");
    setIsTyping(true);
    Keyboard.dismiss();

    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: getAIResponse(userMessage.content),
        timestamp: new Date(),
      };
      setMessages((prev) => [aiResponse, ...prev]);
      setIsTyping(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1000 + Math.random() * 1000);
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
          {suggestedQuestions.map((question, index) => (
            <Pressable
              key={question}
              onPress={() => {
                setInputText(question);
                setTimeout(handleSend, 100);
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
          />
          <Pressable
            onPress={handleSend}
            disabled={!inputText.trim()}
            style={[
              styles.sendButton,
              {
                backgroundColor: inputText.trim() ? theme.primary : theme.backgroundTertiary,
              },
            ]}
          >
            <Feather
              name="send"
              size={18}
              color={inputText.trim() ? "#FFFFFF" : theme.textSecondary}
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
});
