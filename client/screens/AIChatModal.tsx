import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  FlatList,
  Pressable,
  Keyboard,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Spacing, BorderRadius, Fonts } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { sendChatMessage, type ChatMessage as APIChatMessage, type AgentSource } from "@/lib/aiService";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: AgentSource[];
  warnings?: string[];
}

export default function AIChatModal() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { isPremium, isLoading: subscriptionLoading } = useSubscription();
  const { token } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const handleInputFocus = useCallback(() => {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
  }, []);

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
          "Hi! I'm your Briefcase research copilot — I can check live prices, news, your holdings, and saved notes, then suggest where to dig deeper.\n\nI'm not a licensed financial advisor. What I share is a research starting point — always verify before you act.",
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, []);

  const buildChatHistory = (currentMessages: Message[]): APIChatMessage[] => {
    return currentMessages
      .filter((m) => m.id !== "welcome")
      .slice(0, 10)
      .reverse()
      .map((m) => ({
        role: m.role === "user" ? "user" : "model",
        content: m.content,
      }));
  };

  const canSend = !!inputText.trim() && !isTyping && !!token;

  const handleSend = async (textOverride?: string) => {
    const userMessageText = (textOverride ?? inputText).trim();
    if (!userMessageText || isTyping) return;

    if (!token) {
      setSendError("Please sign in again to use AI chat.");
      return;
    }

    setSendError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userMessageText,
      timestamp: new Date(),
    };

    const nextMessages = [userMessage, ...messages];
    setMessages(nextMessages);
    setInputText("");
    setIsTyping(true);
    Keyboard.dismiss();

    try {
      const history = buildChatHistory(messages);
      const response = await sendChatMessage(token, userMessageText, history);

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.response,
        timestamp: new Date(),
        sources: response.sources,
        warnings: response.warnings,
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

  const renderMessage = ({ item }: { item: Message; index: number }) => {
    const isUser = item.role === "user";

    return (
      <View
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
          {!isUser && item.warnings && item.warnings.length > 0 ? (
            <ThemedText
              type="caption"
              style={[styles.warningText, { color: theme.warning }]}
            >
              {item.warnings.join(" ")}
            </ThemedText>
          ) : null}
          {!isUser && item.sources && item.sources.length > 0 ? (
            <View style={styles.sourcesRow}>
              {item.sources.slice(0, 4).map((source, i) => (
                <View
                  key={`${source.type}-${source.label}-${i}`}
                  style={[styles.sourceChip, { backgroundColor: theme.backgroundTertiary }]}
                >
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                    {source.label}
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>
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
        Ask about live prices, news, your holdings, or market sentiment.
      </ThemedText>
    </View>
  );

  const suggestedQuestions = [
    "What do I hold?",
    "What's NVDA trading at?",
    "Any news on AAPL?",
    "How diversified am I?",
  ];

  if (subscriptionLoading) {
    return (
      <View style={[styles.container, styles.premiumContainer, { backgroundColor: theme.backgroundRoot }]}>
        <ThemedText type="body" style={{ color: theme.textSecondary }}>
          Loading...
        </ThemedText>
      </View>
    );
  }

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
            Get live stock and crypto research with cited sources. Ask about prices, news, your holdings, and market sentiment.
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
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        ref={flatListRef}
        style={styles.messageList}
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
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      />

      {messages.length === 1 ? (
        <Animated.View entering={FadeIn.delay(300).duration(400)} style={styles.suggestionsContainer}>
          {suggestedQuestions.map((question) => (
            <Pressable
              key={question}
              onPress={() => {
                void handleSend(question);
              }}
              disabled={isTyping || !token}
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

      <KeyboardStickyView
        offset={{
          closed: 0,
          opened: insets.bottom > 0 ? 0 : Spacing.sm,
        }}
      >
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
          {sendError ? (
            <ThemedText type="caption" style={[styles.sendError, { color: theme.warning }]}>
              {sendError}
            </ThemedText>
          ) : null}
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
              onChangeText={(text) => {
                setInputText(text);
                if (sendError) setSendError(null);
              }}
              onFocus={handleInputFocus}
              multiline
              maxLength={500}
              blurOnSubmit={false}
              onSubmitEditing={() => {
                void handleSend();
              }}
            />
            <Pressable
              onPress={() => {
                void handleSend();
              }}
              disabled={!canSend}
              hitSlop={8}
              style={[
                styles.sendButton,
                {
                  backgroundColor: canSend ? theme.primary : theme.backgroundTertiary,
                },
              ]}
            >
              <Feather
                name="send"
                size={18}
                color={canSend ? "#FFFFFF" : theme.textSecondary}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardStickyView>
    </View>
  );
}

function TypingDot({ delay, theme }: { delay: number; theme: any }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    const timeout = setTimeout(() => {
      opacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 300 }),
          withTiming(0.3, { duration: 300 })
        ),
        -1,
        false
      );
    }, delay);

    return () => clearTimeout(timeout);
  }, [delay, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.typingDot,
        { backgroundColor: theme.primary },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messageList: {
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
  warningText: {
    marginTop: Spacing.sm,
    lineHeight: 18,
  },
  sourcesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  sourceChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
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
    zIndex: 2,
  },
  sendError: {
    marginBottom: Spacing.sm,
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
