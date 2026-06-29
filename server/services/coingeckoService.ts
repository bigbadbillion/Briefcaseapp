import { getCryptoPrices, getCoinGeckoId } from "./priceService";

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

export async function coingeckoPrice(
  symbolOrId: string
): Promise<Record<string, unknown> | null> {
  const upper = symbolOrId.toUpperCase();
  const coinId = getCoinGeckoId(upper) ?? symbolOrId.toLowerCase();

  const prices = await getCryptoPrices([upper]);
  if (prices.length > 0) {
    return {
      symbol: prices[0].symbol,
      priceUsd: prices[0].price,
      change24hPercent: prices[0].change24h,
      source: "coingecko",
      fetchedAt: new Date().toISOString(),
    };
  }

  try {
    const url = `${COINGECKO_BASE}/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`;
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) return null;

    const data = await response.json();
    const entry = data[coinId];
    if (!entry?.usd) return null;

    return {
      id: coinId,
      priceUsd: entry.usd,
      change24hPercent: entry.usd_24h_change ?? 0,
      source: "coingecko",
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function coingeckoMarket(
  symbolOrId: string
): Promise<Record<string, unknown> | null> {
  const upper = symbolOrId.toUpperCase();
  const coinId = getCoinGeckoId(upper) ?? symbolOrId.toLowerCase();

  try {
    const url = `${COINGECKO_BASE}/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`;
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) return null;

    const data = await response.json();
    const md = data.market_data;
    if (!md) return null;

    return {
      id: coinId,
      name: data.name,
      symbol: data.symbol?.toUpperCase(),
      priceUsd: md.current_price?.usd,
      marketCapUsd: md.market_cap?.usd,
      volume24hUsd: md.total_volume?.usd,
      change24hPercent: md.price_change_percentage_24h,
      description: typeof data.description?.en === "string"
        ? data.description.en.slice(0, 500)
        : undefined,
      source: "coingecko",
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function coingeckoLookup(
  symbolOrId: string,
  dataType: "price" | "market"
): Promise<Record<string, unknown> | null> {
  if (dataType === "market") {
    return coingeckoMarket(symbolOrId);
  }
  return coingeckoPrice(symbolOrId);
}
