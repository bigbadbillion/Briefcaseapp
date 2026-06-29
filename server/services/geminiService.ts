import { runStockAgent, isAgentConfigured } from "./agent/stockAgent";
import { INSIGHTS_USER_PROMPT } from "./agent/systemPrompt";
import type { ChatMessage } from "./agent/types";

export type { ChatMessage };

export interface PortfolioContext {
  totalValue: number;
  holdings: Array<{
    name: string;
    symbol: string;
    type: string;
    value: number;
    gain: number;
    gainPercent: number;
  }>;
  riskScore: number;
  diversificationScore: number;
}

export function isGeminiConfigured(): boolean {
  return isAgentConfigured();
}

export async function chat(
  message: string,
  history: ChatMessage[] = [],
  userId: string
): Promise<import("./agent/types").AgentResponse> {
  return runStockAgent({ message, history, userId });
}

export async function generatePortfolioInsights(
  userId: string
): Promise<import("./agent/types").AgentResponse> {
  return runStockAgent({
    message: INSIGHTS_USER_PROMPT,
    history: [],
    userId,
  });
}

export async function explainAsset(
  symbol: string,
  name: string,
  type: string,
  userId: string
): Promise<import("./agent/types").AgentResponse> {
  const message = `Provide a brief overview (2-3 paragraphs) of ${name} (${symbol}), a ${type} investment. Use finnhub_lookup or coingecko_lookup for current data when relevant. Include:
1. What it is and what makes it notable
2. Key factors that typically affect its price
3. General risk considerations

Cite sources. Keep it informative but accessible for beginners.`;

  return runStockAgent({ message, history: [], userId });
}
