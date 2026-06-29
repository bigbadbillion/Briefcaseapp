import { storage } from "../storage";
import {
  fetchRevenueCatPremiumStatus,
  isRevenueCatConfigured,
} from "./revenueCatService";

export interface PremiumSyncResult {
  isPremium: boolean;
  updated: boolean;
  skipped?: boolean;
  notFound?: boolean;
}

export async function syncUserPremiumFromRevenueCat(
  userId: string
): Promise<PremiumSyncResult> {
  const user = await storage.getUser(userId);
  if (!user) {
    return { isPremium: false, updated: false, notFound: true };
  }

  if (!isRevenueCatConfigured()) {
    console.warn(
      "[Subscription] REVENUECAT_SECRET_API_KEY missing — keeping existing is_premium"
    );
    return { isPremium: user.isPremium, updated: false, skipped: true };
  }

  const hasPremium = await fetchRevenueCatPremiumStatus(userId);

  if (user.isPremium === hasPremium) {
    return { isPremium: hasPremium, updated: false };
  }

  await storage.updateUser(userId, { isPremium: hasPremium });
  console.info(
    `[Subscription] Updated is_premium for ${userId}: ${user.isPremium} → ${hasPremium}`
  );

  return { isPremium: hasPremium, updated: true };
}
