import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, AppStateStatus } from "react-native";
import { getApiUrl } from "@/lib/query-client";

const AUTH_TOKEN_KEY = "@briefcase/auth_token";
const AUTH_USER_KEY = "@briefcase/auth_user";

interface User {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  isPremium: boolean;
}

interface AppleAuthData {
  identityToken: string;
  email: string | null;
  fullName: { givenName?: string; familyName?: string } | null;
  user: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string; verificationToken?: string }>;
  signInWithApple: (data: AppleAuthData) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  verifyEmail: (token: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (name: string) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [token]);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === "active") {
      if (token) {
        await refreshUserData();
      }
    }
    appState.current = nextAppState;
  };

  const refreshUserData = async () => {
    if (!token) return;
    
    try {
      const response = await fetch(new URL("/api/auth/me", getApiUrl()).toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
          setUser(data.user);
        }
      }
    } catch (error) {
      console.error("Error refreshing user:", error);
    }
  };

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      const storedUser = await AsyncStorage.getItem(AUTH_USER_KEY);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Error loading auth:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch(new URL("/api/auth/login", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || data.message || "Login failed" };
      }

      if (data.success && data.token && data.user) {
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token);
        await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        return { success: true };
      }

      return { success: false, error: data.error || data.message || "Login failed" };
    } catch (error) {
      return { success: false, error: "Network error. Please try again." };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    try {
      const response = await fetch(new URL("/api/auth/register", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || data.message || "Registration failed" };
      }

      if (data.success) {
        return { 
          success: true, 
          verificationToken: data.verificationToken 
        };
      }

      return { success: false, error: data.error || data.message || "Registration failed" };
    } catch (error) {
      return { success: false, error: "Network error. Please try again." };
    }
  }, []);

  const verifyEmail = useCallback(async (verificationToken: string) => {
    try {
      const response = await fetch(new URL(`/api/auth/verify/${verificationToken}`, getApiUrl()).toString());
      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || data.message || "Verification failed" };
      }

      if (data.success && data.token && data.user) {
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token);
        await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        return { success: true };
      }

      return { success: false, error: data.error || data.message || "Verification failed" };
    } catch (error) {
      return { success: false, error: "Network error. Please try again." };
    }
  }, []);

  const signInWithApple = useCallback(async (data: AppleAuthData) => {
    try {
      const response = await fetch(new URL("/api/auth/apple", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (!response.ok) {
        return { success: false, error: responseData.error || responseData.message || "Apple sign-in failed" };
      }

      if (responseData.success && responseData.token && responseData.user) {
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, responseData.token);
        await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(responseData.user));
        setToken(responseData.token);
        setUser(responseData.user);
        return { success: true };
      }

      return { success: false, error: responseData.error || responseData.message || "Apple sign-in failed" };
    } catch (error) {
      return { success: false, error: "Network error. Please try again." };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      await AsyncStorage.removeItem(AUTH_USER_KEY);
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }, []);

  const updateProfile = useCallback(async (name: string) => {
    if (!token) {
      return { success: false, error: "Not authenticated" };
    }

    try {
      const response = await fetch(new URL("/api/auth/profile", getApiUrl()).toString(), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || "Failed to update profile" };
      }

      if (data.success && data.user) {
        const updatedUser = { ...user!, name: data.user.name };
        await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser));
        setUser(updatedUser);
        return { success: true };
      }

      return { success: false, error: "Failed to update profile" };
    } catch (error) {
      return { success: false, error: "Network error. Please try again." };
    }
  }, [token, user]);

  const refreshUser = useCallback(async () => {
    await refreshUserData();
  }, [token]);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    signIn,
    signUp,
    signInWithApple,
    signOut,
    verifyEmail,
    updateProfile,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
