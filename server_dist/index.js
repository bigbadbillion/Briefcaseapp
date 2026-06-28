var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  holdingSchema: () => holdingSchema,
  holdings: () => holdings,
  insertUserSchema: () => insertUserSchema,
  loginSchema: () => loginSchema,
  registerSchema: () => registerSchema,
  sessions: () => sessions,
  userSettings: () => userSettings,
  users: () => users
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users, sessions, holdings, userSettings, insertUserSchema, loginSchema, registerSchema, holdingSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    users = pgTable("users", {
      id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
      email: text("email").notNull().unique(),
      password: text("password").notNull(),
      name: text("name"),
      appleId: text("apple_id").unique(),
      emailVerified: boolean("email_verified").default(false).notNull(),
      verificationToken: text("verification_token"),
      verificationExpires: timestamp("verification_expires"),
      isPremium: boolean("is_premium").default(false).notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    sessions = pgTable("sessions", {
      id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
      token: text("token").notNull().unique(),
      expiresAt: timestamp("expires_at").notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    holdings = pgTable("holdings", {
      id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
      symbol: text("symbol").notNull(),
      name: text("name").notNull(),
      type: text("type").notNull(),
      quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
      purchasePrice: decimal("purchase_price", { precision: 18, scale: 8 }).notNull(),
      purchaseDate: timestamp("purchase_date"),
      notes: text("notes"),
      imageUrl: text("image_url"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    userSettings = pgTable("user_settings", {
      id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id", { length: 36 }).notNull().unique().references(() => users.id, { onDelete: "cascade" }),
      currency: text("currency").default("USD").notNull(),
      notificationsEnabled: boolean("notifications_enabled").default(true).notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    insertUserSchema = createInsertSchema(users).pick({
      email: true,
      password: true,
      name: true
    });
    loginSchema = z.object({
      email: z.string().email("Please enter a valid email address"),
      password: z.string().min(8, "Password must be at least 8 characters")
    });
    registerSchema = z.object({
      email: z.string().email("Please enter a valid email address"),
      password: z.string().min(8, "Password must be at least 8 characters"),
      name: z.string().min(1, "Name is required").optional()
    });
    holdingSchema = z.object({
      symbol: z.string().min(1),
      name: z.string().min(1),
      type: z.string().min(1),
      quantity: z.number().positive(),
      purchasePrice: z.number().positive(),
      purchaseDate: z.string().optional(),
      notes: z.string().optional(),
      imageUrl: z.string().optional()
    });
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  db: () => db,
  pool: () => pool
});
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
var Pool, pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    ({ Pool } = pg);
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?"
      );
    }
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool, { schema: schema_exports });
  }
});

// server/index.ts
import express from "express";

// shared/publicUrl.ts
function isLocalDevHost(domain) {
  const hostname = domain.split(":")[0].toLowerCase();
  if (hostname === "localhost" || hostname.startsWith("127.")) {
    return true;
  }
  if (hostname.startsWith("10.")) return true;
  if (hostname.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return true;
  return false;
}
function getPublicBaseUrl(domain = process.env.EXPO_PUBLIC_DOMAIN) {
  if (!domain) {
    return "http://localhost:5000";
  }
  const protocol = isLocalDevHost(domain) ? "http" : "https";
  return `${protocol}://${domain}`;
}

// server/routes.ts
import { createServer } from "node:http";

// server/services/priceService.ts
var COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";
var priceCache = /* @__PURE__ */ new Map();
var CACHE_TTL_MS = 60 * 1e3;
function getCachedPrice(symbol) {
  const entry = priceCache.get(symbol.toUpperCase());
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return entry;
  }
  return null;
}
function setCachedPrice(symbol, price, change24h) {
  priceCache.set(symbol.toUpperCase(), {
    price,
    change24h,
    timestamp: Date.now()
  });
}
var CRYPTO_SYMBOL_TO_ID = {
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
  CRV: "curve-dao-token"
};
var ID_TO_SYMBOL = Object.fromEntries(
  Object.entries(CRYPTO_SYMBOL_TO_ID).map(([symbol, id]) => [id, symbol])
);
async function getCryptoPrices(symbols) {
  const results = [];
  const coinIds = [];
  const idToSymbolMap = {};
  const symbolsToFetch = [];
  for (const input of symbols) {
    const lowerInput = input.toLowerCase();
    const upperInput = input.toUpperCase();
    const cached = getCachedPrice(upperInput);
    if (cached) {
      results.push({
        symbol: upperInput,
        price: cached.price,
        change24h: cached.change24h,
        source: "coingecko"
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
  if (coinIds.length === 0) {
    return results;
  }
  try {
    const idsParam = coinIds.join(",");
    const url = `${COINGECKO_BASE_URL}/simple/price?ids=${idsParam}&vs_currencies=usd&include_24hr_change=true`;
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json"
      }
    });
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    const data = await response.json();
    for (const [coinId, priceData] of Object.entries(data)) {
      const symbol = idToSymbolMap[coinId];
      if (symbol && priceData) {
        setCachedPrice(symbol, priceData.usd, priceData.usd_24h_change || 0);
        results.push({
          symbol,
          price: priceData.usd,
          change24h: priceData.usd_24h_change || 0,
          source: "coingecko"
        });
      }
    }
  } catch (error) {
    console.error("Error fetching crypto prices from CoinGecko:", error);
  }
  return results;
}
async function getStockPrices(symbols, apiKey) {
  const results = [];
  if (!apiKey) {
    return results;
  }
  const fetchPromises = symbols.map(async (symbol) => {
    try {
      const url = `https://finnhub.io/api/v1/quote?symbol=${symbol.toUpperCase()}&token=${apiKey}`;
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`Finnhub API error for ${symbol}: ${response.status}`);
        return null;
      }
      const data = await response.json();
      if (data && data.c && data.c > 0) {
        return {
          symbol: symbol.toUpperCase(),
          price: data.c,
          change24h: data.dp || 0,
          // dp is the percentage change
          source: "finnhub"
        };
      }
      return null;
    } catch (error) {
      console.error(`Error fetching stock price for ${symbol}:`, error);
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
async function getAllPrices(cryptoSymbols, stockSymbols, finnhubKey) {
  const [cryptoPrices, stockPrices] = await Promise.all([
    getCryptoPrices(cryptoSymbols),
    getStockPrices(stockSymbols, finnhubKey)
  ]);
  return [...cryptoPrices, ...stockPrices];
}
function isCryptoSymbol(symbol) {
  return !!CRYPTO_SYMBOL_TO_ID[symbol.toUpperCase()];
}

// server/services/geminiService.ts
import { GoogleGenAI } from "@google/genai";
var aiClient = null;
function getAIClient() {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}
function isGeminiConfigured() {
  return !!process.env.GEMINI_API_KEY;
}
var SYSTEM_PROMPT = `You are Briefcase AI, a friendly and knowledgeable investment advisor assistant. You help users understand their portfolio, make informed investment decisions, and learn about financial concepts.

Key behaviors:
- Be concise but informative - aim for 2-3 paragraphs max unless the user asks for detail
- Use simple language, avoid excessive jargon
- When discussing specific investments, always include appropriate disclaimers
- If you don't know something, say so - never make up financial data
- Be encouraging but realistic about investment expectations
- Consider the user's portfolio context when giving advice

Always include this disclaimer when giving specific investment advice:
"This is for educational purposes only and not financial advice. Please consult a qualified financial advisor for personalized recommendations."`;
async function chat(message, history = [], portfolioContext) {
  const client = getAIClient();
  if (!client) {
    return "Gemini AI is not configured. Please add your GEMINI_API_KEY to enable AI features.";
  }
  try {
    let contextPrompt = SYSTEM_PROMPT;
    if (portfolioContext) {
      contextPrompt += `

User's current portfolio context:
- Total Portfolio Value: $${portfolioContext.totalValue.toLocaleString()}
- Risk Score: ${portfolioContext.riskScore}/100
- Diversification Score: ${portfolioContext.diversificationScore}/100
- Holdings:
${portfolioContext.holdings.map(
        (h) => `  - ${h.name} (${h.symbol}): $${h.value.toLocaleString()} | ${h.gainPercent >= 0 ? "+" : ""}${h.gainPercent.toFixed(1)}% | Type: ${h.type}`
      ).join("\n")}`;
    }
    const formattedHistory = history.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: contextPrompt
      },
      contents: [
        ...formattedHistory,
        { role: "user", parts: [{ text: message }] }
      ]
    });
    return response.text || "I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error("Gemini API error:", error);
    return "I encountered an error processing your request. Please try again later.";
  }
}
async function generatePortfolioInsights(portfolioContext) {
  const client = getAIClient();
  if (!client) {
    return "Gemini AI is not configured. Please add your GEMINI_API_KEY to enable AI insights.";
  }
  try {
    const prompt = `Analyze this investment portfolio and provide 3-4 brief, actionable insights:

Portfolio Overview:
- Total Value: $${portfolioContext.totalValue.toLocaleString()}
- Risk Score: ${portfolioContext.riskScore}/100 (higher = riskier)
- Diversification Score: ${portfolioContext.diversificationScore}/100

Holdings:
${portfolioContext.holdings.map(
      (h) => `- ${h.name} (${h.symbol}): $${h.value.toLocaleString()} | ${h.gainPercent >= 0 ? "+" : ""}${h.gainPercent.toFixed(1)}% | Type: ${h.type}`
    ).join("\n")}

Provide practical, concise insights about:
1. Portfolio balance and diversification
2. Any concentration risks
3. Potential opportunities
4. Overall assessment

Keep each insight to 1-2 sentences.`;
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    });
    return response.text || "Unable to generate insights at this time.";
  } catch (error) {
    console.error("Gemini insights error:", error);
    return "Unable to generate insights. Please check your API key and try again.";
  }
}
async function explainAsset(symbol, name, type) {
  const client = getAIClient();
  if (!client) {
    return "Gemini AI is not configured.";
  }
  try {
    const prompt = `Provide a brief overview (2-3 paragraphs) of ${name} (${symbol}), a ${type} investment. Include:
1. What it is and what makes it notable
2. Key factors that typically affect its price
3. General risk considerations

Keep it informative but accessible for beginners.`;
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    });
    return response.text || "Unable to generate asset explanation.";
  } catch (error) {
    console.error("Gemini asset explanation error:", error);
    return "Unable to explain this asset. Please try again.";
  }
}

