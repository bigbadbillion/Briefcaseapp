import React, { useState } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as AppleAuthentication from "expo-apple-authentication";
import { getApiUrl } from "@/lib/query-client";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, Fonts } from "@/constants/theme";

type AuthMode = "login" | "register" | "verify" | "forgot" | "reset";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { signIn, signUp, signInWithApple, requestPasswordReset, resetPassword } = useAuth();
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);

  React.useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setAppleAuthAvailable);
  }, []);

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter your email and password.");
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await signIn(email, password);

    setLoading(false);

    if (!result.success) {
      Alert.alert("Login Failed", result.error || "Please check your credentials.");
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !name) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    if (password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await signUp(email, password, name);

    setLoading(false);

    if (result.success) {
      setMode("verify");
      Alert.alert(
        "Account Created",
        "Please check your email to verify your account."
      );
    } else {
      Alert.alert("Registration Failed", result.error || "Please try again.");
    }
  };

  const handleForgot = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await requestPasswordReset(email);

    setLoading(false);

    if (result.success) {
      setMode("reset");
      Alert.alert(
        "Check Your Email",
        "If an account exists for this email, we've sent a 6-digit reset code. It expires in 15 minutes."
      );
    } else {
      Alert.alert("Error", result.error || "Please try again.");
    }
  };

  const handleReset = async () => {
    if (!code || !newPassword) {
      Alert.alert("Error", "Please enter the code and a new password.");
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await resetPassword(email, code.trim(), newPassword);

    setLoading(false);

    if (result.success) {
      setMode("login");
      setPassword("");
      setNewPassword("");
      setCode("");
      Alert.alert("Password Reset", "You can now sign in with your new password.");
    } else {
      Alert.alert("Reset Failed", result.error || "Please try again.");
    }
  };

  const switchMode = (newMode: AuthMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode(newMode);
  };

  const handleAppleSignIn = async () => {
    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        Alert.alert("Error", "Apple Sign-In failed. Please try again.");
        setLoading(false);
        return;
      }

      const result = await signInWithApple({
        identityToken: credential.identityToken,
        email: credential.email,
        fullName: credential.fullName ? {
          givenName: credential.fullName.givenName || undefined,
          familyName: credential.fullName.familyName || undefined,
        } : null,
        user: credential.user,
      });

      setLoading(false);

      if (!result.success) {
        Alert.alert("Sign In Failed", result.error || "Please try again.");
      }
    } catch (error: any) {
      setLoading(false);
      if (error.code === "ERR_REQUEST_CANCELED") {
        return;
      }
      Alert.alert("Error", "Apple Sign-In failed. Please try again.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing["3xl"],
            paddingBottom: insets.bottom + Spacing["3xl"],
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
          <View style={[styles.logoContainer, { backgroundColor: theme.primary }]}>
            <Feather name="briefcase" size={32} color="#FFFFFF" />
          </View>
          <ThemedText type="display" style={styles.title}>
            Briefcase
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
            AI-Powered Investment Dashboard
          </ThemedText>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <Card style={styles.authCard}>
            <ThemedText type="h2" style={styles.cardTitle}>
              {mode === "login"
                ? "Welcome Back"
                : mode === "register"
                ? "Create Account"
                : mode === "verify"
                ? "Verify Email"
                : mode === "forgot"
                ? "Reset Password"
                : "New Password"}
            </ThemedText>

            {mode === "forgot" ? (
              <>
                <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.lg, textAlign: "center" }}>
                  Enter your email and we'll send you a 6-digit code to reset your password.
                </ThemedText>

                <View style={styles.inputContainer}>
                  <Feather name="mail" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.backgroundSecondary,
                        color: theme.text,
                        borderColor: theme.border,
                      },
                    ]}
                    placeholder="Email address"
                    placeholderTextColor={theme.textSecondary}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <Button onPress={handleForgot} disabled={loading} style={styles.button}>
                  {loading ? "Please wait..." : "Send Reset Code"}
                </Button>

                <Pressable onPress={() => switchMode("login")} style={styles.switchMode}>
                  <ThemedText type="body" style={{ color: theme.primary }}>
                    Back to Login
                  </ThemedText>
                </Pressable>
              </>
            ) : mode === "reset" ? (
              <>
                <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.lg, textAlign: "center" }}>
                  Enter the 6-digit code sent to your email and choose a new password.
                </ThemedText>

                <View style={styles.inputContainer}>
                  <Feather name="hash" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.backgroundSecondary,
                        color: theme.text,
                        borderColor: theme.border,
                      },
                    ]}
                    placeholder="6-digit code"
                    placeholderTextColor={theme.textSecondary}
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                    autoCapitalize="none"
                    maxLength={6}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Feather name="lock" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.backgroundSecondary,
                        color: theme.text,
                        borderColor: theme.border,
                        paddingRight: 50,
                      },
                    ]}
                    placeholder="New password"
                    placeholderTextColor={theme.textSecondary}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.passwordToggle}
                  >
                    <Feather
                      name={showPassword ? "eye-off" : "eye"}
                      size={20}
                      color={theme.textSecondary}
                    />
                  </Pressable>
                </View>

                <Button onPress={handleReset} disabled={loading} style={styles.button}>
                  {loading ? "Please wait..." : "Reset Password"}
                </Button>

                <Pressable onPress={() => switchMode("login")} style={styles.switchMode}>
                  <ThemedText type="body" style={{ color: theme.primary }}>
                    Back to Login
                  </ThemedText>
                </Pressable>
              </>
            ) : mode === "verify" ? (
              <>
                <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.lg, textAlign: "center" }}>
                  We've sent a verification email to your inbox. Click the link in the email to verify your account.
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.lg, textAlign: "center" }}>
                  After clicking the link, return here and sign in.
                </ThemedText>
                <Pressable onPress={() => switchMode("login")} style={styles.switchMode}>
                  <ThemedText type="body" style={{ color: theme.primary }}>
                    Back to Login
                  </ThemedText>
                </Pressable>
              </>
            ) : (
              <>
                {mode === "register" && (
                  <View style={styles.inputContainer}>
                    <Feather name="user" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: theme.backgroundSecondary,
                          color: theme.text,
                          borderColor: theme.border,
                        },
                      ]}
                      placeholder="Full name"
                      placeholderTextColor={theme.textSecondary}
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                    />
                  </View>
                )}

                <View style={styles.inputContainer}>
                  <Feather name="mail" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.backgroundSecondary,
                        color: theme.text,
                        borderColor: theme.border,
                      },
                    ]}
                    placeholder="Email address"
                    placeholderTextColor={theme.textSecondary}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Feather name="lock" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.backgroundSecondary,
                        color: theme.text,
                        borderColor: theme.border,
                        paddingRight: 50,
                      },
                    ]}
                    placeholder="Password"
                    placeholderTextColor={theme.textSecondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.passwordToggle}
                  >
                    <Feather
                      name={showPassword ? "eye-off" : "eye"}
                      size={20}
                      color={theme.textSecondary}
                    />
                  </Pressable>
                </View>

                {mode === "login" ? (
                  <Pressable
                    onPress={() => switchMode("forgot")}
                    style={styles.forgotPassword}
                  >
                    <ThemedText type="caption" style={{ color: theme.primary }}>
                      Forgot password?
                    </ThemedText>
                  </Pressable>
                ) : null}

                <Button
                  onPress={mode === "login" ? handleLogin : handleRegister}
                  disabled={loading}
                  style={styles.button}
                >
                  {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
                </Button>

                {appleAuthAvailable && mode === "login" ? (
                  <>
                    <View style={styles.divider}>
                      <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
                      <ThemedText type="caption" style={{ color: theme.textSecondary, paddingHorizontal: Spacing.md }}>
                        or
                      </ThemedText>
                      <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
                    </View>
                    <AppleAuthentication.AppleAuthenticationButton
                      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                      cornerRadius={BorderRadius.md}
                      style={styles.appleButton}
                      onPress={handleAppleSignIn}
                    />
                  </>
                ) : null}

                <Pressable
                  onPress={() => switchMode(mode === "login" ? "register" : "login")}
                  style={styles.switchMode}
                >
                  <ThemedText type="body" style={{ color: theme.textSecondary }}>
                    {mode === "login" ? "Don't have an account? " : "Already have an account? "}
                    <ThemedText type="body" style={{ color: theme.primary }}>
                      {mode === "login" ? "Sign Up" : "Sign In"}
                    </ThemedText>
                  </ThemedText>
                </Pressable>
              </>
            )}
          </Card>
        </Animated.View>

        <ThemedText type="caption" style={[styles.footer, { color: theme.textSecondary }]}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </ThemedText>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.sm,
  },
  authCard: {
    padding: Spacing.xl,
  },
  cardTitle: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  inputContainer: {
    position: "relative",
    marginBottom: Spacing.md,
  },
  inputIcon: {
    position: "absolute",
    left: Spacing.md,
    top: 14,
    zIndex: 1,
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingLeft: 48,
    fontSize: 16,
    borderWidth: 1,
  },
  passwordToggle: {
    position: "absolute",
    right: Spacing.md,
    top: 14,
  },
  button: {
    marginTop: Spacing.md,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    paddingVertical: Spacing.xs,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  appleButton: {
    width: "100%",
    height: 48,
  },
  switchMode: {
    alignItems: "center",
    marginTop: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  footer: {
    textAlign: "center",
    marginTop: Spacing["2xl"],
  },
});
