import type { Express } from "express";
import { createServer, type Server } from "node:http";
import {
  getCryptoPrices,
  getStockPrices,
  getAllPrices,
  isCryptoSymbol,
} from "./services/priceService";
import {
  chat,
  generatePortfolioInsights,
  explainAsset,
  isGeminiConfigured,
  type ChatMessage,
  type PortfolioContext,
} from "./services/geminiService";
import {
  searchAssets,
  getPopularAssets,
} from "./services/assetSearchService";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/prices/crypto", async (req, res) => {
    try {
      const symbols = (req.query.symbols as string)?.split(",") || [];
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

  app.get("/api/prices/stocks", async (req, res) => {
    try {
      const symbols = (req.query.symbols as string)?.split(",") || [];
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

  app.post("/api/prices/batch", async (req, res) => {
    try {
      const { symbols } = req.body as { symbols: string[] };
      
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
        hasFinnhub: !!finnhubKey,
      });
    } catch (error) {
      console.error("Error in /api/prices/batch:", error);
      res.status(500).json({ error: "Failed to fetch prices" });
    }
  });

  app.get("/api/assets/search", async (req, res) => {
    try {
      const query = (req.query.q as string) || "";
      const type = req.query.type as string | undefined;
      
      const results = await searchAssets(query, type);
      res.json({ results, timestamp: Date.now() });
    } catch (error) {
      console.error("Error in /api/assets/search:", error);
      res.status(500).json({ error: "Failed to search assets" });
    }
  });

  app.get("/api/assets/popular/:type", (req, res) => {
    try {
      const { type } = req.params;
      const results = getPopularAssets(type);
      res.json({ results, timestamp: Date.now() });
    } catch (error) {
      console.error("Error in /api/assets/popular:", error);
      res.status(500).json({ error: "Failed to get popular assets" });
    }
  });

  app.get("/api/health", (_req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: Date.now(),
      services: {
        coingecko: true,
        finnhub: !!process.env.FINNHUB_API_KEY,
        gemini: !!process.env.GEMINI_API_KEY,
      }
    });
  });

  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message, history, portfolioContext } = req.body as {
        message: string;
        history?: ChatMessage[];
        portfolioContext?: PortfolioContext;
      };

      if (!message) {
        return res.status(400).json({ error: "message is required" });
      }

      if (!isGeminiConfigured()) {
        return res.json({
          response: "AI features are not available. Please configure your Gemini API key.",
          configured: false,
        });
      }

      const response = await chat(message, history || [], portfolioContext);
      res.json({ response, configured: true });
    } catch (error) {
      console.error("Error in /api/ai/chat:", error);
      res.status(500).json({ error: "Failed to generate response" });
    }
  });

  app.post("/api/ai/insights", async (req, res) => {
    try {
      const { portfolioContext } = req.body as { portfolioContext: PortfolioContext };

      if (!portfolioContext) {
        return res.status(400).json({ error: "portfolioContext is required" });
      }

      if (!isGeminiConfigured()) {
        return res.json({
          insights: "AI insights are not available. Please configure your Gemini API key.",
          configured: false,
        });
      }

      const insights = await generatePortfolioInsights(portfolioContext);
      res.json({ insights, configured: true });
    } catch (error) {
      console.error("Error in /api/ai/insights:", error);
      res.status(500).json({ error: "Failed to generate insights" });
    }
  });

  app.get("/api/ai/explain/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const { name, type } = req.query as { name?: string; type?: string };

      if (!isGeminiConfigured()) {
        return res.json({
          explanation: "AI explanations are not available. Please configure your Gemini API key.",
          configured: false,
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

  const httpServer = createServer(app);

  return httpServer;
}
