import {
  GoogleGenAI,
  createPartFromFunctionResponse,
  type Content,
  type Part,
} from "@google/genai";
import { buildSystemPrompt } from "./systemPrompt";
import { TOOL_DECLARATIONS, executeTool } from "./toolRegistry";
import { sanitizeAgentOutput, dedupeSources } from "./outputSanitizer";
import { logAgentRequest, createRequestId } from "./agentLogger";
import type {
  AgentRequest,
  AgentResponse,
  ToolContext,
  SessionToolData,
  AgentSource,
  ToolCallLog,
} from "./types";
import type { ChatMessage } from "./types";

const MAX_TOOL_ITERATIONS = 5;
const MODEL = "gemini-2.5-flash";

let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

function formatHistory(history: ChatMessage[]): Content[] {
  return history.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.content }] as Part[],
  }));
}

export async function runStockAgent(request: AgentRequest): Promise<AgentResponse> {
  const client = getAIClient();
  const requestId = request.requestId ?? createRequestId();
  const startTime = Date.now();

  if (!client) {
    return {
      text: "Gemini AI is not configured. Please add your GEMINI_API_KEY to enable AI features.",
      sources: [],
      warnings: [],
      configured: false,
    };
  }

  const ctx: ToolContext = { userId: request.userId, requestId };
  const toolCallLogs: ToolCallLog[] = [];
  const allSources: AgentSource[] = [];
  const allInjectionFlags: string[] = [];
  const toolSteps: string[] = [];
  let sessionData: SessionToolData | undefined;

  const contents: Content[] = [
    ...formatHistory(request.history ?? []),
    { role: "user", parts: [{ text: request.message }] },
  ];

  try {
    for (let step = 0; step < MAX_TOOL_ITERATIONS; step++) {
      const response = await client.models.generateContent({
        model: MODEL,
        config: {
          systemInstruction: buildSystemPrompt(),
          tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
        },
        contents,
      });

      const functionCalls = response.functionCalls;
      if (!functionCalls || functionCalls.length === 0) {
        const rawText =
          response.text ??
          "I couldn't generate a response. Please try again.";

        const { text, warnings } = sanitizeAgentOutput(rawText, sessionData);

        logAgentRequest({
          requestId,
          userId: request.userId,
          message: request.message.slice(0, 200),
          toolCalls: toolCallLogs,
          injectionFlags: allInjectionFlags,
          warnings,
          durationMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        });

        return {
          text,
          sources: dedupeSources(allSources),
          warnings,
          configured: true,
          toolSteps: toolSteps.length > 0 ? toolSteps : undefined,
        };
      }

      const modelContent = response.candidates?.[0]?.content;
      if (modelContent) {
        contents.push(modelContent);
      }

      for (const call of functionCalls) {
        const toolName = call.name ?? "unknown";
        const toolArgs = (call.args ?? {}) as Record<string, unknown>;
        toolSteps.push(toolName);

        const toolStart = Date.now();
        const result = await executeTool(toolName, toolArgs, ctx);
        const durationMs = Date.now() - toolStart;

        toolCallLogs.push({
          name: toolName,
          args: toolArgs,
          outputLength: result.output.length,
          durationMs,
        });

        allSources.push(...result.sources);
        allInjectionFlags.push(...result.injectionFlags);

        if (result.sessionData) {
          sessionData = {
            holdingsSymbols: [
              ...(sessionData?.holdingsSymbols ?? []),
              ...(result.sessionData.holdingsSymbols ?? []),
            ],
            priceBySymbol: {
              ...(sessionData?.priceBySymbol ?? {}),
              ...(result.sessionData.priceBySymbol ?? {}),
            },
          };
        }

        const callId = call.id ?? toolName;
        contents.push({
          role: "user",
          parts: [
            createPartFromFunctionResponse(callId, toolName, {
              result: result.output,
            }),
          ],
        });
      }
    }

    const partialText =
      "I gathered some data but reached my research step limit. Here's what I found so far — try a more specific question for a complete answer.";

    logAgentRequest({
      requestId,
      userId: request.userId,
      message: request.message.slice(0, 200),
      toolCalls: toolCallLogs,
      injectionFlags: allInjectionFlags,
      warnings: ["tool_loop_exhausted"],
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });

    return {
      text: partialText,
      sources: dedupeSources(allSources),
      warnings: ["Reached maximum research steps for this request."],
      configured: true,
      toolSteps,
    };
  } catch (error) {
    console.error("Stock agent error:", error);
    return {
      text: "I encountered an error processing your request. Please try again later.",
      sources: [],
      warnings: [],
      configured: true,
    };
  }
}

export function isAgentConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}
