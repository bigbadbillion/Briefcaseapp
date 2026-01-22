import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchAllPrices, createPriceMap, isCryptoSymbol, type PriceData } from "./priceService";

export interface Holding {
  id: string;
  name: string;
  symbol: string;
  type: "stock" | "crypto" | "etf" | "bond" | "real_estate" | "commodity" | "cash";
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  purchaseDate: string;
  createdAt: string;
}

const HOLDINGS_KEY = "@briefcase_holdings";
const THEME_KEY = "@briefcase_theme_mode";

function generateUniqueId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export async function getHoldings(): Promise<Holding[]> {
  try {
    const data = await AsyncStorage.getItem(HOLDINGS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error reading holdings:", error);
    return [];
  }
}

export async function saveHolding(holding: Omit<Holding, "id" | "createdAt">): Promise<Holding> {
  try {
    const holdings = await getHoldings();
    const newHolding: Holding = {
      ...holding,
      id: generateUniqueId(),
      createdAt: new Date().toISOString(),
    };
    holdings.push(newHolding);
    await AsyncStorage.setItem(HOLDINGS_KEY, JSON.stringify(holdings));
    return newHolding;
  } catch (error) {
    console.error("Error saving holding:", error);
    throw error;
  }
}

export async function updateHolding(id: string, updates: Partial<Holding>): Promise<Holding | null> {
  try {
    const holdings = await getHoldings();
    const index = holdings.findIndex((h) => h.id === id);
    if (index === -1) return null;

    holdings[index] = { ...holdings[index], ...updates };
    await AsyncStorage.setItem(HOLDINGS_KEY, JSON.stringify(holdings));
    return holdings[index];
  } catch (error) {
    console.error("Error updating holding:", error);
    throw error;
  }
}

export async function deleteHolding(id: string): Promise<boolean> {
  try {
    const holdings = await getHoldings();
    const filtered = holdings.filter((h) => h.id !== id);
    await AsyncStorage.setItem(HOLDINGS_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error("Error deleting holding:", error);
    return false;
  }
}

export async function clearAllHoldings(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HOLDINGS_KEY);
  } catch (error) {
    console.error("Error clearing holdings:", error);
  }
}

export function generateMockPrice(basePrice: number): number {
  const change = (Math.random() - 0.5) * 0.1;
  return basePrice * (1 + change);
}

export async function updateHoldingsWithLivePrices(): Promise<{
  holdings: Holding[];
  updated: number;
  failed: string[];
}> {
  try {
    const holdings = await getHoldings();
    if (holdings.length === 0) {
      return { holdings: [], updated: 0, failed: [] };
    }

    const symbols = holdings.map((h) => h.symbol);
    const priceResponse = await fetchAllPrices(symbols);
    const priceMap = createPriceMap(priceResponse.prices);

    let updated = 0;
    const failed: string[] = [];

    const updatedHoldings = holdings.map((holding) => {
      const priceData = priceMap.get(holding.symbol.toUpperCase());
      if (priceData) {
        updated++;
        return { ...holding, currentPrice: priceData.price };
      } else {
        failed.push(holding.symbol);
        return holding;
      }
    });

    await AsyncStorage.setItem(HOLDINGS_KEY, JSON.stringify(updatedHoldings));

    return { holdings: updatedHoldings, updated, failed };
  } catch (error) {
    console.error("Error updating holdings with live prices:", error);
    const holdings = await getHoldings();
    return { holdings, updated: 0, failed: holdings.map((h) => h.symbol) };
  }
}

export async function getHoldingsWithLivePrices(): Promise<Holding[]> {
  const result = await updateHoldingsWithLivePrices();
  return result.holdings;
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
    const currentGain = ((h.currentPrice - h.purchasePrice) / h.purchasePrice) * 100;
    const bestGain = best
      ? ((best.currentPrice - best.purchasePrice) / best.purchasePrice) * 100
      : -Infinity;
    return currentGain > bestGain ? h : best;
  }, null as Holding | null);

  const worstPerformer = holdings.reduce((worst, h) => {
    const currentGain = ((h.currentPrice - h.purchasePrice) / h.purchasePrice) * 100;
    const worstGain = worst
      ? ((worst.currentPrice - worst.purchasePrice) / worst.purchasePrice) * 100
      : Infinity;
    return currentGain < worstGain ? h : worst;
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
  const concentrationPenalty = herfindahl * 50;

  const typeBonus = Math.min(typeCount * 10, 30);
  const countBonus = Math.min(holdingsCount * 3, 20);

  return Math.min(100, Math.max(0, 50 + typeBonus + countBonus - concentrationPenalty));
}

function calculateRiskScore(holdings: Holding[]): number {
  if (holdings.length === 0) return 0;

  const typeRisk: Record<string, number> = {
    cash: 5,
    bond: 20,
    real_estate: 40,
    etf: 45,
    stock: 60,
    commodity: 65,
    crypto: 85,
  };

  const totalValue = holdings.reduce((sum, h) => sum + h.currentPrice * h.quantity, 0);
  
  let weightedRisk = 0;
  for (const h of holdings) {
    const weight = (h.currentPrice * h.quantity) / totalValue;
    const risk = typeRisk[h.type] || 50;
    weightedRisk += weight * risk;
  }

  const herfindahl = holdings.reduce((sum, h) => {
    const weight = (h.currentPrice * h.quantity) / totalValue;
    return sum + weight * weight;
  }, 0);

  const concentrationRisk = herfindahl * 20;

  return Math.min(100, Math.max(0, weightedRisk + concentrationRisk));
}

