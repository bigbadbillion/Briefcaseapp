const TRUSTED_DOMAINS = [
  "reuters.com",
  "bloomberg.com",
  "sec.gov",
  "investor.",
  "finance.yahoo.com",
  "wsj.com",
  "ft.com",
  "cnbc.com",
  "marketwatch.com",
  "apnews.com",
];

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

function domainTrustScore(domain: string): number {
  for (let i = 0; i < TRUSTED_DOMAINS.length; i++) {
    if (domain.includes(TRUSTED_DOMAINS[i])) {
      return TRUSTED_DOMAINS.length - i;
    }
  }
  return 0;
}

function rankResults(results: WebSearchResult[]): WebSearchResult[] {
  return [...results].sort(
    (a, b) => domainTrustScore(b.domain) - domainTrustScore(a.domain)
  );
}

async function searchTavily(
  query: string,
  maxResults: number
): Promise<WebSearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: maxResults,
      include_answer: false,
    }),
  });

  if (!response.ok) return [];

  const data = await response.json();
  const results = data.results ?? [];

  return results.map((item: Record<string, string>) => {
    const url = item.url ?? "";
    return {
      title: item.title ?? "",
      url,
      snippet: item.content ?? item.snippet ?? "",
      domain: extractDomain(url),
    };
  });
}

export async function webSearch(
  query: string,
  maxResults = 5
): Promise<WebSearchResult[]> {
  const capped = Math.min(maxResults, 8);
  const results = await searchTavily(query, capped);
  return rankResults(results).slice(0, capped);
}

export function isWebSearchConfigured(): boolean {
  return !!process.env.TAVILY_API_KEY;
}

export { TRUSTED_DOMAINS };
