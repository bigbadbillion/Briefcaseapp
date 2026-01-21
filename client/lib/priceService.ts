import { getApiUrl } from "./query-client";

export interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  source: "coingecko" | "alphavantage" | "mock";
}

export interface PriceResponse {
  prices: PriceData[];
  timestamp: number;
  hasAlphaVantage?: boolean;
  message?: string;
}

export interface HealthResponse {
  status: string;
  timestamp: number;
  services: {
    coingecko: boolean;
    alphavantage: boolean;
    gemini: boolean;
  };
}

const CRYPTO_SYMBOLS = new Set([
  "BTC", "ETH", "SOL", "DOGE", "ADA", "XRP", "DOT", "AVAX",
  "MATIC", "LINK", "UNI", "ATOM", "LTC", "BCH", "ALGO",
  "XLM", "VET", "FIL", "TRX", "ETC", "SHIB", "APE",
  "NEAR", "FTM", "SAND", "MANA", "AXS", "AAVE", "MKR", "CRV",
]);

export function isCryptoSymbol(symbol: string): boolean {
  return CRYPTO_SYMBOLS.has(symbol.toUpperCase());
}

export async function fetchCryptoPrices(symbols: string[]): Promise<PriceData[]> {
  if (symbols.length === 0) return [];

  try {
    const apiUrl = getApiUrl();
    const url = new URL("/api/prices/crypto", apiUrl);
    url.searchParams.set("symbols", symbols.join(","));

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: PriceResponse = await response.json();
    return data.prices;
  } catch (error) {
    console.error("Error fetching crypto prices:", error);
    return [];
  }
}

export async function fetchStockPrices(symbols: string[]): Promise<PriceData[]> {
  if (symbols.length === 0) return [];

  try {
    const apiUrl = getApiUrl();
    const url = new URL("/api/prices/stocks", apiUrl);
    url.searchParams.set("symbols", symbols.join(","));

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: PriceResponse = await response.json();
    return data.prices;
  } catch (error) {
    console.error("Error fetching stock prices:", error);
    return [];
  }
}

export async function fetchAllPrices(symbols: string[]): Promise<PriceResponse> {
  if (symbols.length === 0) {
    return { prices: [], timestamp: Date.now() };
  }

  try {
    const apiUrl = getApiUrl();
    const url = new URL("/api/prices/batch", apiUrl);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ symbols }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching prices:", error);
    return { prices: [], timestamp: Date.now() };
  }
}

export async function checkApiHealth(): Promise<HealthResponse | null> {
  try {
    const apiUrl = getApiUrl();
    const url = new URL("/api/health", apiUrl);

    const response = await fetch(url.toString());
    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error checking API health:", error);
    return null;
  }
}

export function createPriceMap(prices: PriceData[]): Map<string, PriceData> {
  const map = new Map<string, PriceData>();
  for (const price of prices) {
    map.set(price.symbol.toUpperCase(), price);
  }
  return map;
}