// server/services/assetSearchService.ts
var COINGECKO_BASE = "https://api.coingecko.com/api/v3";
var FINNHUB_BASE = "https://finnhub.io/api/v1";
var POPULAR_CRYPTO = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", type: "crypto", imageUrl: "https://assets.coingecko.com/coins/images/1/thumb/bitcoin.png" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", type: "crypto", imageUrl: "https://assets.coingecko.com/coins/images/279/thumb/ethereum.png" },
  { id: "solana", symbol: "SOL", name: "Solana", type: "crypto", imageUrl: "https://assets.coingecko.com/coins/images/4128/thumb/solana.png" },
  { id: "cardano", symbol: "ADA", name: "Cardano", type: "crypto", imageUrl: "https://assets.coingecko.com/coins/images/975/thumb/cardano.png" },
  { id: "ripple", symbol: "XRP", name: "XRP", type: "crypto", imageUrl: "https://assets.coingecko.com/coins/images/44/thumb/xrp-symbol-white-128.png" },
  { id: "polkadot", symbol: "DOT", name: "Polkadot", type: "crypto", imageUrl: "https://assets.coingecko.com/coins/images/12171/thumb/polkadot.png" },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin", type: "crypto", imageUrl: "https://assets.coingecko.com/coins/images/5/thumb/dogecoin.png" },
  { id: "avalanche-2", symbol: "AVAX", name: "Avalanche", type: "crypto", imageUrl: "https://assets.coingecko.com/coins/images/12559/thumb/Avalanche_Circle_RedWhite_Trans.png" },
  { id: "chainlink", symbol: "LINK", name: "Chainlink", type: "crypto", imageUrl: "https://assets.coingecko.com/coins/images/877/thumb/chainlink-new-logo.png" },
  { id: "uniswap", symbol: "UNI", name: "Uniswap", type: "crypto", imageUrl: "https://assets.coingecko.com/coins/images/12504/thumb/uniswap-logo.png" }
];
var POPULAR_STOCKS = [
  { id: "AAPL", symbol: "AAPL", name: "Apple Inc.", type: "stock" },
  { id: "MSFT", symbol: "MSFT", name: "Microsoft Corporation", type: "stock" },
  { id: "GOOGL", symbol: "GOOGL", name: "Alphabet Inc.", type: "stock" },
  { id: "AMZN", symbol: "AMZN", name: "Amazon.com Inc.", type: "stock" },
  { id: "NVDA", symbol: "NVDA", name: "NVIDIA Corporation", type: "stock" },
  { id: "META", symbol: "META", name: "Meta Platforms Inc.", type: "stock" },
  { id: "TSLA", symbol: "TSLA", name: "Tesla Inc.", type: "stock" },
  { id: "BRK.B", symbol: "BRK.B", name: "Berkshire Hathaway", type: "stock" },
  { id: "JPM", symbol: "JPM", name: "JPMorgan Chase & Co.", type: "stock" },
  { id: "V", symbol: "V", name: "Visa Inc.", type: "stock" }
];
var POPULAR_ETFS = [
  { id: "SPY", symbol: "SPY", name: "SPDR S&P 500 ETF Trust", type: "etf" },
  { id: "QQQ", symbol: "QQQ", name: "Invesco QQQ Trust", type: "etf" },
  { id: "VTI", symbol: "VTI", name: "Vanguard Total Stock Market ETF", type: "etf" },
  { id: "VOO", symbol: "VOO", name: "Vanguard S&P 500 ETF", type: "etf" },
  { id: "IWM", symbol: "IWM", name: "iShares Russell 2000 ETF", type: "etf" },
  { id: "VEA", symbol: "VEA", name: "Vanguard FTSE Developed Markets ETF", type: "etf" },
  { id: "VWO", symbol: "VWO", name: "Vanguard FTSE Emerging Markets ETF", type: "etf" },
  { id: "GLD", symbol: "GLD", name: "SPDR Gold Shares", type: "etf" },
  { id: "TLT", symbol: "TLT", name: "iShares 20+ Year Treasury Bond ETF", type: "etf" },
  { id: "ARKK", symbol: "ARKK", name: "ARK Innovation ETF", type: "etf" }
];
var POPULAR_BONDS = [
  { id: "BND", symbol: "BND", name: "Vanguard Total Bond Market ETF", type: "bond" },
  { id: "AGG", symbol: "AGG", name: "iShares Core U.S. Aggregate Bond ETF", type: "bond" },
  { id: "TLT", symbol: "TLT", name: "iShares 20+ Year Treasury Bond ETF", type: "bond" },
  { id: "LQD", symbol: "LQD", name: "iShares iBoxx Investment Grade Corporate Bond ETF", type: "bond" },
  { id: "HYG", symbol: "HYG", name: "iShares iBoxx High Yield Corporate Bond ETF", type: "bond" },
  { id: "TIPS", symbol: "TIP", name: "iShares TIPS Bond ETF", type: "bond" },
  { id: "MUB", symbol: "MUB", name: "iShares National Muni Bond ETF", type: "bond" },
  { id: "SHY", symbol: "SHY", name: "iShares 1-3 Year Treasury Bond ETF", type: "bond" }
];
var POPULAR_COMMODITIES = [
  { id: "GOLD", symbol: "GC", name: "Gold", type: "commodity" },
  { id: "SILVER", symbol: "SI", name: "Silver", type: "commodity" },
  { id: "OIL", symbol: "CL", name: "Crude Oil (WTI)", type: "commodity" },
  { id: "NATGAS", symbol: "NG", name: "Natural Gas", type: "commodity" },
  { id: "COPPER", symbol: "HG", name: "Copper", type: "commodity" },
  { id: "PLATINUM", symbol: "PL", name: "Platinum", type: "commodity" },
  { id: "PALLADIUM", symbol: "PA", name: "Palladium", type: "commodity" },
  { id: "WHEAT", symbol: "ZW", name: "Wheat", type: "commodity" },
  { id: "CORN", symbol: "ZC", name: "Corn", type: "commodity" },
  { id: "COFFEE", symbol: "KC", name: "Coffee", type: "commodity" }
];
var POPULAR_REAL_ESTATE = [
  { id: "VNQ", symbol: "VNQ", name: "Vanguard Real Estate ETF", type: "real_estate" },
  { id: "SCHH", symbol: "SCHH", name: "Schwab U.S. REIT ETF", type: "real_estate" },
  { id: "IYR", symbol: "IYR", name: "iShares U.S. Real Estate ETF", type: "real_estate" },
  { id: "O", symbol: "O", name: "Realty Income Corporation", type: "real_estate" },
  { id: "AMT", symbol: "AMT", name: "American Tower Corporation", type: "real_estate" },
  { id: "PLD", symbol: "PLD", name: "Prologis Inc.", type: "real_estate" },
  { id: "SPG", symbol: "SPG", name: "Simon Property Group", type: "real_estate" },
  { id: "EQIX", symbol: "EQIX", name: "Equinix Inc.", type: "real_estate" }
];
var POPULAR_CASH = [
  { id: "USD", symbol: "USD", name: "US Dollar", type: "cash" },
  { id: "EUR", symbol: "EUR", name: "Euro", type: "cash" },
  { id: "GBP", symbol: "GBP", name: "British Pound", type: "cash" },
  { id: "JPY", symbol: "JPY", name: "Japanese Yen", type: "cash" },
  { id: "CHF", symbol: "CHF", name: "Swiss Franc", type: "cash" },
  { id: "SAVINGS", symbol: "SAVINGS", name: "Savings Account", type: "cash" },
  { id: "MMKT", symbol: "MMKT", name: "Money Market Fund", type: "cash" }
];
function getPopularAssets(type) {
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
async function searchCrypto(query) {
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
    return coins.map((coin) => ({
      id: coin.id,
      symbol: coin.symbol?.toUpperCase() || "",
      name: coin.name,
      type: "crypto",
      imageUrl: coin.thumb
    }));
  } catch (error) {
    console.error("Error searching crypto:", error);
    return filterLocalAssets(POPULAR_CRYPTO, query);
  }
}
async function searchStocks(query) {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return filterLocalAssets([...POPULAR_STOCKS, ...POPULAR_ETFS], query);
  }
  try {
    const response = await fetch(
      `${FINNHUB_BASE}/search?q=${encodeURIComponent(query)}&token=${apiKey}`
    );
    if (!response.ok) {
      console.error("Finnhub search failed:", response.status);
      return filterLocalAssets([...POPULAR_STOCKS, ...POPULAR_ETFS], query);
    }
    const data = await response.json();
    const results = data.result?.slice(0, 10) || [];
    const seen = /* @__PURE__ */ new Set();
    return results.filter((item) => item.type === "Common Stock" || item.type === "ETF").map((item) => {
      const assetType = item.type === "ETF" ? "etf" : "stock";
      return {
        id: `${item.symbol}-${assetType}`,
        symbol: item.symbol,
        name: item.description,
        type: assetType
      };
    }).filter((item) => {
      if (seen.has(item.symbol)) return false;
      seen.add(item.symbol);
      return true;
    });
  } catch (error) {
    console.error("Error searching stocks:", error);
    return filterLocalAssets([...POPULAR_STOCKS, ...POPULAR_ETFS], query);
  }
}
async function searchAssets(query, type) {
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
  const allResults = [];
  const [cryptoResults, stockResults] = await Promise.all([
    searchCrypto(lowerQuery),
    searchStocks(lowerQuery)
  ]);
  allResults.push(...cryptoResults.slice(0, 5));
  allResults.push(...stockResults.slice(0, 5));
  allResults.push(...filterLocalAssets(POPULAR_COMMODITIES, lowerQuery).slice(0, 3));
  allResults.push(...filterLocalAssets(POPULAR_BONDS, lowerQuery).slice(0, 3));
  allResults.push(...filterLocalAssets(POPULAR_REAL_ESTATE, lowerQuery).slice(0, 2));
  return allResults;
}
function filterLocalAssets(assets, query) {
  const lowerQuery = query.toLowerCase();
  return assets.filter(
    (asset) => asset.name.toLowerCase().includes(lowerQuery) || asset.symbol.toLowerCase().includes(lowerQuery)
  );
}

