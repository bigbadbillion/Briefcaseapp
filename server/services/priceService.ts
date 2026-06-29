const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";

// Simple in-memory cache to avoid rate limits
interface CacheEntry {
  price: number;
  change24h: number;
  timestamp: number;
}

const priceCache: Map<string, CacheEntry> = new Map();
const FRESH_CACHE_TTL_MS = 60 * 1000;
const STALE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getCachedPrice(symbol: string, allowStale = false): CacheEntry | null {
  const entry = priceCache.get(symbol.toUpperCase());
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age < FRESH_CACHE_TTL_MS) return entry;
  if (allowStale && age < STALE_CACHE_TTL_MS) return entry;
  return null;
}

function setCachedPrice(symbol: string, price: number, change24h: number): void {
  priceCache.set(symbol.toUpperCase(), {
    price,
    change24h,
    timestamp: Date.now(),
  });
}

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
  source: "coingecko" | "finnhub" | "mock";
}

const ID_TO_SYMBOL: Record<string, string> = Object.fromEntries(
  Object.entries(CRYPTO_SYMBOL_TO_ID).map(([symbol, id]) => [id, symbol])
);

export async function getCryptoPrices(symbols: string[]): Promise<PriceResult[]> {
  const results: PriceResult[] = [];
  const coinIds: string[] = [];
  const idToSymbolMap: Record<string, string> = {};
  const symbolsToFetch: string[] = [];

  for (const input of symbols) {
    const lowerInput = input.toLowerCase();
    const upperInput = input.toUpperCase();
    
    // Check cache first
    const cached = getCachedPrice(upperInput);
    if (cached) {
      results.push({
        symbol: upperInput,
        price: cached.price,
        change24h: cached.change24h,
        source: "coingecko",
      });
      continue;
    }
    
    if (CRYPTO_SYMBOL_TO_ID[upperInput]) {
      const coinId = CRYPTO_SYMBOL_TO_ID[upperInput];
      coinIds.push(coinId);
      idToSymbolMap[coinId] = upperInput;
      symbolsToFetch.push(upperInput);
    } else if (ID_TO_SYMBOL[lowerInput]) {
      coinIds.push(lowerInput);
      idToSymbolMap[lowerInput] = ID_TO_SYMBOL[lowerInput];
      symbolsToFetch.push(ID_TO_SYMBOL[lowerInput]);
    } else {
      coinIds.push(lowerInput);
      idToSymbolMap[lowerInput] = upperInput;
      symbolsToFetch.push(upperInput);
    }
  }

  // If all prices were cached, return early
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
      const symbol = idToSymbolMap[coinId];
      if (symbol && priceData) {
        setCachedPrice(symbol, priceData.usd, priceData.usd_24h_change || 0);

        results.push({
          symbol,
          price: priceData.usd,
          change24h: priceData.usd_24h_change || 0,
          source: "coingecko",
        });
      }
    }

    for (const symbol of symbolsToFetch) {
      if (results.some((r) => r.symbol === symbol)) continue;
      const stale = getCachedPrice(symbol, true);
      if (stale) {
        results.push({
          symbol,
          price: stale.price,
          change24h: stale.change24h,
          source: "coingecko",
        });
      }
    }
  } catch (error) {
    console.error("Error fetching crypto prices from CoinGecko:", error);

    for (const symbol of symbolsToFetch) {
      if (results.some((r) => r.symbol === symbol)) continue;
      const stale = getCachedPrice(symbol, true);
      if (stale) {
        results.push({
          symbol,
          price: stale.price,
          change24h: stale.change24h,
          source: "coingecko",
        });
      }
    }
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

  // Finnhub allows parallel requests - batch them for efficiency
  const fetchPromises = symbols.map(async (symbol) => {
    const upperSymbol = symbol.toUpperCase();
    const cached = getCachedPrice(upperSymbol);
    if (cached) {
      return {
        symbol: upperSymbol,
        price: cached.price,
        change24h: cached.change24h,
        source: "finnhub" as const,
      };
    }

    try {
      const url = `https://finnhub.io/api/v1/quote?symbol=${upperSymbol}&token=${apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`Finnhub API error for ${symbol}: ${response.status}`);
        const stale = getCachedPrice(upperSymbol, true);
        if (stale) {
          return {
            symbol: upperSymbol,
            price: stale.price,
            change24h: stale.change24h,
            source: "finnhub" as const,
          };
        }
        return null;
      }

      const data = await response.json();

      if (data && data.c && data.c > 0) {
        setCachedPrice(upperSymbol, data.c, data.dp || 0);
        return {
          symbol: upperSymbol,
          price: data.c,
          change24h: data.dp || 0,
          source: "finnhub" as const,
        };
      }

      const stale = getCachedPrice(upperSymbol, true);
      if (stale) {
        return {
          symbol: upperSymbol,
          price: stale.price,
          change24h: stale.change24h,
          source: "finnhub" as const,
        };
      }
      return null;
    } catch (error) {
      console.error(`Error fetching stock price for ${symbol}:`, error);
      const stale = getCachedPrice(upperSymbol, true);
      if (stale) {
        return {
          symbol: upperSymbol,
          price: stale.price,
          change24h: stale.change24h,
          source: "finnhub" as const,
        };
      }
      return null;
    }
  });

  const fetchResults = await Promise.all(fetchPromises);
  
  for (const result of fetchResults) {
    if (result) {
      results.push(result);
    }
  }

  return results;
}

export async function getAllPrices(
  cryptoSymbols: string[],
  stockSymbols: string[],
  finnhubKey?: string
): Promise<PriceResult[]> {
  const [cryptoPrices, stockPrices] = await Promise.all([
    getCryptoPrices(cryptoSymbols),
    getStockPrices(stockSymbols, finnhubKey),
  ]);

  return [...cryptoPrices, ...stockPrices];
}

export function getCoinGeckoId(symbol: string): string | undefined {
  return CRYPTO_SYMBOL_TO_ID[symbol.toUpperCase()];
}

export function isCryptoSymbol(symbol: string): boolean {
  return !!CRYPTO_SYMBOL_TO_ID[symbol.toUpperCase()];
}
