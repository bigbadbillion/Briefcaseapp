import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Platform, AppState, AppStateStatus } from "react-native";
import * as Application from "expo-application";
import Constants from "expo-constants";
import Purchases, { 
  PurchasesOffering, 
  PurchasesPackage,
  LOG_LEVEL 
} from "react-native-purchases";
import { useAuth } from "./AuthContext";
import { REVENUECAT_ENTITLEMENT_ID } from "@shared/subscription";
import { syncSubscriptionWithServer } from "@/lib/subscriptionService";

// Read API keys from app.config.js extra field (more reliable for builds)
const REVENUECAT_API_KEY = Constants.expoConfig?.extra?.revenueCatApiKey || "";
const REVENUECAT_TEST_API_KEY = Constants.expoConfig?.extra?.revenueCatTestApiKey || "";

// Debug: Log what we got from config
console.log("[RevenueCat] CONFIG CHECK - Production key exists:", !!REVENUECAT_API_KEY, "length:", REVENUECAT_API_KEY.length);
console.log("[RevenueCat] CONFIG CHECK - Test key exists:", !!REVENUECAT_TEST_API_KEY, "length:", REVENUECAT_TEST_API_KEY.length);

const isExpoGo = Application.applicationId === "host.exp.Exponent";

const getApiKey = (): string => {
  if (isExpoGo) {
    console.log("[RevenueCat] Running in Expo Go - using Test Store API key");
    console.log("[RevenueCat] Test key value (first 10):", REVENUECAT_TEST_API_KEY.substring(0, 10) || "EMPTY");
    return REVENUECAT_TEST_API_KEY;
  }
  console.log("[RevenueCat] Running in standalone app - using production API key");
  console.log("[RevenueCat] Prod key value (first 10):", REVENUECAT_API_KEY.substring(0, 10) || "EMPTY");
  return REVENUECAT_API_KEY;
};

// Export for debug display
export const getRevenueCatDebugInfo = () => ({
  isExpoGo,
  hasProductionKey: !!REVENUECAT_API_KEY,
  productionKeyLength: REVENUECAT_API_KEY.length,
  hasTestKey: !!REVENUECAT_TEST_API_KEY,
  testKeyLength: REVENUECAT_TEST_API_KEY.length,
  activeKeyPrefix: isExpoGo 
    ? REVENUECAT_TEST_API_KEY.substring(0, 8) 
    : REVENUECAT_API_KEY.substring(0, 8),
});

