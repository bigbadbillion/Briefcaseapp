export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

export interface ToolContext {
  userId: string;
  requestId: string;
}

export interface AgentSource {
  type: "finnhub" | "coingecko" | "web" | "holdings" | "internal";
  label: string;
  url?: string;
}

export interface AgentRequest {
  message: string;
  history?: ChatMessage[];
  userId: string;
  requestId?: string;
}

export interface AgentResponse {
  text: string;
  sources: AgentSource[];
  warnings: string[];
  configured: boolean;
  toolSteps?: string[];
}

export interface ToolCallLog {
  name: string;
  args: Record<string, unknown>;
  outputLength: number;
  durationMs: number;
}

export interface SessionToolData {
  holdingsSymbols: string[];
  priceBySymbol: Record<string, number>;
}
