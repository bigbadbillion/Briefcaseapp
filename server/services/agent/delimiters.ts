export type ToolOutputTag =
  | "holdings_data"
  | "finnhub_data"
  | "coingecko_data"
  | "search_result"
  | "internal_data";

const MAX_TOOL_OUTPUT_CHARS = 8000;

export function wrapToolOutput(
  tag: ToolOutputTag,
  data: unknown,
  attrs?: Record<string, string>
): string {
  const attrStr = attrs
    ? " " +
      Object.entries(attrs)
        .map(([k, v]) => `${k}="${escapeAttr(v)}"`)
        .join(" ")
    : "";
  const body =
    typeof data === "string" ? data : JSON.stringify(data, null, 2);
  const truncated =
    body.length > MAX_TOOL_OUTPUT_CHARS
      ? body.slice(0, MAX_TOOL_OUTPUT_CHARS) + "\n...truncated"
      : body;
  return `<${tag}${attrStr}>\n${truncated}\n</${tag}>`;
}

function escapeAttr(value: string): string {
  return value.replace(/"/g, "&quot;");
}

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /you\s+are\s+now/i,
  /\bact\s+as\b/i,
  /\bsystem\s*:/i,
  /disregard\s+(your\s+)?(instructions|rules)/i,
];

export function detectInjectionPatterns(text: string): string[] {
  const flags: string[] = [];
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      flags.push(`instruction_pattern:${pattern.source}`);
    }
  }
  return flags;
}
