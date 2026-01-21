const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";

const CRYPTO_SYMBOL_TO_ID: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  DOGE: "dogecoin",
  ADA: "cardano",
  XRP: "ripple",
  DOT: "polkadot",
  AVAX: "avalanche-2",
  MATIC: "matic-network",
  LINK: "chainlink",
  UNI: "uniswap",
  ATOM: "cosmos",
  LTC: "litecoin",
  BCH: "bitcoin-cash",
  ALGO: "algorand",
  XLM: "stellar",
  VET: "vechain",
  FIL: "filecoin",
  TRX: "tron",
  ETC: "ethereum-classic",
  SHIB: "shiba-inu",
  APE: "apecoin",
  NEAR: "near",
  FTM: "fantom",
  SAND: "the-sandbox",
  MANA: "decentraland",
  AXS: "axie-infinity",
  AAVE: "aave",
  MKR: "maker",
  CRV: "curve-dao-token",
};

interface CoinGeckoPrice {
  [id: string]: {
    usd: number;
    usd_24h_change?: number;
  };
}

interface PriceResult {
  symbol: string;
  price: number;
  change24h: number;
  source: "coingecko" | "alphavantage" | "mock";
}

export async function getCryptoPrices(symbols: string[]): Promise<PriceResult[]> {
  const results: PriceResult[] = [];
  const coinIds: string[] = [];
  const symbolToIdMap: Record<string, string> = {};

  for (const symbol of symbols) {
    const upperSymbol = symbol.toUpperCase();
    const coinId = CRYPTO_SYMBOL_TO_ID[upperSymbol];
    if (coinId) {
      coinIds.push(coinId);
      symbolToIdMap[coinId] = upperSymbol;
    }
  }

  if (coinIds.length === 0) {
    return results;
  }

  try {
    const idsParam = coinIds.join(",");
    const url = `${COINGECKO_BASE_URL}/simple/price?ids=${idsParam}&vs_currencies=usd&include_24hr_change=true`;
    
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data: CoinGeckoPrice = await response.json();

    for (const [coinId, priceData] of Object.entries(data)) {
      const symbol = symbolToIdMap[coinId];
      if (symbol && priceData) {
        results.push({
          symbol,
          price: priceData.usd,
          change24h: priceData.usd_24h_change || 0,
          source: "coingecko",
        });
      }
    }
  } catch (error) {
    console.error("Error fetching crypto prices from CoinGecko:", error);
  }

  return results;
}

export async function getStockPrices(
  symbols: string[],
  apiKey?: string
): Promise<PriceResult[]> {
  const results: PriceResult[] = [];

  if (!apiKey) {
    return results;
  }

  for (const symbol of symbols) {
    try {
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      const quote = data["Global Quote"];

      if (quote && quote["05. price"]) {
        results.push({
          symbol: symbol.toUpperCase(),
          price: parseFloat(quote["05. price"]),
          change24h: parseFloat(quote["10. change percent"]?.replace("%", "") || "0"),
          source: "alphavantage",
        });
      }
    } catch (error) {
      console.error(`Error fetching stock price for ${symbol}:`, error);
    }
  }

  return results;
}

export async function getAllPrices(
  cryptoSymbols: string[],
  stockSymbols: string[],
  alphaVantageKey?: string
): Promise<PriceResult[]> {
  const [cryptoPrices, stockPrices] = await Promise.all([
    getCryptoPrices(cryptoSymbols),
    getStockPrices(stockSymbols, alphaVantageKey),
  ]);

  return [...cryptoPrices, ...stockPrices];
}

export function getCoinGeckoId(symbol: string): string | undefined {
  return CRYPTO_SYMBOL_TO_ID[symbol.toUpperCase()];
}

export function isCryptoSymbol(symbol: string): boolean {
  return !!CRYPTO_SYMBOL_TO_ID[symbol.toUpperCase()];
}
