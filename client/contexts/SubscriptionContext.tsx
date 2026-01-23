import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Platform, AppState, AppStateStatus } from "react-native";
import * as Application from "expo-application";
import Purchases, { 
  CustomerInfo, 
  PurchasesOffering, 
  PurchasesPackage,
  LOG_LEVEL 
} from "react-native-purchases";
import { useAuth } from "./AuthContext";

const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || "";
const REVENUECAT_TEST_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY || "";
const ENTITLEMENT_ID = "premium";

const isExpoGo = Application.applicationId === "host.exp.Exponent";

const getApiKey = (): string => {
  if (isExpoGo) {
    console.log("[RevenueCat] Running in Expo Go - using Test Store API key");
    return REVENUECAT_TEST_API_KEY;
  }
  console.log("[RevenueCat] Running in standalone app - using production API key");
  return REVENUECAT_API_KEY;
};

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
  const { user, isAuthenticated } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

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
        await refreshSubscriptionStatus();
        await loadOfferings();
      } catch (error) {
        console.error("Error initializing RevenueCat:", error);
        setIsLoading(false);
      }
    };

    initializePurchases();
  }, []);

  useEffect(() => {
    if (!isConfigured || !isAuthenticated || !user) return;

    const identifyUser = async () => {
      try {
        await Purchases.logIn(user.id);
        await refreshSubscriptionStatus();
      } catch (error) {
        console.error("Error identifying user:", error);
      }
    };

    identifyUser();
  }, [isConfigured, isAuthenticated, user?.id]);

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
      const customerInfo = await Purchases.getCustomerInfo();
      const hasPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      setIsPremium(hasPremium);
    } catch (error) {
      console.error("Error getting customer info:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isConfigured]);

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
      const hasPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      setIsPremium(hasPremium);
      return { success: hasPremium };
    } catch (error: any) {
      if (error.userCancelled) {
        return { success: false };
      }
      console.error("Purchase error:", error);
      return { success: false, error: error.message || "Purchase failed" };
    }
  };

  const restorePurchases = async (): Promise<{ success: boolean; error?: string }> => {
    if (Platform.OS === "web") {
      return { success: false, error: "Subscriptions are not available on web" };
    }

    try {
      const customerInfo = await Purchases.restorePurchases();
      const hasPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      setIsPremium(hasPremium);
      
      if (hasPremium) {
        return { success: true };
      } else {
        return { success: false, error: "No active subscription found" };
      }
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