// server/services/authService.ts
import bcrypt from "bcryptjs";
import crypto from "crypto";

// server/storage.ts
init_schema();
init_db();
import { eq, and, gt } from "drizzle-orm";
var DatabaseStorage = class {
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || void 0;
  }
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user || void 0;
  }
  async getUserByAppleId(appleId) {
    const [user] = await db.select().from(users).where(eq(users.appleId, appleId));
    return user || void 0;
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values({
      ...insertUser,
      email: insertUser.email.toLowerCase()
    }).returning();
    return user;
  }
  async updateUser(id, data) {
    const [user] = await db.update(users).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, id)).returning();
    return user || void 0;
  }
  async deleteUser(id) {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }
  async createSession(userId, token, expiresAt) {
    const [session] = await db.insert(sessions).values({ userId, token, expiresAt }).returning();
    return session;
  }
  async getSessionByToken(token) {
    const [session] = await db.select().from(sessions).where(and(eq(sessions.token, token), gt(sessions.expiresAt, /* @__PURE__ */ new Date())));
    return session || void 0;
  }
  async deleteSession(token) {
    await db.delete(sessions).where(eq(sessions.token, token));
  }
  async deleteUserSessions(userId) {
    await db.delete(sessions).where(eq(sessions.userId, userId));
  }
  async getHoldingsByUser(userId) {
    return db.select().from(holdings).where(eq(holdings.userId, userId));
  }
  async createHolding(userId, holding) {
    const [newHolding] = await db.insert(holdings).values({ ...holding, userId }).returning();
    return newHolding;
  }
  async updateHolding(id, userId, data) {
    const [holding] = await db.update(holdings).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(and(eq(holdings.id, id), eq(holdings.userId, userId))).returning();
    return holding || void 0;
  }
  async deleteHolding(id, userId) {
    const result = await db.delete(holdings).where(and(eq(holdings.id, id), eq(holdings.userId, userId))).returning();
    return result.length > 0;
  }
  async deleteAllHoldings(userId) {
    await db.delete(holdings).where(eq(holdings.userId, userId));
  }
  async getUserSettings(userId) {
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    return settings || void 0;
  }
  async upsertUserSettings(userId, settings) {
    const existing = await this.getUserSettings(userId);
    if (existing) {
      const [updated] = await db.update(userSettings).set({ ...settings, updatedAt: /* @__PURE__ */ new Date() }).where(eq(userSettings.userId, userId)).returning();
      return updated;
    } else {
      const [created] = await db.insert(userSettings).values({
        userId,
        currency: settings.currency || "USD",
        notificationsEnabled: settings.notificationsEnabled ?? true
      }).returning();
      return created;
    }
  }
};
var storage = new DatabaseStorage();

