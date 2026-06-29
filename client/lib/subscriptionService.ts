import { getApiUrl } from "./query-client";

export interface SubscriptionSyncResponse {
  success: boolean;
  isPremium: boolean;
  updated: boolean;
  skipped?: boolean;
  error?: string;
}

export async function syncSubscriptionWithServer(
  token: string
): Promise<SubscriptionSyncResponse> {
  try {
    const response = await fetch(
      new URL("/api/subscription/sync", getApiUrl()).toString(),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        isPremium: false,
        updated: false,
        error: data.error || `Sync failed (${response.status})`,
      };
    }

    return {
      success: true,
      isPremium: !!data.isPremium,
      updated: !!data.updated,
      skipped: data.skipped,
    };
  } catch (error) {
    console.error("[Subscription] Server sync error:", error);
    return {
      success: false,
      isPremium: false,
      updated: false,
      error: "Network error during subscription sync",
    };
  }
}
