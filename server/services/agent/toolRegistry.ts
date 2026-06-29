import type { FunctionDeclaration } from "@google/genai";
import { finnhubLookup } from "../finnhubService";
import { coingeckoLookup } from "../coingeckoService";
import { webSearch } from "../webSearchService";
import {
  holdingsLookup,
  internalSearch,
  fetchUserHoldingsEnriched,
  buildSessionToolData,
} from "./tools/portfolioTools";
import { wrapToolOutput, detectInjectionPatterns } from "./delimiters";
import type { ToolContext, SessionToolData, AgentSource } from "./types";

import { isReadOnlyTool } from "./allowedTools";

export const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "holdings_lookup",
    description:
      "Fetch the user's current portfolio holdings with live prices, values, risk and diversification scores. Use for portfolio questions.",
    parametersJsonSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "finnhub_lookup",
    description:
      "Fetch stock/ETF quote, company news, or basic fundamentals from Finnhub.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Ticker symbol e.g. AAPL" },
        dataType: {
          type: "string",
          enum: ["quote", "news", "metrics"],
          description: "Type of data to fetch",
        },
      },
      required: ["symbol", "dataType"],
    },
  },
  {
    name: "coingecko_lookup",
    description: "Fetch crypto token price or broader market data from CoinGecko.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        symbolOrId: {
          type: "string",
          description: "Crypto symbol e.g. BTC or coingecko id",
        },
        dataType: {
          type: "string",
          enum: ["price", "market"],
          description: "Price only or full market data",
        },
      },
      required: ["symbolOrId", "dataType"],
    },
  },
  {
    name: "web_search",
    description:
      "Search the web for broader market news, macro events, or sentiment not covered by Finnhub/CoinGecko.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        maxResults: {
          type: "number",
          description: "Max results (default 5)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "internal_search",
    description:
      "Search the user's saved notes and holdings for past research.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search term for notes or holding names/symbols",
        },
      },
      required: ["query"],
    },
  },
];

export interface ToolExecutionResult {
  output: string;
  sources: AgentSource[];
  injectionFlags: string[];
  sessionData?: Partial<SessionToolData>;
}

const TOOL_TIMEOUT_MS = 5000;

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out`)), ms)
    ),
  ]);
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<ToolExecutionResult> {
  if (!isReadOnlyTool(name)) {
    return {
      output: wrapToolOutput("holdings_data", { error: "Unknown or disallowed tool" }),
      sources: [],
      injectionFlags: ["disallowed_tool"],
    };
  }

  let rawOutput = "";
  const sources: AgentSource[] = [];
  let sessionData: Partial<SessionToolData> | undefined;

  try {
    switch (name) {
      case "holdings_lookup": {
        rawOutput = await withTimeout(
          holdingsLookup(ctx.userId),
          TOOL_TIMEOUT_MS,
          "holdings_lookup"
        );
        const { holdings } = await fetchUserHoldingsEnriched(ctx.userId);
        sessionData = buildSessionToolData(holdings);
        sources.push({ type: "holdings", label: "Your Briefcase portfolio" });
        break;
      }
      case "finnhub_lookup": {
        const symbol = String(args.symbol ?? "");
        const dataType = String(args.dataType ?? "quote") as
          | "quote"
          | "news"
          | "metrics";
        const data = await withTimeout(
          finnhubLookup(symbol, dataType),
          TOOL_TIMEOUT_MS,
          "finnhub_lookup"
        );
        rawOutput = wrapToolOutput("finnhub_data", data ?? { error: "No data" }, {
          source: "finnhub",
          symbol: symbol.toUpperCase(),
          fetched_at: new Date().toISOString(),
        });
        sources.push({
          type: "finnhub",
          label: `Finnhub (${symbol.toUpperCase()}, ${dataType})`,
        });
        break;
      }
      case "coingecko_lookup": {
        const symbolOrId = String(args.symbolOrId ?? "");
        const dataType = String(args.dataType ?? "price") as "price" | "market";
        const data = await withTimeout(
          coingeckoLookup(symbolOrId, dataType),
          TOOL_TIMEOUT_MS,
          "coingecko_lookup"
        );
        rawOutput = wrapToolOutput("coingecko_data", data ?? { error: "No data" }, {
          source: "coingecko",
          symbol: symbolOrId.toUpperCase(),
          fetched_at: new Date().toISOString(),
        });
        sources.push({
          type: "coingecko",
          label: `CoinGecko (${symbolOrId.toUpperCase()}, ${dataType})`,
        });
        break;
      }
      case "web_search": {
        const query = String(args.query ?? "");
        const maxResults = Number(args.maxResults ?? 5);
        const results = await withTimeout(
          webSearch(query, maxResults),
          TOOL_TIMEOUT_MS,
          "web_search"
        );
        const wrapped = results
          .map(
            (r) =>
              wrapToolOutput("search_result", {
                title: r.title,
                snippet: r.snippet,
              }, {
                url: r.url,
                domain: r.domain,
              })
          )
          .join("\n");
        rawOutput =
          wrapped ||
          wrapToolOutput("search_result", {
            error: "No results or web search not configured",
          });
        for (const r of results) {
          sources.push({
            type: "web",
            label: r.domain,
            url: r.url,
          });
        }
        break;
      }
      case "internal_search": {
        const query = String(args.query ?? "");
        rawOutput = await withTimeout(
          internalSearch(ctx.userId, query),
          TOOL_TIMEOUT_MS,
          "internal_search"
        );
        sources.push({ type: "internal", label: "Your saved notes" });
        break;
      }
      default:
        rawOutput = wrapToolOutput("holdings_data", { error: "Unknown tool" });
    }
  } catch (error) {
    rawOutput = wrapToolOutput("holdings_data", {
      error: error instanceof Error ? error.message : "Tool execution failed",
      tool: name,
    });
  }

  const injectionFlags = detectInjectionPatterns(rawOutput);

  return { output: rawOutput, sources, injectionFlags, sessionData };
}
