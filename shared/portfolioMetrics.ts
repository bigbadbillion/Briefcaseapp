export type HoldingType =
  | "stock"
  | "crypto"
  | "etf"
  | "bond"
  | "real_estate"
  | "commodity"
  | "cash";

export interface PortfolioHoldingInput {
  symbol: string;
  name: string;
  type: string;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  notes?: string | null;
}

export interface PortfolioMetrics {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  typeAllocation: Record<string, number>;
  bestPerformer: PortfolioHoldingInput | null;
  worstPerformer: PortfolioHoldingInput | null;
  diversificationScore: number;
  riskScore: number;
}

function calculateDiversificationScore(holdings: PortfolioHoldingInput[]): number {
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

function calculateRiskScore(holdings: PortfolioHoldingInput[]): number {
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
  return Math.min(100, Math.round(weightedRisk * 10 + concentrationRisk));
}

export function calculatePortfolioMetrics(
  holdings: PortfolioHoldingInput[]
): PortfolioMetrics {
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
  }, null as PortfolioHoldingInput | null);

  const worstPerformer = holdings.reduce((worst, h) => {
    const gain = ((h.currentPrice - h.purchasePrice) / h.purchasePrice) * 100;
    const worstGain = worst
      ? ((worst.currentPrice - worst.purchasePrice) / worst.purchasePrice) * 100
      : Infinity;
    return gain < worstGain ? h : worst;
  }, null as PortfolioHoldingInput | null);

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
