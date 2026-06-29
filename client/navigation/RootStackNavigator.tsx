import React from "react";
import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import AddHoldingModal from "@/screens/AddHoldingModal";
import AIChatModal from "@/screens/AIChatModal";
import AssetDetailScreen from "@/screens/AssetDetailScreen";
import AuthScreen from "@/screens/AuthScreen";
import PaywallScreen from "@/screens/PaywallScreen";
import WelcomePremiumScreen from "@/screens/WelcomePremiumScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  AddHoldingModal: undefined;
  AIChatModal: undefined;
  AssetDetail: { id: string };
  Paywall: undefined;
  WelcomePremium: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const opaqueScreenOptions = useScreenOptions({ transparent: false });
  const { isAuthenticated, isLoading } = useAuth();
  const { theme } = useTheme();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.backgroundRoot }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {isAuthenticated ? (
        <>
          <Stack.Screen
            name="Main"
            component={MainTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="AddHoldingModal"
            component={AddHoldingModal}
            options={{
              ...opaqueScreenOptions,
              presentation: "modal",
              headerTitle: "Add Holding",
            }}
          />
          <Stack.Screen
            name="AIChatModal"
            component={AIChatModal}
            options={{
              ...opaqueScreenOptions,
              presentation: "modal",
              headerTitle: "Ask AI",
            }}
          />
          <Stack.Screen
            name="AssetDetail"
            component={AssetDetailScreen}
            options={{
              headerTitle: "Asset Details",
            }}
          />
          <Stack.Screen
            name="Paywall"
            component={PaywallScreen}
            options={{
              presentation: "modal",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="WelcomePremium"
            component={WelcomePremiumScreen}
            options={{
              presentation: "modal",
              headerShown: false,
              gestureEnabled: false,
            }}
          />
        </>
      ) : (
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{ headerShown: false }}
        />
      )}
    </Stack.Navigator>
  );
}
