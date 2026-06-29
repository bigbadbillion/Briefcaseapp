import type { AgentSource, SessionToolData } from "./types";

const IMPERATIVE_PATTERNS = [
  /\byou should (buy|sell|purchase)\b/i,
  /\bguaranteed\b/i,
  /\brisk[- ]free\b/i,
  /\bbest move\b/i,
];

export interface SanitizeResult {
  text: string;
  warnings: string[];
}

export function sanitizeAgentOutput(
  text: string,
  sessionData: SessionToolData | undefined
): SanitizeResult {
  const warnings: string[] = [];
  let result = text;

  for (const pattern of IMPERATIVE_PATTERNS) {
    if (pattern.test(result)) {
      warnings.push(
        "Response contains strong recommendation language. Verify independently before acting."
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
          `Response mentions selling ${symbol}, which is not in your verified holdings.`
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
              `Cited price for ${symbol} may be inconsistent with fetched data ($${knownPrice.toFixed(2)}).`
            );
          }
        }
      }
    }
  }

  if (warnings.length > 0) {
    const banner =
      "\n\n---\n**Note:** " + warnings.join(" ") + "\n---";
    result = result + banner;
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
