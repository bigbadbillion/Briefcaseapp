import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PriceData } from "@/lib/priceService";

const PRICE_CACHE_KEY = "@briefcase/last_prices";
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000;

interface CachedPriceEntry extends PriceData {
  cachedAt: number;
}

interface PriceCacheStore {
  [symbol: string]: CachedPriceEntry;
}

export async function loadPriceCache(): Promise<Map<string, PriceData>> {
  try {
    const raw = await AsyncStorage.getItem(PRICE_CACHE_KEY);
    if (!raw) return new Map();

    const store = JSON.parse(raw) as PriceCacheStore;
    const now = Date.now();
    const map = new Map<string, PriceData>();

    for (const [symbol, entry] of Object.entries(store)) {
      if (now - entry.cachedAt > MAX_CACHE_AGE_MS) continue;
      map.set(symbol.toUpperCase(), {
        symbol: entry.symbol,
        price: entry.price,
        change24h: entry.change24h,
        source: entry.source,
      });
    }

    return map;
  } catch (error) {
    console.error("Error loading price cache:", error);
    return new Map();
  }
}

export async function savePriceCache(prices: PriceData[]): Promise<void> {
  if (prices.length === 0) return;

  try {
    const raw = await AsyncStorage.getItem(PRICE_CACHE_KEY);
    const store: PriceCacheStore = raw ? JSON.parse(raw) : {};
    const now = Date.now();

    for (const price of prices) {
      if (price.price > 0) {
        store[price.symbol.toUpperCase()] = {
          ...price,
          cachedAt: now,
        };
      }
    }

    await AsyncStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(store));
  } catch (error) {
    console.error("Error saving price cache:", error);
  }
}

export function resolveHoldingPrice(
  symbol: string,
  purchasePrice: number,
  livePrice: PriceData | undefined,
  cachedPrice: PriceData | undefined
): number {
  if (livePrice && livePrice.price > 0) {
    return livePrice.price;
  }
  if (cachedPrice && cachedPrice.price > 0) {
    return cachedPrice.price;
  }
  return purchasePrice;
}
