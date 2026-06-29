import { getStockPrices } from "./priceService";

const FINNHUB_BASE = "https://finnhub.io/api/v1";

function getApiKey(): string | undefined {
  return process.env.FINNHUB_API_KEY;
}

export async function finnhubQuote(symbol: string): Promise<Record<string, unknown> | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const url = `${FINNHUB_BASE}/quote?symbol=${symbol.toUpperCase()}&token=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) return null;

  const data = await response.json();
  if (!data?.c || data.c <= 0) return null;

  return {
    symbol: symbol.toUpperCase(),
    currentPrice: data.c,
    change: data.d,
    changePercent: data.dp,
    high: data.h,
    low: data.l,
    open: data.o,
    previousClose: data.pc,
    source: "finnhub",
    fetchedAt: new Date().toISOString(),
  };
}

export async function finnhubMetrics(symbol: string): Promise<Record<string, unknown> | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const url = `${FINNHUB_BASE}/stock/metric?symbol=${symbol.toUpperCase()}&metric=all&token=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) return null;

  const data = await response.json();
  const m = data?.metric;
  if (!m) return null;

  return {
    symbol: symbol.toUpperCase(),
    peRatio: m.peBasicExclExtraTTM,
    marketCap: m.marketCapitalization,
    week52High: m["52WeekHigh"],
    week52Low: m["52WeekLow"],
    dividendYield: m.dividendYieldIndicatedAnnual,
    beta: m.beta,
    source: "finnhub",
    fetchedAt: new Date().toISOString(),
  };
}

export async function finnhubNews(
  symbol: string,
  days = 7
): Promise<Record<string, unknown>[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);

  const fromStr = from.toISOString().split("T")[0];
  const toStr = to.toISOString().split("T")[0];

  const url = `${FINNHUB_BASE}/company-news?symbol=${symbol.toUpperCase()}&from=${fromStr}&to=${toStr}&token=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) return [];

  const data = await response.json();
  if (!Array.isArray(data)) return [];

  return data.slice(0, 5).map((item: Record<string, unknown>) => ({
    headline: item.headline,
    summary: item.summary,
    source: item.source,
    url: item.url,
    datetime: item.datetime,
    fetchedVia: "finnhub",
  }));
}

export async function finnhubLookup(
  symbol: string,
  dataType: "quote" | "news" | "metrics"
): Promise<Record<string, unknown> | Record<string, unknown>[] | null> {
  switch (dataType) {
    case "quote": {
      const quote = await finnhubQuote(symbol);
      if (quote) return quote;
      const prices = await getStockPrices([symbol], getApiKey());
      if (prices.length > 0) {
        return {
          symbol: prices[0].symbol,
          currentPrice: prices[0].price,
          changePercent: prices[0].change24h,
          source: "finnhub",
          fetchedAt: new Date().toISOString(),
        };
      }
      return null;
    }
    case "news":
      return finnhubNews(symbol);
    case "metrics":
      return finnhubMetrics(symbol);
    default:
      return null;
  }
}

export function isFinnhubConfigured(): boolean {
  return !!getApiKey();
}
