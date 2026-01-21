import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import AddHoldingModal from "@/screens/AddHoldingModal";
import AIChatModal from "@/screens/AIChatModal";
import AssetDetailScreen from "@/screens/AssetDetailScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type RootStackParamList = {
  Main: undefined;
  AddHoldingModal: undefined;
  AIChatModal: undefined;
  AssetDetail: { id: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const opaqueScreenOptions = useScreenOptions({ transparent: false });

  return (
    <Stack.Navigator screenOptions={screenOptions}>
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
    </Stack.Navigator>
  );
}
