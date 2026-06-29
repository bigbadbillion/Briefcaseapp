import { REVENUECAT_ENTITLEMENT_ID } from "@shared/subscription";

const REVENUECAT_API_BASE = "https://api.revenuecat.com/v1";

interface RevenueCatEntitlement {
  expires_date: string | null;
  grace_period_expires_date?: string | null;
  product_identifier?: string;
}

interface RevenueCatSubscriberResponse {
  subscriber?: {
    entitlements?: Record<string, RevenueCatEntitlement>;
  };
}

function getSecretKey(): string | undefined {
  return process.env.REVENUECAT_SECRET_API_KEY;
}

function isEntitlementActive(entitlement: RevenueCatEntitlement): boolean {
  const now = Date.now();

  if (entitlement.grace_period_expires_date) {
    const graceEnd = Date.parse(entitlement.grace_period_expires_date);
    if (!Number.isNaN(graceEnd) && graceEnd > now) {
      return true;
    }
  }

  if (!entitlement.expires_date) {
    return true;
  }

  const expires = Date.parse(entitlement.expires_date);
  return !Number.isNaN(expires) && expires > now;
}

export function isRevenueCatConfigured(): boolean {
  return !!getSecretKey();
}

export async function fetchRevenueCatPremiumStatus(
  appUserId: string
): Promise<boolean> {
  const secretKey = getSecretKey();
  if (!secretKey) {
    console.warn("[RevenueCat] REVENUECAT_SECRET_API_KEY not configured");
    return false;
  }

  const url = `${REVENUECAT_API_BASE}/subscribers/${encodeURIComponent(appUserId)}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
  });

  if (response.status === 404) {
    console.warn(
      `[RevenueCat] No subscriber record for app user ${appUserId} (404)`
    );
    return false;
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `RevenueCat API error ${response.status} for user ${appUserId}: ${body}`
    );
  }

  const data = (await response.json()) as RevenueCatSubscriberResponse;
  const entitlement =
    data.subscriber?.entitlements?.[REVENUECAT_ENTITLEMENT_ID];

  if (!entitlement) {
    const known = Object.keys(data.subscriber?.entitlements ?? {});
    console.warn(
      `[RevenueCat] Entitlement "${REVENUECAT_ENTITLEMENT_ID}" not found for ${appUserId}. Known: ${known.join(", ") || "none"}`
    );
    return false;
  }

  return isEntitlementActive(entitlement);
}

export function verifyWebhookAuthorization(
  authorizationHeader: string | undefined
): boolean {
  const expected = process.env.REVENUECAT_WEBHOOK_AUTHORIZATION;
  if (!expected) {
    return false;
  }

  if (!authorizationHeader) {
    return false;
  }

  const normalizedExpected = expected.startsWith("Bearer ")
    ? expected
    : `Bearer ${expected}`;
  const normalizedHeader = authorizationHeader.startsWith("Bearer ")
    ? authorizationHeader
    : `Bearer ${authorizationHeader}`;

  return normalizedHeader === normalizedExpected;
}
