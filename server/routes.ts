import type { Express, Request, Response, NextFunction } from "express";
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
} from "./services/geminiService";
import {
  searchAssets,
  getPopularAssets,
} from "./services/assetSearchService";
import {
  register,
  login,
  verifyEmail,
  resendVerification,
  requestPasswordReset,
  resetPassword,
  validateSession,
  logout,
  getUserFromToken,
  authenticateWithApple,
} from "./services/authService";
import { storage } from "./storage";
import { authLimiter, aiChatLimiter } from "./middleware/rateLimit";
import { premiumMiddleware } from "./middleware/premium";
import { syncUserPremiumFromRevenueCat } from "./services/subscriptionService";
import { verifyWebhookAuthorization } from "./services/revenueCatService";
import {
  registerSchema,
  loginSchema,
  holdingSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@shared/schema";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string | null;
    isPremium: boolean;
  };
}

async function authMiddleware(
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
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
    isPremium: user.isPremium,
  };
  
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/auth/register", authLimiter, async (req, res) => {
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
        verificationToken: result.verificationToken,
      });
    } catch (error) {
      console.error("Error in /api/auth/register:", error);
      res.status(500).json({ error: "Failed to create account" });
    }
  });

  app.post("/api/auth/login", authLimiter, async (req, res) => {
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
          verificationRequired: result.verificationRequired,
        });
      }

      res.json({
        success: true,
        user: result.user,
        token: result.token,
      });
    } catch (error) {
      console.error("Error in /api/auth/login:", error);
      res.status(500).json({ error: "Failed to log in" });
    }
  });

  app.post("/api/auth/apple", authLimiter, async (req, res) => {
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
        token: result.token,
      });
    } catch (error) {
      console.error("Error in /api/auth/apple:", error);
      res.status(500).json({ error: "Apple authentication failed" });
    }
  });

  app.get("/api/auth/verify/:token", async (req, res) => {
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
        token: result.token,
      });
    } catch (error) {
      console.error("Error in /api/auth/verify:", error);
      res.status(500).json({ error: "Failed to verify email" });
    }
  });

  app.post("/api/auth/resend-verification", authLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const result = await resendVerification(email);
      
      res.json({
        success: true,
        message: "If an account exists with this email, a verification link has been sent.",
        verificationToken: result.verificationToken,
      });
    } catch (error) {
      console.error("Error in /api/auth/resend-verification:", error);
      res.status(500).json({ error: "Failed to resend verification" });
    }
  });

  app.post("/api/auth/forgot-password", authLimiter, async (req, res) => {
    try {
      const parsed = forgotPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: parsed.error.errors[0]?.message || "Invalid input",
        });
      }

      await requestPasswordReset(parsed.data.email);

      // Generic response regardless of whether the email exists.
      res.json({
        success: true,
        message:
          "If an account exists with this email, a password reset code has been sent.",
      });
    } catch (error) {
      console.error("Error in /api/auth/forgot-password:", error);
      res.status(500).json({ error: "Failed to process password reset" });
    }
  });

  app.post("/api/auth/reset-password", authLimiter, async (req, res) => {
    try {
      const parsed = resetPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: parsed.error.errors[0]?.message || "Invalid input",
        });
      }

      const { email, code, newPassword } = parsed.data;
      const result = await resetPassword(email, code, newPassword);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({
        success: true,
        message: "Password reset successfully. Please sign in with your new password.",
      });
    } catch (error) {
      console.error("Error in /api/auth/reset-password:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  app.get("/api/auth/me", async (req: AuthenticatedRequest, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const token = authHeader.substring(7);
      const result = await validateSession(token);

      if (!result.success) {
        return res.status(401).json({ error: result.error });
      }

      res.json({
        success: true,
        user: result.user,
      });
    } catch (error) {
      console.error("Error in /api/auth/me:", error);
      res.status(500).json({ error: "Failed to get user info" });
    }
  });

  app.put("/api/auth/profile", authMiddleware as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { name } = req.body;
      
      if (!name || typeof name !== 'string' || name.trim().length < 1) {
        return res.status(400).json({ error: "Name is required" });
      }

      const updatedUser = await storage.updateUser(req.user!.id, { name: name.trim() });
      
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        success: true,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          isPremium: updatedUser.isPremium,
        },
      });
    } catch (error) {
      console.error("Error in /api/auth/profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        await logout(token);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error in /api/auth/logout:", error);
      res.status(500).json({ error: "Failed to log out" });
    }
  });

  app.delete("/api/auth/delete-account", authMiddleware as any, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      
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

  app.get("/api/holdings", authMiddleware as any, async (req: AuthenticatedRequest, res) => {
    try {
      const holdings = await storage.getHoldingsByUser(req.user!.id);
      res.json({ holdings });
    } catch (error) {
      console.error("Error in GET /api/holdings:", error);
      res.status(500).json({ error: "Failed to get holdings" });
    }
  });

  app.post("/api/holdings", authMiddleware as any, async (req: AuthenticatedRequest, res) => {
    try {
      const parsed = holdingSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          error: parsed.error.errors[0]?.message || "Invalid input" 
        });
      }

      const holding = await storage.createHolding(req.user!.id, {
        ...parsed.data,
        quantity: parsed.data.quantity.toString(),
        purchasePrice: parsed.data.purchasePrice.toString(),
        purchaseDate: parsed.data.purchaseDate ? new Date(parsed.data.purchaseDate) : null,
        notes: parsed.data.notes || null,
      });

      res.json({ success: true, holding });
    } catch (error) {
      console.error("Error in POST /api/holdings:", error);
      res.status(500).json({ error: "Failed to create holding" });
    }
  });

  app.put("/api/holdings/:id", authMiddleware as any, async (req: AuthenticatedRequest, res) => {
    try {
      const id = req.params.id as string;
      const parsed = holdingSchema.partial().safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ 
          error: parsed.error.errors[0]?.message || "Invalid input" 
        });
      }

      const updateData: any = { ...parsed.data };
      if (parsed.data.quantity !== undefined) {
        updateData.quantity = parsed.data.quantity.toString();
      }
      if (parsed.data.purchasePrice !== undefined) {
        updateData.purchasePrice = parsed.data.purchasePrice.toString();
      }
      if (parsed.data.purchaseDate !== undefined) {
        updateData.purchaseDate = parsed.data.purchaseDate ? new Date(parsed.data.purchaseDate) : null;
      }

      const holding = await storage.updateHolding(id, req.user!.id, updateData);

      if (!holding) {
        return res.status(404).json({ error: "Holding not found" });
      }

      res.json({ success: true, holding });
    } catch (error) {
      console.error("Error in PUT /api/holdings:", error);
      res.status(500).json({ error: "Failed to update holding" });
    }
  });

  app.delete("/api/holdings", authMiddleware as any, async (req: AuthenticatedRequest, res) => {
    try {
      await storage.deleteAllHoldings(req.user!.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error in DELETE /api/holdings (all):", error);
      res.status(500).json({ error: "Failed to clear all holdings" });
    }
  });

  app.delete("/api/holdings/:id", authMiddleware as any, async (req: AuthenticatedRequest, res) => {
    try {
      const id = req.params.id as string;
      const deleted = await storage.deleteHolding(id, req.user!.id);

      if (!deleted) {
        return res.status(404).json({ error: "Holding not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error in DELETE /api/holdings:", error);
      res.status(500).json({ error: "Failed to delete holding" });
    }
  });

  app.get("/api/settings", authMiddleware as any, async (req: AuthenticatedRequest, res) => {
    try {
      const settings = await storage.getUserSettings(req.user!.id);
      res.json({ 
        settings: settings || { 
          currency: 'USD', 
          notificationsEnabled: true 
        } 
      });
    } catch (error) {
      console.error("Error in GET /api/settings:", error);
      res.status(500).json({ error: "Failed to get settings" });
    }
  });

  app.put("/api/settings", authMiddleware as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { currency, notificationsEnabled } = req.body;
      const settings = await storage.upsertUserSettings(req.user!.id, {
        currency,
        notificationsEnabled,
      });

      res.json({ success: true, settings });
    } catch (error) {
      console.error("Error in PUT /api/settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

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
        revenuecat: !!process.env.REVENUECAT_SECRET_API_KEY,
        tavily: !!process.env.TAVILY_API_KEY,
      }
    });
  });

  app.post(
    "/api/webhooks/revenuecat",
    async (req, res) => {
      try {
        if (!process.env.REVENUECAT_WEBHOOK_AUTHORIZATION) {
          console.error(
            "[RevenueCat webhook] REVENUECAT_WEBHOOK_AUTHORIZATION not configured"
          );
          return res.status(503).json({ error: "Webhook not configured" });
        }

        const authHeader = req.headers.authorization;
        if (!verifyWebhookAuthorization(authHeader)) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const event = req.body?.event;
        const appUserId = event?.app_user_id as string | undefined;

        if (!appUserId) {
          return res.status(400).json({ error: "Missing app_user_id" });
        }

        const result = await syncUserPremiumFromRevenueCat(appUserId, {
          allowDowngrade: true,
        });

        console.info(
          JSON.stringify({
            event: "revenuecat_webhook",
            type: event?.type,
            appUserId,
            isPremium: result.isPremium,
            updated: result.updated,
            notFound: result.notFound,
          })
        );

        res.json({ received: true, ...result });
      } catch (error) {
        console.error("Error in /api/webhooks/revenuecat:", error);
        res.status(500).json({ error: "Webhook processing failed" });
      }
    }
  );

  app.post(
    "/api/subscription/sync",
    authMiddleware as any,
    async (req: AuthenticatedRequest, res) => {
      try {
        const result = await syncUserPremiumFromRevenueCat(req.user!.id);

        if (result.notFound) {
          return res.status(404).json({ error: "User not found" });
        }

        const user = await storage.getUser(req.user!.id);

        res.json({
          success: true,
          isPremium: result.isPremium,
          updated: result.updated,
          skipped: result.skipped ?? false,
          user: user
            ? {
                id: user.id,
                email: user.email,
                name: user.name,
                emailVerified: user.emailVerified,
                isPremium: user.isPremium,
              }
            : undefined,
        });
      } catch (error) {
        console.error("Error in /api/subscription/sync:", error);
        res.status(500).json({ error: "Failed to sync subscription status" });
      }
    }
  );

  app.post("/api/ai/chat", authMiddleware as any, premiumMiddleware, aiChatLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      const { message, history } = req.body as {
        message: string;
        history?: ChatMessage[];
      };

      if (!message) {
        return res.status(400).json({ error: "message is required" });
      }

      if (!isGeminiConfigured()) {
        return res.json({
          response: "AI features are not available. Please configure your Gemini API key.",
          sources: [],
          warnings: [],
          configured: false,
        });
      }

      const result = await chat(message, history || [], req.user!.id);
      res.json({
        response: result.text,
        sources: result.sources,
        warnings: result.warnings,
        toolSteps: result.toolSteps,
        configured: result.configured,
      });
    } catch (error) {
      console.error("Error in /api/ai/chat:", error);
      res.status(500).json({ error: "Failed to generate response" });
    }
  });

  app.post("/api/ai/insights", authMiddleware as any, premiumMiddleware, aiChatLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      if (!isGeminiConfigured()) {
        return res.json({
          insights: "AI insights are not available. Please configure your Gemini API key.",
          sources: [],
          warnings: [],
          configured: false,
        });
      }

      const result = await generatePortfolioInsights(req.user!.id);
      res.json({
        insights: result.text,
        sources: result.sources,
        warnings: result.warnings,
        configured: result.configured,
      });
    } catch (error) {
      console.error("Error in /api/ai/insights:", error);
      res.status(500).json({ error: "Failed to generate insights" });
    }
  });

  app.get("/api/ai/explain/:symbol", authMiddleware as any, premiumMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { symbol: symbolParam } = req.params;
      const symbol = Array.isArray(symbolParam) ? symbolParam[0] : symbolParam;
      const { name, type } = req.query as { name?: string; type?: string };

      if (!isGeminiConfigured()) {
        return res.json({
          explanation: "AI explanations are not available. Please configure your Gemini API key.",
          sources: [],
          warnings: [],
          configured: false,
        });
      }

      const result = await explainAsset(
        symbol,
        name || symbol,
        type || "investment",
        req.user!.id
      );
      res.json({
        explanation: result.text,
        sources: result.sources,
        warnings: result.warnings,
        configured: result.configured,
      });
    } catch (error) {
      console.error("Error in /api/ai/explain:", error);
      res.status(500).json({ error: "Failed to generate explanation" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
