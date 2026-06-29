import { getApiUrl } from "./query-client";

export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

export interface AgentSource {
  type: "finnhub" | "coingecko" | "web" | "holdings" | "internal";
  label: string;
  url?: string;
}

export interface ChatResponse {
  response: string;
  sources: AgentSource[];
  warnings: string[];
  toolSteps?: string[];
  configured: boolean;
}

export interface InsightsResponse {
  insights: string;
  sources: AgentSource[];
  warnings: string[];
  configured: boolean;
}

export interface ExplainResponse {
  explanation: string;
  sources: AgentSource[];
  warnings: string[];
  configured: boolean;
}

async function authHeaders(token: string): Promise<HeadersInit> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function sendChatMessage(
  token: string,
  message: string,
  history: ChatMessage[] = []
): Promise<ChatResponse> {
  try {
    const apiUrl = getApiUrl();
    const url = new URL("/api/ai/chat", apiUrl);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: await authHeaders(token),
      body: JSON.stringify({ message, history }),
    });

    if (response.status === 403) {
      return {
        response: "Premium subscription required for AI chat.",
        sources: [],
        warnings: [],
        configured: false,
      };
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error sending chat message:", error);
    return {
      response: "Unable to connect to the AI service. Please check your connection and try again.",
      sources: [],
      warnings: [],
      configured: false,
    };
  }
}

export async function getAIInsights(token: string): Promise<InsightsResponse> {
  try {
    const apiUrl = getApiUrl();
    const url = new URL("/api/ai/insights", apiUrl);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: await authHeaders(token),
      body: JSON.stringify({}),
    });

    if (response.status === 403) {
      return {
        insights: "Premium subscription required for AI insights.",
        sources: [],
        warnings: [],
        configured: false,
      };
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting AI insights:", error);
    return {
      insights: "Unable to generate insights at this time.",
      sources: [],
      warnings: [],
      configured: false,
    };
  }
}

export async function getAssetExplanation(
  token: string,
  symbol: string,
  name: string,
  type: string
): Promise<ExplainResponse> {
  try {
    const apiUrl = getApiUrl();
    const url = new URL(`/api/ai/explain/${encodeURIComponent(symbol)}`, apiUrl);
    url.searchParams.set("name", name);
    url.searchParams.set("type", type);

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting asset explanation:", error);
    return {
      explanation: "Unable to explain this asset at this time.",
      sources: [],
      warnings: [],
      configured: false,
    };
  }
}
