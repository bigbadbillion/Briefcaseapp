import type { Express } from "express";
import { createServer, type Server } from "node:http";
import {
  getCryptoPrices,
  getStockPrices,
  getAllPrices,
  isCryptoSymbol,
} from "./services/priceService";

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
      const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
      
      if (symbols.length === 0) {
        return res.status(400).json({ error: "symbols query parameter required" });
      }
      
      if (!apiKey) {
        return res.json({ 
          prices: [], 
          timestamp: Date.now(),
          message: "Alpha Vantage API key not configured" 
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
      
      const alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY;
      const prices = await getAllPrices(cryptoSymbols, stockSymbols, alphaVantageKey);
      
      res.json({ 
        prices, 
        timestamp: Date.now(),
        hasAlphaVantage: !!alphaVantageKey,
      });
    } catch (error) {
      console.error("Error in /api/prices/batch:", error);
      res.status(500).json({ error: "Failed to fetch prices" });
    }
  });

  app.get("/api/health", (_req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: Date.now(),
      services: {
        coingecko: true,
        alphavantage: !!process.env.ALPHA_VANTAGE_API_KEY,
        gemini: !!process.env.GEMINI_API_KEY,
      }
    });
  });

  const httpServer = createServer(app);

  return httpServer;
}
