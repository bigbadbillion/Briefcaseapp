import { getApiUrl } from "./query-client";

export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

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

export interface ChatResponse {
  response: string;
  configured: boolean;
}

export interface InsightsResponse {
  insights: string;
  configured: boolean;
}

export interface ExplainResponse {
  explanation: string;
  configured: boolean;
}

export async function sendChatMessage(
  message: string,
  history: ChatMessage[] = [],
  portfolioContext?: PortfolioContext
): Promise<ChatResponse> {
  try {
    const apiUrl = getApiUrl();
    const url = new URL("/api/ai/chat", apiUrl);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, history, portfolioContext }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error sending chat message:", error);
    return {
      response: "Unable to connect to the AI service. Please check your connection and try again.",
      configured: false,
    };
  }
}

export async function getAIInsights(
  portfolioContext: PortfolioContext
): Promise<InsightsResponse> {
  try {
    const apiUrl = getApiUrl();
    const url = new URL("/api/ai/insights", apiUrl);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ portfolioContext }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting AI insights:", error);
    return {
      insights: "Unable to generate insights at this time.",
      configured: false,
    };
  }
}

export async function getAssetExplanation(
  symbol: string,
  name: string,
  type: string
): Promise<ExplainResponse> {
  try {
    const apiUrl = getApiUrl();
    const url = new URL(`/api/ai/explain/${encodeURIComponent(symbol)}`, apiUrl);
    url.searchParams.set("name", name);
    url.searchParams.set("type", type);

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting asset explanation:", error);
    return {
      explanation: "Unable to explain this asset at this time.",
      configured: false,
    };
  }
}