// server/services/emailService.ts
import { Resend } from "resend";
var resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
var APP_NAME = "Briefcase";
var FROM_EMAIL = "ugo@echovault.me";
console.log(`Email service initialized: ${resend ? "Resend configured" : "Resend not configured (missing RESEND_API_KEY)"}`);
async function sendVerificationEmail(to, name, verificationToken) {
  if (!resend) {
    console.warn("Resend not configured - email not sent. Please add RESEND_API_KEY to secrets.");
    return { success: false, error: "Email service not configured" };
  }
  console.log(`[EMAIL] Attempting to send verification email to: ${to}`);
  console.log(`[EMAIL] Using FROM_EMAIL: ${FROM_EMAIL}`);
  try {
    const baseUrl = getPublicBaseUrl();
    const verificationUrl = `${baseUrl}/api/auth/verify/${verificationToken}`;
    console.log(`[EMAIL] Verification URL: ${verificationUrl}`);
    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject: `Verify your ${APP_NAME} account`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify your email</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #0A0A0B; font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0A0A0B;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="100%" style="max-width: 480px; background-color: #141416; border-radius: 12px; border: 1px solid #262629;">
                  <tr>
                    <td style="padding: 40px;">
                      <div style="text-align: center; margin-bottom: 32px;">
                        <div style="display: inline-block; width: 56px; height: 56px; background-color: #C9A962; border-radius: 12px; line-height: 56px; font-size: 24px;">
                          <span style="color: #0A0A0B;">B</span>
                        </div>
                      </div>
                      
                      <h1 style="color: #FAFAFA; font-size: 24px; font-weight: 600; margin: 0 0 16px 0; text-align: center;">
                        Verify your email
                      </h1>
                      
                      <p style="color: #A1A1A6; font-size: 16px; line-height: 24px; margin: 0 0 24px 0; text-align: center;">
                        Hi ${name || "there"},<br><br>
                        Thanks for signing up for ${APP_NAME}. Please verify your email address to complete your registration.
                      </p>
                      
                      <div style="text-align: center; margin-bottom: 24px;">
                        <a href="${verificationUrl}" style="display: inline-block; background-color: #C9A962; color: #0A0A0B; text-decoration: none; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px;">
                          Verify Email
                        </a>
                      </div>
                      
                      <p style="color: #A1A1A6; font-size: 14px; line-height: 20px; margin: 0 0 16px 0; text-align: center;">
                        Or copy this verification code:
                      </p>
                      
                      <div style="background-color: #1C1C1E; border: 1px solid #262629; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 24px;">
                        <code style="color: #C9A962; font-size: 18px; font-family: 'IBM Plex Mono', monospace; letter-spacing: 2px;">
                          ${verificationToken.substring(0, 8).toUpperCase()}
                        </code>
                      </div>
                      
                      <p style="color: #6B6B70; font-size: 12px; line-height: 18px; margin: 0; text-align: center;">
                        This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                </table>
                
                <p style="color: #6B6B70; font-size: 12px; margin-top: 24px; text-align: center;">
                  ${APP_NAME} - AI-Powered Investment Dashboard
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `
Hi ${name || "there"},

Thanks for signing up for ${APP_NAME}. Please verify your email address.

Click this link to verify: ${verificationUrl}

Or use this verification code: ${verificationToken.substring(0, 8).toUpperCase()}

This link expires in 24 hours.

If you didn't create an account, you can safely ignore this email.

- The ${APP_NAME} Team
      `.trim()
    });
    if (error) {
      console.error("[EMAIL] Resend API error:", JSON.stringify(error, null, 2));
      const errorMessage = error.message || "Email send failed";
      if (errorMessage.includes("sandbox") || errorMessage.includes("verify")) {
        return {
          success: false,
          error: "Resend sandbox mode: Can only send to verified email addresses. Add a verified domain in Resend dashboard."
        };
      }
      return { success: false, error: errorMessage };
    }
    console.log(`[EMAIL] Verification email sent successfully to: ${to}`);
    console.log(`[EMAIL] Resend response:`, JSON.stringify(data, null, 2));
    return { success: true };
  } catch (error) {
    console.error("[EMAIL] Email send exception:", error?.message || error);
    console.error("[EMAIL] Full error:", error);
    return { success: false, error: error?.message || "Failed to send verification email" };
  }
}
async function sendWelcomeEmail(to, name) {
  if (!resend) {
    return { success: false, error: "Email service not configured" };
  }
  try {
    const { error } = await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject: `Welcome to ${APP_NAME}!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #0A0A0B; font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0A0A0B;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="100%" style="max-width: 480px; background-color: #141416; border-radius: 12px; border: 1px solid #262629;">
                  <tr>
                    <td style="padding: 40px;">
                      <div style="text-align: center; margin-bottom: 32px;">
                        <div style="display: inline-block; width: 56px; height: 56px; background-color: #C9A962; border-radius: 12px; line-height: 56px; font-size: 24px;">
                          <span style="color: #0A0A0B;">B</span>
                        </div>
                      </div>
                      
                      <h1 style="color: #FAFAFA; font-size: 24px; font-weight: 600; margin: 0 0 16px 0; text-align: center;">
                        Welcome to ${APP_NAME}!
                      </h1>
                      
                      <p style="color: #A1A1A6; font-size: 16px; line-height: 24px; margin: 0 0 24px 0; text-align: center;">
                        Hi ${name || "there"},<br><br>
                        Your account is now verified and ready to use. Start tracking your investments with AI-powered insights.
                      </p>
                      
                      <div style="background-color: #1C1C1E; border: 1px solid #262629; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                        <h3 style="color: #FAFAFA; font-size: 14px; font-weight: 600; margin: 0 0 12px 0;">Get started:</h3>
                        <ul style="color: #A1A1A6; font-size: 14px; line-height: 22px; margin: 0; padding-left: 20px;">
                          <li>Add your first investment holding</li>
                          <li>View real-time portfolio analytics</li>
                          <li>Chat with AI for investment insights</li>
                        </ul>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `Welcome to ${APP_NAME}!

Hi ${name || "there"},

Your account is now verified. Start tracking your investments with AI-powered insights.

- The ${APP_NAME} Team`
    });
    if (error) {
      console.error("Resend welcome email error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    console.error("Welcome email error:", error);
    return { success: false, error: "Failed to send welcome email" };
  }
}

// server/services/authService.ts
var SALT_ROUNDS = 12;
var SESSION_DURATION_DAYS = 30;
var VERIFICATION_TOKEN_DURATION_HOURS = 24;
function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}
function sanitizeUser(user) {
  const { password, verificationToken, ...sanitized } = user;
  return sanitized;
}
async function register(email, password, name) {
  try {
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return { success: false, error: "An account with this email already exists" };
    }
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const verificationToken = generateToken();
    const verificationExpires = new Date(
      Date.now() + VERIFICATION_TOKEN_DURATION_HOURS * 60 * 60 * 1e3
    );
    const user = await storage.createUser({
      email,
      password: hashedPassword,
      name: name || email.split("@")[0],
      verificationToken,
      verificationExpires
    });
    console.log(`[AUTH] Sending verification email for user: ${email}`);
    const emailResult = await sendVerificationEmail(
      email,
      name || email.split("@")[0],
      verificationToken
    );
    if (!emailResult.success) {
      console.warn(`[AUTH] Failed to send verification email to ${email}:`, emailResult.error);
    } else {
      console.log(`[AUTH] Verification email sent successfully to ${email}`);
    }
    return {
      success: true,
      user: sanitizeUser(user),
      verificationRequired: true,
      emailSent: emailResult.success
    };
  } catch (error) {
    console.error("Registration error:", error);
    return { success: false, error: "Failed to create account" };
  }
}
async function login(email, password) {
  try {
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return { success: false, error: "Invalid email or password" };
    }
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return { success: false, error: "Invalid email or password" };
    }
    if (!user.emailVerified) {
      return {
        success: false,
        error: "Please verify your email before logging in",
        verificationRequired: true
      };
    }
    const sessionToken = generateToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1e3);
    await storage.createSession(user.id, sessionToken, expiresAt);
    return {
      success: true,
      user: sanitizeUser(user),
      token: sessionToken
    };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: "Failed to log in" };
  }
}
async function verifyEmail(token) {
  try {
    const users2 = await storage.getUserByEmail("");
    const result = await Promise.resolve().then(() => (init_db(), db_exports)).then(async ({ db: db2 }) => {
      const { users: users3 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2, gt: gt2 } = await import("drizzle-orm");
      const [user] = await db2.select().from(users3).where(
        and2(
          eq2(users3.verificationToken, token),
          gt2(users3.verificationExpires, /* @__PURE__ */ new Date())
        )
      );
      return user;
    });
    if (!result) {
      return { success: false, error: "Invalid or expired verification link" };
    }
    await storage.updateUser(result.id, {
      emailVerified: true,
      verificationToken: null,
      verificationExpires: null
    });
    const sessionToken = generateToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1e3);
    await storage.createSession(result.id, sessionToken, expiresAt);
    const updatedUser = await storage.getUser(result.id);
    if (updatedUser) {
      sendWelcomeEmail(updatedUser.email, updatedUser.name || "").catch(console.error);
    }
    return {
      success: true,
      user: updatedUser ? sanitizeUser(updatedUser) : void 0,
      token: sessionToken
    };
  } catch (error) {
    console.error("Email verification error:", error);
    return { success: false, error: "Failed to verify email" };
  }
}
async function resendVerification(email) {
  try {
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return { success: true };
    }
    if (user.emailVerified) {
      return { success: false, error: "Email is already verified" };
    }
    const verificationToken = generateToken();
    const verificationExpires = new Date(
      Date.now() + VERIFICATION_TOKEN_DURATION_HOURS * 60 * 60 * 1e3
    );
    await storage.updateUser(user.id, {
      verificationToken,
      verificationExpires
    });
    const emailResult = await sendVerificationEmail(
      user.email,
      user.name || "",
      verificationToken
    );
    return {
      success: true,
      emailSent: emailResult.success
    };
  } catch (error) {
    console.error("Resend verification error:", error);
    return { success: false, error: "Failed to resend verification" };
  }
}
async function validateSession(token) {
  try {
    const session = await storage.getSessionByToken(token);
    if (!session) {
      return { success: false, error: "Invalid or expired session" };
    }
    const user = await storage.getUser(session.userId);
    if (!user) {
      return { success: false, error: "User not found" };
    }
    return {
      success: true,
      user: sanitizeUser(user),
      token
    };
  } catch (error) {
    console.error("Session validation error:", error);
    return { success: false, error: "Failed to validate session" };
  }
}
async function logout(token) {
  try {
    await storage.deleteSession(token);
    return { success: true };
  } catch (error) {
    console.error("Logout error:", error);
    return { success: false };
  }
}
async function getUserFromToken(token) {
  try {
    const session = await storage.getSessionByToken(token);
    if (!session) return null;
    const user = await storage.getUser(session.userId);
    return user || null;
  } catch {
    return null;
  }
}
async function authenticateWithApple(identityToken, email, fullName, user) {
  try {
    const verificationResult = await verifyAppleToken(identityToken);
    if (!verificationResult.valid) {
      return { success: false, error: "Invalid Apple authentication" };
    }
    let existingUser = await storage.getUserByAppleId(user);
    if (!existingUser && email) {
      existingUser = await storage.getUserByEmail(email);
      if (existingUser && !existingUser.appleId) {
        await storage.updateUser(existingUser.id, { appleId: user });
      }
    }
    if (existingUser) {
      const sessionToken2 = generateToken();
      const expiresAt2 = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1e3);
      await storage.createSession(existingUser.id, sessionToken2, expiresAt2);
      return {
        success: true,
        user: sanitizeUser(existingUser),
        token: sessionToken2
      };
    }
    let name = "";
    if (fullName && (fullName.givenName || fullName.familyName)) {
      name = [fullName.givenName, fullName.familyName].filter(Boolean).join(" ").trim();
    }
    if (!name) {
      if (email && !email.includes("privaterelay")) {
        name = email.split("@")[0];
      }
    }
    if (!name) {
      name = "Apple User";
    }
    const newUser = await storage.createUser({
      email: email || `${user}@privaterelay.appleid.com`,
      password: await bcrypt.hash(generateToken(), SALT_ROUNDS),
      // Random password for Apple users
      name,
      appleId: user,
      emailVerified: true
      // Apple accounts are pre-verified
    });
    const sessionToken = generateToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1e3);
    await storage.createSession(newUser.id, sessionToken, expiresAt);
    if (email && !email.includes("privaterelay")) {
      sendWelcomeEmail(email, name).catch(console.error);
    }
    return {
      success: true,
      user: sanitizeUser(newUser),
      token: sessionToken
    };
  } catch (error) {
    console.error("Apple authentication error:", error);
    return { success: false, error: "Apple authentication failed" };
  }
}
async function verifyAppleToken(identityToken) {
  try {
    const [headerB64, payloadB64] = identityToken.split(".");
    const header = JSON.parse(Buffer.from(headerB64, "base64url").toString());
    const unverifiedPayload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    console.log("Apple token audience:", unverifiedPayload.aud);
    console.log("Apple token issuer:", unverifiedPayload.iss);
    const keysResponse = await fetch("https://appleid.apple.com/auth/keys");
    const keysData = await keysResponse.json();
    const key = keysData.keys.find((k) => k.kid === header.kid);
    if (!key) {
      console.error("Apple key not found for kid:", header.kid);
      return { valid: false };
    }
    const { jwtVerify, importJWK } = await import("jose");
    const publicKey = await importJWK(key, "RS256");
    const validAudiences = [
      "me.echovault.briefcase",
      "host.exp.Exponent"
    ];
    const tokenAudience = unverifiedPayload.aud;
    const { payload } = await jwtVerify(identityToken, publicKey, {
      issuer: "https://appleid.apple.com",
      audience: validAudiences.includes(tokenAudience) ? tokenAudience : validAudiences
    });
    console.log("Apple token verified successfully");
    return { valid: true, payload };
  } catch (error) {
    console.error("Apple token verification error:", error);
    return { valid: false };
  }
}

// server/routes.ts
init_schema();
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const token = authHeader.substring(7);
  const user = await getUserFromToken(token);
  if (!user) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
  req.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    isPremium: user.isPremium
  };
  next();
}
async function registerRoutes(app2) {
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: parsed.error.errors[0]?.message || "Invalid input"
        });
      }
      const { email, password, name } = parsed.data;
      const result = await register(email, password, name);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.json({
        success: true,
        message: "Account created. Please check your email to verify your account.",
        user: result.user,
        verificationToken: result.verificationToken
      });
    } catch (error) {
      console.error("Error in /api/auth/register:", error);
      res.status(500).json({ error: "Failed to create account" });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: parsed.error.errors[0]?.message || "Invalid input"
        });
      }
      const { email, password } = parsed.data;
      const result = await login(email, password);
      if (!result.success) {
        return res.status(401).json({
          error: result.error,
          verificationRequired: result.verificationRequired
        });
      }
      res.json({
        success: true,
        user: result.user,
        token: result.token
      });
    } catch (error) {
      console.error("Error in /api/auth/login:", error);
      res.status(500).json({ error: "Failed to log in" });
    }
  });
  app2.post("/api/auth/apple", async (req, res) => {
    try {
      const { identityToken, email, fullName, user } = req.body;
      if (!identityToken || !user) {
        return res.status(400).json({ error: "Missing Apple authentication data" });
      }
      const result = await authenticateWithApple(
        identityToken,
        email || null,
        fullName || null,
        user
      );
      if (!result.success) {
        return res.status(401).json({ error: result.error });
      }
      res.json({
        success: true,
        user: result.user,
        token: result.token
      });
    } catch (error) {
      console.error("Error in /api/auth/apple:", error);
      res.status(500).json({ error: "Apple authentication failed" });
    }
  });
  app2.get("/api/auth/verify/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const result = await verifyEmail(token);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.json({
        success: true,
        message: "Email verified successfully",
        user: result.user,
        token: result.token
      });
    } catch (error) {
      console.error("Error in /api/auth/verify:", error);
      res.status(500).json({ error: "Failed to verify email" });
    }
  });
  app2.post("/api/auth/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      const result = await resendVerification(email);
      res.json({
        success: true,
        message: "If an account exists with this email, a verification link has been sent.",
        verificationToken: result.verificationToken
      });
    } catch (error) {
      console.error("Error in /api/auth/resend-verification:", error);
      res.status(500).json({ error: "Failed to resend verification" });
    }
  });
  app2.get("/api/auth/me", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const token = authHeader.substring(7);
      const result = await validateSession(token);
      if (!result.success) {
        return res.status(401).json({ error: result.error });
      }
      res.json({
        success: true,
        user: result.user
      });
    } catch (error) {
      console.error("Error in /api/auth/me:", error);
      res.status(500).json({ error: "Failed to get user info" });
    }
  });
  app2.put("/api/auth/profile", authMiddleware, async (req, res) => {
    try {
      const { name } = req.body;
      if (!name || typeof name !== "string" || name.trim().length < 1) {
        return res.status(400).json({ error: "Name is required" });
      }
      const updatedUser = await storage.updateUser(req.user.id, { name: name.trim() });
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({
        success: true,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          isPremium: updatedUser.isPremium
        }
      });
    } catch (error) {
      console.error("Error in /api/auth/profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });
  app2.post("/api/auth/logout", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        await logout(token);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error in /api/auth/logout:", error);
      res.status(500).json({ error: "Failed to log out" });
    }
  });
  app2.delete("/api/auth/delete-account", authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;
      const deleted = await storage.deleteUser(userId);
      if (!deleted) {
        return res.status(404).json({ error: "Account not found" });
      }
      res.json({ success: true, message: "Account deleted successfully" });
    } catch (error) {
      console.error("Error in /api/auth/delete-account:", error);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });
  app2.get("/api/holdings", authMiddleware, async (req, res) => {
    try {
      const holdings2 = await storage.getHoldingsByUser(req.user.id);
      res.json({ holdings: holdings2 });
    } catch (error) {
      console.error("Error in GET /api/holdings:", error);
      res.status(500).json({ error: "Failed to get holdings" });
    }
  });
  app2.post("/api/holdings", authMiddleware, async (req, res) => {
    try {
      const parsed = holdingSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: parsed.error.errors[0]?.message || "Invalid input"
        });
      }
      const holding = await storage.createHolding(req.user.id, {
        ...parsed.data,
        quantity: parsed.data.quantity.toString(),
        purchasePrice: parsed.data.purchasePrice.toString(),
        purchaseDate: parsed.data.purchaseDate ? new Date(parsed.data.purchaseDate) : null,
        notes: parsed.data.notes || null
      });
      res.json({ success: true, holding });
    } catch (error) {
      console.error("Error in POST /api/holdings:", error);
      res.status(500).json({ error: "Failed to create holding" });
    }
  });
  app2.put("/api/holdings/:id", authMiddleware, async (req, res) => {
    try {
      const id = req.params.id;
      const parsed = holdingSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: parsed.error.errors[0]?.message || "Invalid input"
        });
      }
      const updateData = { ...parsed.data };
      if (parsed.data.quantity !== void 0) {
        updateData.quantity = parsed.data.quantity.toString();
      }
      if (parsed.data.purchasePrice !== void 0) {
        updateData.purchasePrice = parsed.data.purchasePrice.toString();
      }
      if (parsed.data.purchaseDate !== void 0) {
        updateData.purchaseDate = parsed.data.purchaseDate ? new Date(parsed.data.purchaseDate) : null;
      }
      const holding = await storage.updateHolding(id, req.user.id, updateData);
      if (!holding) {
        return res.status(404).json({ error: "Holding not found" });
      }
      res.json({ success: true, holding });
    } catch (error) {
      console.error("Error in PUT /api/holdings:", error);
      res.status(500).json({ error: "Failed to update holding" });
    }
  });
  app2.delete("/api/holdings", authMiddleware, async (req, res) => {
    try {
      await storage.deleteAllHoldings(req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error in DELETE /api/holdings (all):", error);
      res.status(500).json({ error: "Failed to clear all holdings" });
    }
  });
  app2.delete("/api/holdings/:id", authMiddleware, async (req, res) => {
    try {
      const id = req.params.id;
      const deleted = await storage.deleteHolding(id, req.user.id);
      if (!deleted) {
        return res.status(404).json({ error: "Holding not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error in DELETE /api/holdings:", error);
      res.status(500).json({ error: "Failed to delete holding" });
    }
  });
  app2.get("/api/settings", authMiddleware, async (req, res) => {
    try {
      const settings = await storage.getUserSettings(req.user.id);
      res.json({
        settings: settings || {
          currency: "USD",
          notificationsEnabled: true
        }
      });
    } catch (error) {
      console.error("Error in GET /api/settings:", error);
      res.status(500).json({ error: "Failed to get settings" });
    }
  });
  app2.put("/api/settings", authMiddleware, async (req, res) => {
    try {
      const { currency, notificationsEnabled } = req.body;
      const settings = await storage.upsertUserSettings(req.user.id, {
        currency,
        notificationsEnabled
      });
      res.json({ success: true, settings });
    } catch (error) {
      console.error("Error in PUT /api/settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });
  app2.get("/api/prices/crypto", async (req, res) => {
    try {
      const symbols = req.query.symbols?.split(",") || [];
      if (symbols.length === 0) {
        return res.status(400).json({ error: "symbols query parameter required" });
      }
      const prices = await getCryptoPrices(symbols);
      res.json({ prices, timestamp: Date.now() });
    } catch (error) {
      console.error("Error in /api/prices/crypto:", error);
      res.status(500).json({ error: "Failed to fetch crypto prices" });
    }
  });
  app2.get("/api/prices/stocks", async (req, res) => {
    try {
      const symbols = req.query.symbols?.split(",") || [];
      const apiKey = process.env.FINNHUB_API_KEY;
      if (symbols.length === 0) {
        return res.status(400).json({ error: "symbols query parameter required" });
      }
      if (!apiKey) {
        return res.json({
          prices: [],
          timestamp: Date.now(),
          message: "Finnhub API key not configured"
        });
      }
      const prices = await getStockPrices(symbols, apiKey);
      res.json({ prices, timestamp: Date.now() });
    } catch (error) {
      console.error("Error in /api/prices/stocks:", error);
      res.status(500).json({ error: "Failed to fetch stock prices" });
    }
  });
  app2.post("/api/prices/batch", async (req, res) => {
    try {
      const { symbols } = req.body;
      if (!symbols || symbols.length === 0) {
        return res.status(400).json({ error: "symbols array required in body" });
      }
      const cryptoSymbols = symbols.filter((s) => isCryptoSymbol(s));
      const stockSymbols = symbols.filter((s) => !isCryptoSymbol(s));
      const finnhubKey = process.env.FINNHUB_API_KEY;
      const prices = await getAllPrices(cryptoSymbols, stockSymbols, finnhubKey);
      res.json({
        prices,
        timestamp: Date.now(),
        hasFinnhub: !!finnhubKey
      });
    } catch (error) {
      console.error("Error in /api/prices/batch:", error);
      res.status(500).json({ error: "Failed to fetch prices" });
    }
  });
  app2.get("/api/assets/search", async (req, res) => {
    try {
      const query = req.query.q || "";
      const type = req.query.type;
      const results = await searchAssets(query, type);
      res.json({ results, timestamp: Date.now() });
    } catch (error) {
      console.error("Error in /api/assets/search:", error);
      res.status(500).json({ error: "Failed to search assets" });
    }
  });
  app2.get("/api/assets/popular/:type", (req, res) => {
    try {
      const { type } = req.params;
      const results = getPopularAssets(type);
      res.json({ results, timestamp: Date.now() });
    } catch (error) {
      console.error("Error in /api/assets/popular:", error);
      res.status(500).json({ error: "Failed to get popular assets" });
    }
  });
  app2.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: Date.now(),
      services: {
        coingecko: true,
        finnhub: !!process.env.FINNHUB_API_KEY,
        gemini: !!process.env.GEMINI_API_KEY
      }
    });
  });
  app2.post("/api/ai/chat", async (req, res) => {
    try {
      const { message, history, portfolioContext } = req.body;
      if (!message) {
        return res.status(400).json({ error: "message is required" });
      }
      if (!isGeminiConfigured()) {
        return res.json({
          response: "AI features are not available. Please configure your Gemini API key.",
          configured: false
        });
      }
      const response = await chat(message, history || [], portfolioContext);
      res.json({ response, configured: true });
    } catch (error) {
      console.error("Error in /api/ai/chat:", error);
      res.status(500).json({ error: "Failed to generate response" });
    }
  });
  app2.post("/api/ai/insights", async (req, res) => {
    try {
      const { portfolioContext } = req.body;
      if (!portfolioContext) {
        return res.status(400).json({ error: "portfolioContext is required" });
      }
      if (!isGeminiConfigured()) {
        return res.json({
          insights: "AI insights are not available. Please configure your Gemini API key.",
          configured: false
        });
      }
      const insights = await generatePortfolioInsights(portfolioContext);
      res.json({ insights, configured: true });
    } catch (error) {
      console.error("Error in /api/ai/insights:", error);
      res.status(500).json({ error: "Failed to generate insights" });
    }
  });
  app2.get("/api/ai/explain/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const { name, type } = req.query;
      if (!isGeminiConfigured()) {
        return res.json({
          explanation: "AI explanations are not available. Please configure your Gemini API key.",
          configured: false
        });
      }
      const explanation = await explainAsset(
        symbol,
        name || symbol,
        type || "investment"
      );
      res.json({ explanation, configured: true });
    } catch (error) {
      console.error("Error in /api/ai/explain:", error);
      res.status(500).json({ error: "Failed to generate explanation" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/index.ts
import * as fs from "fs";
import * as path from "path";
var app = express();
var log = console.log;
function setupCors(app2) {
  app2.use((req, res, next) => {
    const origins = /* @__PURE__ */ new Set();
    if (process.env.EXPO_PUBLIC_DOMAIN) {
      origins.add(getPublicBaseUrl());
    }
    if (process.env.ALLOWED_ORIGINS) {
      process.env.ALLOWED_ORIGINS.split(",").forEach((origin2) => {
        origins.add(origin2.trim());
      });
    }
    const origin = req.header("origin");
    const isLocalhost = origin?.startsWith("http://localhost:") || origin?.startsWith("http://127.0.0.1:");
    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.header("Access-Control-Allow-Headers", "Content-Type");
      res.header("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(express.urlencoded({ extended: false }));
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    const path2 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      if (!path2.startsWith("/api")) return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    });
    next();
  });
}
function getAppName() {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}
function serveExpoManifest(platform, res) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );
  if (!fs.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}
function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;
  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);
  const html = landingPageTemplate.replace(/BASE_URL_PLACEHOLDER/g, baseUrl).replace(/EXPS_URL_PLACEHOLDER/g, expsUrl).replace(/APP_NAME_PLACEHOLDER/g, appName);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
function configureExpoAndLanding(app2) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );
  const privacyPath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "privacy-policy.html"
  );
  const supportPath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "support.html"
  );
  const docsPath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "tech-docs.html"
  );
  const proposalPath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "proposal.html"
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const privacyPageTemplate = fs.readFileSync(privacyPath, "utf-8");
  const supportPageTemplate = fs.readFileSync(supportPath, "utf-8");
  const docsPageTemplate = fs.readFileSync(docsPath, "utf-8");
  const proposalPageTemplate = fs.readFileSync(proposalPath, "utf-8");
  const appName = getAppName();
  log("Serving static Expo files with dynamic manifest routing");
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    if (req.path !== "/" && req.path !== "/manifest" && req.path !== "/privacy" && req.path !== "/support" && req.path !== "/docs" && req.path !== "/proposal") {
      return next();
    }
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }
    if (req.path === "/privacy") {
      res.setHeader("Content-Type", "text/html");
      return res.status(200).send(privacyPageTemplate);
    }
    if (req.path === "/support") {
      res.setHeader("Content-Type", "text/html");
      return res.status(200).send(supportPageTemplate);
    }
    if (req.path === "/docs") {
      res.setHeader("Content-Type", "text/html");
      return res.status(200).send(docsPageTemplate);
    }
    if (req.path === "/proposal") {
      res.setHeader("Content-Type", "text/html");
      return res.status(200).send(proposalPageTemplate);
    }
    if (req.path === "/") {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName
      });
    }
    next();
  });
  app2.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app2.use(express.static(path.resolve(process.cwd(), "static-build")));
  log("Expo routing: Checking expo-platform header on / and /manifest");
}
function setupErrorHandler(app2) {
  app2.use((err, _req, res, next) => {
    const error = err;
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(status).json({ message });
  });
}
(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);
  const server = await registerRoutes(app);
  configureExpoAndLanding(app);
  setupErrorHandler(app);
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(port, "0.0.0.0", () => {
    log(`express server serving on port ${port}`);
  });
})();
