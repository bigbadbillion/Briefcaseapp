const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const FINNHUB_BASE = "https://finnhub.io/api/v1";

export interface AssetSearchResult {
  id: string;
  symbol: string;
  name: string;
  type: "crypto" | "stock" | "etf" | "bond" | "real_estate" | "commodity" | "cash";
  currentPrice?: number;
  imageUrl?: string;
}

const POPULAR_CRYPTO: AssetSearchResult[] = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", type: "crypto", imageUrl: "https://assets.coingecko.com/coins/images/1/thumb/bitcoin.png" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", type: "crypto", imageUrl: "https://assets.coingecko.com/coins/images/279/thumb/ethereum.png" },
  { id: "solana", symbol: "SOL", name: "Solana", type: "crypto", imageUrl: "https://assets.coingecko.com/coins/images/4128/thumb/solana.png" },
  { id: "cardano", symbol: "ADA", name: "Cardano", type: "crypto", imageUrl: "https://assets.coingecko.com/coins/images/975/thumb/cardano.png" },
  { id: "ripple", symbol: "XRP", name: "XRP", type: "crypto", imageUrl: "https://assets.coingecko.com/coins/images/44/thumb/xrp-symbol-white-128.png" },
  { id: "polkadot", symbol: "DOT", name: "Polkadot", type: "crypto", imageUrl: "https://assets.coingecko.com/coins/images/12171/thumb/polkadot.png" },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin", type: "crypto", imageUrl: "https://assets.coingecko.com/coins/images/5/thumb/dogecoin.png" },
  { id: "avalanche-2", symbol: "AVAX", name: "Avalanche", type: "crypto", imageUrl: "https://assets.coingecko.com/coins/images/12559/thumb/Avalanche_Circle_RedWhite_Trans.png" },
  { id: "chainlink", symbol: "LINK", name: "Chainlink", type: "crypto", imageUrl: "https://assets.coingecko.com/coins/images/877/thumb/chainlink-new-logo.png" },
  { id: "uniswap", symbol: "UNI", name: "Uniswap", type: "crypto", imageUrl: "https://assets.coingecko.com/coins/images/12504/thumb/uniswap-logo.png" },
];

const POPULAR_STOCKS: AssetSearchResult[] = [
  { id: "AAPL", symbol: "AAPL", name: "Apple Inc.", type: "stock" },
  { id: "MSFT", symbol: "MSFT", name: "Microsoft Corporation", type: "stock" },
  { id: "GOOGL", symbol: "GOOGL", name: "Alphabet Inc.", type: "stock" },
  { id: "AMZN", symbol: "AMZN", name: "Amazon.com Inc.", type: "stock" },
  { id: "NVDA", symbol: "NVDA", name: "NVIDIA Corporation", type: "stock" },
  { id: "META", symbol: "META", name: "Meta Platforms Inc.", type: "stock" },
  { id: "TSLA", symbol: "TSLA", name: "Tesla Inc.", type: "stock" },
  { id: "BRK.B", symbol: "BRK.B", name: "Berkshire Hathaway", type: "stock" },
  { id: "JPM", symbol: "JPM", name: "JPMorgan Chase & Co.", type: "stock" },
  { id: "V", symbol: "V", name: "Visa Inc.", type: "stock" },
];

const POPULAR_ETFS: AssetSearchResult[] = [
  { id: "SPY", symbol: "SPY", name: "SPDR S&P 500 ETF Trust", type: "etf" },
  { id: "QQQ", symbol: "QQQ", name: "Invesco QQQ Trust", type: "etf" },
  { id: "VTI", symbol: "VTI", name: "Vanguard Total Stock Market ETF", type: "etf" },
  { id: "VOO", symbol: "VOO", name: "Vanguard S&P 500 ETF", type: "etf" },
  { id: "IWM", symbol: "IWM", name: "iShares Russell 2000 ETF", type: "etf" },
  { id: "VEA", symbol: "VEA", name: "Vanguard FTSE Developed Markets ETF", type: "etf" },
  { id: "VWO", symbol: "VWO", name: "Vanguard FTSE Emerging Markets ETF", type: "etf" },
  { id: "GLD", symbol: "GLD", name: "SPDR Gold Shares", type: "etf" },
  { id: "TLT", symbol: "TLT", name: "iShares 20+ Year Treasury Bond ETF", type: "etf" },
  { id: "ARKK", symbol: "ARKK", name: "ARK Innovation ETF", type: "etf" },
];

