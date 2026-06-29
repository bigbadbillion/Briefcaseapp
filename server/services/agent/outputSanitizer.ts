import type { AgentSource, SessionToolData } from "./types";

const HYPE_PATTERNS = [
  /\bguaranteed\b/i,
  /\brisk[- ]free\b/i,
  /\bcan'?t lose\b/i,
  /\bno[- ]brainer\b/i,
];

const DISCLAIMER_PATTERNS = [
  /\n*---+\n*[\s\S]*$/i,
  /\n*\*{0,2}Note:\*{0,2}[\s\S]*$/i,
  /\n*(This is for educational purposes only[^\n]*)/gi,
  /\n*(not financial advice[^\n]*)/gi,
  /\n*(Please consult a qualified financial advisor[^\n]*)/gi,
  /\n*(verify independently before acting[^\n]*)/gi,
];

export interface SanitizeResult {
  text: string;
  warnings: string[];
}

export function formatAgentText(text: string): string {
  let result = text;

  for (const pattern of DISCLAIMER_PATTERNS) {
    result = result.replace(pattern, "");
  }

  result = result.replace(/^#{1,6}\s+/gm, "");
  result = result.replace(/\*\*([^*]+)\*\*/g, "$1");
  result = result.replace(/__([^_]+)__/g, "$1");
  result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "$1");
  result = result.replace(/^---+$/gm, "");
  result = result.replace(/\n{3,}/g, "\n\n");

  return result.trim();
}

export function sanitizeAgentOutput(
  text: string,
  sessionData: SessionToolData | undefined
): SanitizeResult {
  const warnings: string[] = [];
  let result = formatAgentText(text);

  for (const pattern of HYPE_PATTERNS) {
    if (pattern.test(result)) {
      warnings.push(
        "This response uses strong hype language — treat it as a starting point for your own research."
      );
      break;
    }
  }

  if (sessionData?.holdingsSymbols?.length) {
    const sellMatch = result.match(/\b(?:sell|dump|exit)\s+([A-Z]{1,5})\b/i);
    if (sellMatch) {
      const symbol = sellMatch[1].toUpperCase();
      if (!sessionData.holdingsSymbols.includes(symbol)) {
        warnings.push(
          `This mentions ${symbol}, which is not in your verified holdings.`
        );
      }
    }
  }

  if (sessionData?.priceBySymbol) {
    for (const [symbol, knownPrice] of Object.entries(sessionData.priceBySymbol)) {
      const pricePattern = new RegExp(
        `\\$${symbol}[^\\d]*(\\d+(?:\\.\\d+)?)|${symbol}[^\\d$]*(\\$?)(\\d+(?:\\.\\d+)?)`,
        "i"
      );
      const match = result.match(pricePattern);
      if (match) {
        const cited = parseFloat(match[1] ?? match[3]);
        if (cited > 0 && knownPrice > 0) {
          const deviation = Math.abs(cited - knownPrice) / knownPrice;
          if (deviation > 0.1) {
            warnings.push(
              `Price cited for ${symbol} may not match fetched data ($${knownPrice.toFixed(2)}).`
            );
          }
        }
      }
    }
  }

  return { text: result, warnings };
}

export function dedupeSources(sources: AgentSource[]): AgentSource[] {
  const seen = new Set<string>();
  return sources.filter((s) => {
    const key = `${s.type}:${s.label}:${s.url ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
