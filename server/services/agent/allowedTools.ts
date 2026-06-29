export const READ_ONLY_TOOLS = new Set([
  "holdings_lookup",
  "finnhub_lookup",
  "coingecko_lookup",
  "web_search",
  "internal_search",
]);

export function isReadOnlyTool(name: string): boolean {
  return READ_ONLY_TOOLS.has(name);
}