const POPULAR_BONDS: AssetSearchResult[] = [
  { id: "BND", symbol: "BND", name: "Vanguard Total Bond Market ETF", type: "bond" },
  { id: "AGG", symbol: "AGG", name: "iShares Core U.S. Aggregate Bond ETF", type: "bond" },
  { id: "TLT", symbol: "TLT", name: "iShares 20+ Year Treasury Bond ETF", type: "bond" },
  { id: "LQD", symbol: "LQD", name: "iShares iBoxx Investment Grade Corporate Bond ETF", type: "bond" },
  { id: "HYG", symbol: "HYG", name: "iShares iBoxx High Yield Corporate Bond ETF", type: "bond" },
  { id: "TIPS", symbol: "TIP", name: "iShares TIPS Bond ETF", type: "bond" },
  { id: "MUB", symbol: "MUB", name: "iShares National Muni Bond ETF", type: "bond" },
  { id: "SHY", symbol: "SHY", name: "iShares 1-3 Year Treasury Bond ETF", type: "bond" },
];

const POPULAR_COMMODITIES: AssetSearchResult[] = [
  { id: "GOLD", symbol: "GC", name: "Gold", type: "commodity" },
  { id: "SILVER", symbol: "SI", name: "Silver", type: "commodity" },
  { id: "OIL", symbol: "CL", name: "Crude Oil (WTI)", type: "commodity" },
  { id: "NATGAS", symbol: "NG", name: "Natural Gas", type: "commodity" },
  { id: "COPPER", symbol: "HG", name: "Copper", type: "commodity" },
  { id: "PLATINUM", symbol: "PL", name: "Platinum", type: "commodity" },
  { id: "PALLADIUM", symbol: "PA", name: "Palladium", type: "commodity" },
  { id: "WHEAT", symbol: "ZW", name: "Wheat", type: "commodity" },
  { id: "CORN", symbol: "ZC", name: "Corn", type: "commodity" },
  { id: "COFFEE", symbol: "KC", name: "Coffee", type: "commodity" },
];

const POPULAR_REAL_ESTATE: AssetSearchResult[] = [
  { id: "VNQ", symbol: "VNQ", name: "Vanguard Real Estate ETF", type: "real_estate" },
  { id: "SCHH", symbol: "SCHH", name: "Schwab U.S. REIT ETF", type: "real_estate" },
  { id: "IYR", symbol: "IYR", name: "iShares U.S. Real Estate ETF", type: "real_estate" },
  { id: "O", symbol: "O", name: "Realty Income Corporation", type: "real_estate" },
  { id: "AMT", symbol: "AMT", name: "American Tower Corporation", type: "real_estate" },
  { id: "PLD", symbol: "PLD", name: "Prologis Inc.", type: "real_estate" },
  { id: "SPG", symbol: "SPG", name: "Simon Property Group", type: "real_estate" },
  { id: "EQIX", symbol: "EQIX", name: "Equinix Inc.", type: "real_estate" },
];

const POPULAR_CASH: AssetSearchResult[] = [
  { id: "USD", symbol: "USD", name: "US Dollar", type: "cash" },
  { id: "EUR", symbol: "EUR", name: "Euro", type: "cash" },
  { id: "GBP", symbol: "GBP", name: "British Pound", type: "cash" },
  { id: "JPY", symbol: "JPY", name: "Japanese Yen", type: "cash" },
  { id: "CHF", symbol: "CHF", name: "Swiss Franc", type: "cash" },
  { id: "SAVINGS", symbol: "SAVINGS", name: "Savings Account", type: "cash" },
  { id: "MMKT", symbol: "MMKT", name: "Money Market Fund", type: "cash" },
];

export function getPopularAssets(type: string): AssetSearchResult[] {
  switch (type) {
    case "crypto":
      return POPULAR_CRYPTO;
    case "stock":
      return POPULAR_STOCKS;
    case "etf":
      return POPULAR_ETFS;
    case "bond":
      return POPULAR_BONDS;
    case "commodity":
      return POPULAR_COMMODITIES;
    case "real_estate":
      return POPULAR_REAL_ESTATE;
    case "cash":
      return POPULAR_CASH;
    default:
      return [];
  }
}

