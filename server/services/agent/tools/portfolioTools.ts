import { storage } from "../../../storage";
import {
  getAllPrices,
  isCryptoSymbol,
} from "../../priceService";
import { calculatePortfolioMetrics } from "@shared/portfolioMetrics";
import type { PortfolioHoldingInput } from "@shared/portfolioMetrics";
import { wrapToolOutput } from "../delimiters";
import type { SessionToolData } from "../types";
import type { Holding } from "@shared/schema";

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : parseFloat(value) || 0;
}

export async function fetchUserHoldingsEnriched(
  userId: string
): Promise<{ holdings: PortfolioHoldingInput[]; metrics: ReturnType<typeof calculatePortfolioMetrics> }> {
  const dbHoldings = await storage.getHoldingsByUser(userId);

  const cryptoSymbols = dbHoldings
    .filter((h: Holding) => isCryptoSymbol(h.symbol))
    .map((h: Holding) => h.symbol);
  const stockSymbols = dbHoldings
    .filter((h: Holding) => !isCryptoSymbol(h.symbol))
    .map((h: Holding) => h.symbol);

  const prices = await getAllPrices(
    cryptoSymbols,
    stockSymbols,
    process.env.FINNHUB_API_KEY
  );
  const priceMap = new Map(prices.map((p: { symbol: string; price: number }) => [p.symbol.toUpperCase(), p.price]));

  const holdings: PortfolioHoldingInput[] = dbHoldings.map((h: Holding) => {
    const purchasePrice = toNumber(h.purchasePrice);
    const quantity = toNumber(h.quantity);
    const currentPrice =
      priceMap.get(h.symbol.toUpperCase()) ?? purchasePrice;

    return {
      symbol: h.symbol,
      name: h.name,
      type: h.type,
      quantity,
      purchasePrice,
      currentPrice,
      notes: h.notes,
    };
  });

  const metrics = calculatePortfolioMetrics(holdings);
  return { holdings, metrics };
}

export async function holdingsLookup(userId: string): Promise<string> {
  const { holdings, metrics } = await fetchUserHoldingsEnriched(userId);

  const payload = {
    totalValue: metrics.totalValue,
    totalCost: metrics.totalCost,
    totalGainLoss: metrics.totalGainLoss,
    totalGainLossPercent: metrics.totalGainLossPercent,
    riskScore: metrics.riskScore,
    diversificationScore: metrics.diversificationScore,
    holdings: holdings.map((h) => ({
      name: h.name,
      symbol: h.symbol,
      type: h.type,
      quantity: h.quantity,
      value: h.currentPrice * h.quantity,
      currentPrice: h.currentPrice,
      purchasePrice: h.purchasePrice,
      gainPercent:
        h.purchasePrice > 0
          ? ((h.currentPrice - h.purchasePrice) / h.purchasePrice) * 100
          : 0,
      notes: h.notes ?? null,
    })),
    source: "briefcase_holdings_db",
    fetchedAt: new Date().toISOString(),
  };

  return wrapToolOutput("holdings_data", payload, {
    source: "briefcase",
    fetched_at: new Date().toISOString(),
  });
}

export async function internalSearch(
  userId: string,
  query: string
): Promise<string> {
  const { holdings } = await fetchUserHoldingsEnriched(userId);
  const q = query.toLowerCase().trim();

  const matches = holdings.filter((h) => {
    const inSymbol = h.symbol.toLowerCase().includes(q);
    const inName = h.name.toLowerCase().includes(q);
    const inNotes = (h.notes ?? "").toLowerCase().includes(q);
    return inSymbol || inName || inNotes;
  });

  const payload = {
    query,
    matchCount: matches.length,
    matches: matches.map((h) => ({
      symbol: h.symbol,
      name: h.name,
      type: h.type,
      notes: h.notes ?? null,
    })),
    source: "briefcase_internal",
    fetchedAt: new Date().toISOString(),
  };

  return wrapToolOutput("internal_data", payload, {
    source: "briefcase",
    fetched_at: new Date().toISOString(),
  });
}

export function buildSessionToolData(
  holdings: PortfolioHoldingInput[]
): SessionToolData {
  const priceBySymbol: Record<string, number> = {};
  const holdingsSymbols: string[] = [];

  for (const h of holdings) {
    holdingsSymbols.push(h.symbol.toUpperCase());
    priceBySymbol[h.symbol.toUpperCase()] = h.currentPrice;
  }

  return { holdingsSymbols, priceBySymbol };
}
