import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Platform, AppState, AppStateStatus } from "react-native";
import Purchases, { 
  CustomerInfo, 
  PurchasesOffering, 
  PurchasesPackage,
  LOG_LEVEL 
} from "react-native-purchases";
import { useAuth } from "./AuthContext";

const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || "";
const ENTITLEMENT_ID = "premium";

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
        if (!REVENUECAT_API_KEY) {
          console.warn("RevenueCat API key not configured");
          setIsLoading(false);
          return;
        }

        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        
        await Purchases.configure({ 
          apiKey: REVENUECAT_API_KEY,
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
      console.log("[RevenueCat] Loading offerings...");
      const offerings = await Purchases.getOfferings();
      console.log("[RevenueCat] All offerings:", JSON.stringify(offerings, null, 2));
      console.log("[RevenueCat] Current offering:", offerings.current);
      
      if (offerings.current) {
        console.log("[RevenueCat] Current offering packages:", offerings.current.availablePackages);
        setOffering(offerings.current);
      } else {
        console.warn("[RevenueCat] No current offering configured. Please set up an offering in RevenueCat dashboard.");
      }
    } catch (error) {
      console.error("[RevenueCat] Error loading offerings:", error);
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