export async function searchCrypto(query: string): Promise<AssetSearchResult[]> {
  try {
    const response = await fetch(
      `${COINGECKO_BASE}/search?query=${encodeURIComponent(query)}`
    );
    
    if (!response.ok) {
      console.error("CoinGecko search failed:", response.status);
      return filterLocalAssets(POPULAR_CRYPTO, query);
    }

    const data = await response.json();
    const coins = data.coins?.slice(0, 10) || [];
    
    return coins.map((coin: any) => ({
      id: coin.id,
      symbol: coin.symbol?.toUpperCase() || "",
      name: coin.name,
      type: "crypto" as const,
      imageUrl: coin.thumb,
    }));
  } catch (error) {
    console.error("Error searching crypto:", error);
    return filterLocalAssets(POPULAR_CRYPTO, query);
  }
}

export async function searchStocks(query: string): Promise<AssetSearchResult[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  
  if (!apiKey) {
    return filterLocalAssets([...POPULAR_STOCKS, ...POPULAR_ETFS], query);
  }

  try {
    // Finnhub symbol lookup endpoint
    const response = await fetch(
      `${FINNHUB_BASE}/search?q=${encodeURIComponent(query)}&token=${apiKey}`
    );
    
    if (!response.ok) {
      console.error("Finnhub search failed:", response.status);
      return filterLocalAssets([...POPULAR_STOCKS, ...POPULAR_ETFS], query);
    }

    const data = await response.json();
    const results = data.result?.slice(0, 10) || [];
    
    return results
      .filter((item: any) => item.type === "Common Stock" || item.type === "ETF")
      .map((item: any) => {
        const type = item.type === "ETF" ? "etf" : "stock";
        return {
          id: item.symbol,
          symbol: item.symbol,
          name: item.description,
          type: type as "stock" | "etf",
        };
      });
  } catch (error) {
    console.error("Error searching stocks:", error);
    return filterLocalAssets([...POPULAR_STOCKS, ...POPULAR_ETFS], query);
  }
}

export async function searchAssets(
  query: string,
  type?: string
): Promise<AssetSearchResult[]> {
  const lowerQuery = query.toLowerCase().trim();
  
  if (!lowerQuery) {
    return type ? getPopularAssets(type) : [];
  }

  if (type === "crypto") {
    return searchCrypto(lowerQuery);
  }
  
  if (type === "stock" || type === "etf") {
    return searchStocks(lowerQuery);
  }

  if (type === "bond") {
    return filterLocalAssets(POPULAR_BONDS, lowerQuery);
  }
  
  if (type === "commodity") {
    return filterLocalAssets(POPULAR_COMMODITIES, lowerQuery);
  }
  
  if (type === "real_estate") {
    return filterLocalAssets(POPULAR_REAL_ESTATE, lowerQuery);
  }
  
  if (type === "cash") {
    return filterLocalAssets(POPULAR_CASH, lowerQuery);
  }

  const allResults: AssetSearchResult[] = [];
  
  const [cryptoResults, stockResults] = await Promise.all([
    searchCrypto(lowerQuery),
    searchStocks(lowerQuery),
  ]);
  
  allResults.push(...cryptoResults.slice(0, 5));
  allResults.push(...stockResults.slice(0, 5));
  allResults.push(...filterLocalAssets(POPULAR_COMMODITIES, lowerQuery).slice(0, 3));
  allResults.push(...filterLocalAssets(POPULAR_BONDS, lowerQuery).slice(0, 3));
  allResults.push(...filterLocalAssets(POPULAR_REAL_ESTATE, lowerQuery).slice(0, 2));
  
  return allResults;
}

function filterLocalAssets(assets: AssetSearchResult[], query: string): AssetSearchResult[] {
  const lowerQuery = query.toLowerCase();
  return assets.filter(
    (asset) =>
      asset.name.toLowerCase().includes(lowerQuery) ||
      asset.symbol.toLowerCase().includes(lowerQuery)
  );
}
