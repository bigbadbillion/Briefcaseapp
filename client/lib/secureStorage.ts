import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

// SecureStore is not supported on web, so fall back to AsyncStorage there.
const isWeb = Platform.OS === "web";

/** SecureStore keys must match /^[\\w.-]+$/ (no @, /, etc.). */
export function toSecureStoreKey(key: string): string {
  return key.replace(/[^\w.-]/g, "_");
}

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (isWeb) {
      return AsyncStorage.getItem(key);
    }
    return SecureStore.getItemAsync(toSecureStoreKey(key));
  },

  async setItem(key: string, value: string): Promise<void> {
    if (isWeb) {
      await AsyncStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(toSecureStoreKey(key), value);
  },

  async removeItem(key: string): Promise<void> {
    if (isWeb) {
      await AsyncStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(toSecureStoreKey(key));
  },
};
