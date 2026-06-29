import type { ToolCallLog } from "./types";

export interface AgentLogEntry {
  requestId: string;
  userId: string;
  message: string;
  toolCalls: ToolCallLog[];
  injectionFlags: string[];
  warnings: string[];
  durationMs: number;
  timestamp: string;
}

export function logAgentRequest(entry: AgentLogEntry): void {
  console.info(
    JSON.stringify({
      event: "agent_request",
      ...entry,
    })
  );
}

export function createRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
