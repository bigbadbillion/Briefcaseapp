import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl, apiRequest } from "@/lib/query-client";
import { fetchAllPrices, createPriceMap, type PriceData } from "@/lib/priceService";
import {
  loadPriceCache,
  savePriceCache,
  resolveHoldingPrice,
} from "@/lib/priceCache";
import {
  calculatePortfolioMetrics as computePortfolioMetrics,
  type PortfolioHoldingInput,
} from "@shared/portfolioMetrics";

export interface Holding {
  id: string;
  userId: string;
  name: string;
  symbol: string;
  type: "stock" | "crypto" | "etf" | "bond" | "real_estate" | "commodity" | "cash";
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  purchaseDate: string;
  notes?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HoldingInput {
  name: string;
  symbol: string;
  type: "stock" | "crypto" | "etf" | "bond" | "real_estate" | "commodity" | "cash";
  quantity: number;
  purchasePrice: number;
  purchaseDate: string;
  notes?: string;
  imageUrl?: string;
}

async function fetchHoldings(token: string): Promise<Holding[]> {
  const response = await fetch(new URL("/api/holdings", getApiUrl()).toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  if (!response.ok) {
    throw new Error("Failed to fetch holdings");
  }
  
  const data = await response.json();
  return data.holdings || [];
}

async function fetchHoldingsWithPrices(token: string): Promise<Holding[]> {
  const holdings = await fetchHoldings(token);

  if (holdings.length === 0) return [];

  const symbols = holdings.map((h) => h.symbol);
  const cachedPrices = await loadPriceCache();
  const priceResponse = await fetchAllPrices(symbols);
  const priceMap = createPriceMap(priceResponse.prices);

  if (priceResponse.prices.length > 0) {
    await savePriceCache(priceResponse.prices);
  }

  const mergedPrices = new Map(cachedPrices);
  for (const price of priceResponse.prices) {
    mergedPrices.set(price.symbol.toUpperCase(), price);
  }

  return holdings.map((holding) => ({
    ...holding,
    currentPrice: resolveHoldingPrice(
      holding.symbol,
      holding.purchasePrice,
      priceMap.get(holding.symbol.toUpperCase()),
      mergedPrices.get(holding.symbol.toUpperCase())
    ),
  }));
}

export function useHoldings() {
  const { token, isAuthenticated } = useAuth();
  
  return useQuery({
    queryKey: ["/api/holdings"],
    queryFn: () => fetchHoldingsWithPrices(token!),
    enabled: isAuthenticated && !!token,
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function useAddHolding() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (holding: HoldingInput) => {
      const response = await fetch(new URL("/api/holdings", getApiUrl()).toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(holding),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add holding");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/holdings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/insights"] });
    },
  });
}

export function useUpdateHolding() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<HoldingInput> }) => {
      const response = await fetch(new URL(`/api/holdings/${id}`, getApiUrl()).toString(), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update holding");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/holdings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/insights"] });
    },
  });
}

export function useDeleteHolding() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(new URL(`/api/holdings/${id}`, getApiUrl()).toString(), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete holding");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/holdings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/insights"] });
    },
  });
}

export function useClearAllHoldings() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await fetch(new URL("/api/holdings", getApiUrl()).toString(), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to clear holdings");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/holdings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/insights"] });
    },
  });
}

export function calculatePortfolioMetrics(holdings: Holding[]) {
  const inputs: PortfolioHoldingInput[] = holdings.map((h) => ({
    symbol: h.symbol,
    name: h.name,
    type: h.type,
    quantity: h.quantity,
    purchasePrice: h.purchasePrice,
    currentPrice: h.currentPrice,
    notes: h.notes,
  }));
  return computePortfolioMetrics(inputs);
}
