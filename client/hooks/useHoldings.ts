import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl, apiRequest } from "@/lib/query-client";
import { fetchAllPrices, createPriceMap, type PriceData } from "@/lib/priceService";

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
  
  const symbols = holdings.map(h => h.symbol);
  const priceResponse = await fetchAllPrices(symbols);
  const priceMap = createPriceMap(priceResponse.prices);
  
  return holdings.map(holding => ({
    ...holding,
    currentPrice: priceMap.get(holding.symbol)?.price ?? holding.purchasePrice,
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
    },
  });
}

export function calculatePortfolioMetrics(holdings: Holding[]) {
  const totalValue = holdings.reduce(
    (sum, h) => sum + h.currentPrice * h.quantity,
    0
  );
  const totalCost = holdings.reduce(
    (sum, h) => sum + h.purchasePrice * h.quantity,
    0
  );
  const totalGainLoss = totalValue - totalCost;
  const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

  const typeAllocation = holdings.reduce((acc, h) => {
    const value = h.currentPrice * h.quantity;
    acc[h.type] = (acc[h.type] || 0) + value;
    return acc;
  }, {} as Record<string, number>);

  const bestPerformer = holdings.reduce((best, h) => {
    const gain = ((h.currentPrice - h.purchasePrice) / h.purchasePrice) * 100;
    const bestGain = best
      ? ((best.currentPrice - best.purchasePrice) / best.purchasePrice) * 100
      : -Infinity;
    return gain > bestGain ? h : best;
  }, null as Holding | null);

  const worstPerformer = holdings.reduce((worst, h) => {
    const gain = ((h.currentPrice - h.purchasePrice) / h.purchasePrice) * 100;
    const worstGain = worst
      ? ((worst.currentPrice - worst.purchasePrice) / worst.purchasePrice) * 100
      : Infinity;
    return gain < worstGain ? h : worst;
  }, null as Holding | null);

  const diversificationScore = calculateDiversificationScore(holdings);
  const riskScore = calculateRiskScore(holdings);

  return {
    totalValue,
    totalCost,
    totalGainLoss,
    totalGainLossPercent,
    typeAllocation,
    bestPerformer,
    worstPerformer,
    diversificationScore,
    riskScore,
  };
}

function calculateDiversificationScore(holdings: Holding[]): number {
  if (holdings.length === 0) return 0;
  if (holdings.length === 1) return 20;

  const totalValue = holdings.reduce((sum, h) => sum + h.currentPrice * h.quantity, 0);
  const typeCount = new Set(holdings.map((h) => h.type)).size;
  const holdingsCount = holdings.length;

  const weights = holdings.map((h) => (h.currentPrice * h.quantity) / totalValue);
  const herfindahl = weights.reduce((sum, w) => sum + w * w, 0);
  const concentrationPenalty = Math.max(0, (herfindahl - 0.1) * 50);

  const typeBonus = typeCount * 10;
  const countBonus = Math.min(holdingsCount * 3, 20);

  return Math.min(100, Math.max(0, typeBonus + countBonus + 30 - concentrationPenalty));
}

function calculateRiskScore(holdings: Holding[]): number {
  if (holdings.length === 0) return 0;

  const riskWeights: Record<string, number> = {
    crypto: 9,
    stock: 6,
    etf: 4,
    commodity: 5,
    real_estate: 3,
    bond: 2,
    cash: 1,
  };

  const totalValue = holdings.reduce((sum, h) => sum + h.currentPrice * h.quantity, 0);
  if (totalValue === 0) return 0;

  let weightedRisk = 0;
  for (const h of holdings) {
    const weight = (h.currentPrice * h.quantity) / totalValue;
    weightedRisk += weight * (riskWeights[h.type] || 5);
  }

  const herfindahl = holdings.reduce((sum, h) => {
    const w = (h.currentPrice * h.quantity) / totalValue;
    return sum + w * w;
  }, 0);

  const concentrationRisk = herfindahl * 20;
  return Math.min(100, Math.round((weightedRisk * 10 + concentrationRisk)));
}