interface SubscriptionContextType {
  isPremium: boolean;
  isLoading: boolean;
  offering: PurchasesOffering | null;
  purchasePackage: (pkg: PurchasesPackage) => Promise<{ success: boolean; error?: string }>;
  restorePurchases: () => Promise<{ success: boolean; error?: string }>;
  refreshSubscriptionStatus: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, token, refreshUser, setPremiumStatus } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  const syncPremiumToDatabase = useCallback(async (): Promise<boolean | null> => {
    if (!token || !isAuthenticated) {
      return null;
    }

    const result = await syncSubscriptionWithServer(token);
    if (!result.success) {
      console.warn("[RevenueCat] Server premium sync failed:", result.error);
      return null;
    }

    if (result.updated) {
      console.log("[RevenueCat] Synced is_premium to database:", result.isPremium);
    }

    if (result.user) {
      setPremiumStatus(result.user.isPremium);
    } else {
      await refreshUser();
    }

    return result.isPremium;
  }, [token, isAuthenticated, refreshUser, setPremiumStatus]);

  const resolvePremiumStatus = useCallback(
    async (options?: { syncServer?: boolean }) => {
      const customerInfo = await Purchases.getCustomerInfo();
      const rcPremium =
        customerInfo.entitlements.active[REVENUECAT_ENTITLEMENT_ID] !== undefined;

      let serverPremium: boolean | null = null;
      if (options?.syncServer !== false && isAuthenticated && token) {
        serverPremium = await syncPremiumToDatabase();
      }

      const authPremium = user?.isPremium ?? false;
      const effectivePremium =
        rcPremium || serverPremium === true || authPremium;

      setIsPremium(effectivePremium);
      if (effectivePremium) {
        setPremiumStatus(true);
      }

      return effectivePremium;
    },
    [isAuthenticated, token, syncPremiumToDatabase, setPremiumStatus, user?.isPremium]
  );

  const syncPremiumWithRetry = useCallback(
    async (expectedPremium: boolean, maxAttempts = 4): Promise<boolean> => {
      const delays = [0, 400, 800, 1200];

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (delays[attempt] > 0) {
          await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
        }

        const serverPremium = await syncPremiumToDatabase();
        if (serverPremium === expectedPremium) {
          return serverPremium;
        }
      }

      return expectedPremium;
    },
    [syncPremiumToDatabase]
  );

  const applyPremiumStatus = useCallback(
    (hasPremium: boolean) => {
      setIsPremium(hasPremium);
      if (hasPremium) {
        setPremiumStatus(true);
      }
    },
    [setPremiumStatus]
  );

  useEffect(() => {
    if (user?.isPremium) {
      setIsPremium(true);
    }
  }, [user?.id, user?.isPremium]);

  useEffect(() => {
    if (Platform.OS === "web") {
      setIsLoading(false);
      return;
    }

    const initializePurchases = async () => {
      try {
        const apiKey = getApiKey();
        
        if (!apiKey) {
          console.warn("[RevenueCat] API key not configured");
          setIsLoading(false);
          return;
        }

        console.log("[RevenueCat] Initializing with API key:", apiKey.substring(0, 10) + "...");
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        
        await Purchases.configure({ 
          apiKey: apiKey,
        });
        
        setIsConfigured(true);
        await loadOfferings();
      } catch (error) {
        console.error("Error initializing RevenueCat:", error);
        setIsLoading(false);
      }
    };

    initializePurchases();
  }, []);

  useEffect(() => {
    if (isConfigured && !isAuthenticated) {
      setIsLoading(false);
    }
  }, [isConfigured, isAuthenticated]);

  useEffect(() => {
    if (!isConfigured || !isAuthenticated || !user) return;

    const identifyUser = async () => {
      try {
        setIsLoading(true);
        await Purchases.logIn(user.id);
        // Re-link App Store receipt after reinstall / new device install
        await Purchases.restorePurchases();
        await resolvePremiumStatus();
      } catch (error) {
        console.error("Error identifying user:", error);
      } finally {
        setIsLoading(false);
      }
    };

    identifyUser();
  }, [isConfigured, isAuthenticated, user?.id, resolvePremiumStatus]);

  useEffect(() => {
    if (Platform.OS === "web" || !isConfigured) return;

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [isConfigured]);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === "active") {
      await refreshSubscriptionStatus();
    }
  };

  const refreshSubscriptionStatus = useCallback(async () => {
    if (Platform.OS === "web" || !isConfigured) return;

    try {
      setIsLoading(true);
      await resolvePremiumStatus();
    } catch (error) {
      console.error("Error getting customer info:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isConfigured, resolvePremiumStatus]);

  const loadOfferings = async () => {
    try {
      console.log("[RevenueCat] === LOADING OFFERINGS ===");
      console.log("[RevenueCat] API Key (first 15 chars):", getApiKey().substring(0, 15) + "...");
      console.log("[RevenueCat] Is Expo Go:", isExpoGo);
      
      const offerings = await Purchases.getOfferings();
      
      console.log("[RevenueCat] Offerings response received");
      console.log("[RevenueCat] All offering identifiers:", Object.keys(offerings.all || {}));
      console.log("[RevenueCat] Current offering:", offerings.current?.identifier || "NONE");
      
      if (offerings.current) {
        console.log("[RevenueCat] Current offering packages count:", offerings.current.availablePackages?.length || 0);
        
        offerings.current.availablePackages?.forEach((pkg, i) => {
          console.log(`[RevenueCat] Package ${i}: ${pkg.identifier} (${pkg.packageType})`, {
            productId: pkg.product?.identifier,
            price: pkg.product?.priceString,
            title: pkg.product?.title,
          });
        });
        
        setOffering(offerings.current);
      } else {
        console.warn("[RevenueCat] No current offering configured!");
        console.warn("[RevenueCat] Available offerings:", JSON.stringify(offerings.all, null, 2));
      }
      console.log("[RevenueCat] === END OFFERINGS ===");
    } catch (error: any) {
      console.error("[RevenueCat] Error loading offerings:", error);
      console.error("[RevenueCat] Error code:", error?.code);
      console.error("[RevenueCat] Error message:", error?.message);
      console.error("[RevenueCat] Error userInfo:", error?.userInfo);
    }
  };

  const purchasePackage = async (pkg: PurchasesPackage): Promise<{ success: boolean; error?: string }> => {
    if (Platform.OS === "web") {
      return { success: false, error: "Subscriptions are not available on web" };
    }

    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      console.log("[RevenueCat] Purchase completed, checking entitlements");
      console.log("[RevenueCat] Active entitlements:", Object.keys(customerInfo.entitlements.active));
      
      let hasPremium =
        customerInfo.entitlements.active[REVENUECAT_ENTITLEMENT_ID] !== undefined;
      console.log("[RevenueCat] Has premium entitlement:", hasPremium);

      if (!hasPremium) {
        const refreshed = await Purchases.getCustomerInfo();
        hasPremium =
          refreshed.entitlements.active[REVENUECAT_ENTITLEMENT_ID] !== undefined;
        console.log("[RevenueCat] Re-checked premium entitlement:", hasPremium);
      }

      if (hasPremium) {
        applyPremiumStatus(true);
        void syncPremiumWithRetry(true);
        return { success: true };
      }

      console.log("[RevenueCat] Entitlement not active after purchase");
      return { success: false, error: "Subscription could not be activated. Please try Restore Purchases." };
    } catch (error: any) {
      if (error.userCancelled) {
        console.log("[RevenueCat] User cancelled purchase");
        return { success: false };
      }
      console.error("[RevenueCat] Purchase error:", error);
      return { success: false, error: error.message || "Purchase failed" };
    }
  };

  const restorePurchases = async (): Promise<{ success: boolean; error?: string }> => {
    if (Platform.OS === "web") {
      return { success: false, error: "Subscriptions are not available on web" };
    }

    try {
      const customerInfo = await Purchases.restorePurchases();
      const hasPremium =
        customerInfo.entitlements.active[REVENUECAT_ENTITLEMENT_ID] !== undefined;

      if (hasPremium) {
        applyPremiumStatus(true);
        void syncPremiumWithRetry(true);
        return { success: true };
      }

      const serverPremium = await syncPremiumToDatabase();
      if (serverPremium) {
        applyPremiumStatus(true);
        return { success: true };
      }

      return { success: false, error: "No active subscription found" };
    } catch (error: any) {
      console.error("Restore error:", error);
      return { success: false, error: error.message || "Restore failed" };
    }
  };

  return (
    <SubscriptionContext.Provider
      value={{
        isPremium,
        isLoading,
        offering,
        purchasePackage,
        restorePurchases,
        refreshSubscriptionStatus,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}
