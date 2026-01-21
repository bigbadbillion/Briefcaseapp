import { getApiUrl } from "./query-client";

export interface AssetSearchResult {
  id: string;
  symbol: string;
  name: string;
  type: "crypto" | "stock" | "etf" | "bond" | "real_estate" | "commodity" | "cash";
  currentPrice?: number;
  imageUrl?: string;
}

export async function searchAssets(
  query: string,
  type?: string
): Promise<AssetSearchResult[]> {
  try {
    const apiUrl = getApiUrl();
    const url = new URL("/api/assets/search", apiUrl);
    url.searchParams.set("q", query);
    if (type) {
      url.searchParams.set("type", type);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error("Error searching assets:", error);
    return [];
  }
}

export async function getPopularAssets(type: string): Promise<AssetSearchResult[]> {
  try {
    const apiUrl = getApiUrl();
    const url = new URL(`/api/assets/popular/${encodeURIComponent(type)}`, apiUrl);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error("Error getting popular assets:", error);
    return [];
  }
}

export async function fetchAssetPrice(
  symbol: string,
  type: string,
  coinId?: string
): Promise<number | null> {
  try {
    const apiUrl = getApiUrl();
    
    if (type === "crypto") {
      const url = new URL("/api/prices/crypto", apiUrl);
      url.searchParams.set("symbols", coinId || symbol.toLowerCase());
      
      const response = await fetch(url.toString());
      if (!response.ok) return null;
      
      const data = await response.json();
      const prices = data.prices || [];
      const upperSymbol = symbol.toUpperCase();
      const found = prices.find((p: any) => p.symbol === upperSymbol || p.symbol?.toLowerCase() === symbol.toLowerCase());
      return found?.price || null;
    }
    
    if (type === "stock" || type === "etf") {
      const url = new URL("/api/prices/stocks", apiUrl);
      url.searchParams.set("symbols", symbol.toUpperCase());
      
      const response = await fetch(url.toString());
      if (!response.ok) return null;
      
      const data = await response.json();
      const prices = data.prices || [];
      const found = prices.find((p: any) => p.symbol === symbol.toUpperCase());
      return found?.price || null;
    }

    return null;
  } catch (error) {
    console.error("Error fetching asset price:", error);
    return null;
  }
}
