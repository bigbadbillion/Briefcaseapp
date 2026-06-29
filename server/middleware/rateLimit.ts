import rateLimit from "express-rate-limit";

const WINDOW_MS = 15 * 60 * 1000;

export const authLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again later." },
  handler: (_req, res, _next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});

export const apiLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
  handler: (_req, res, _next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});

export const aiChatLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "AI chat rate limit reached. Please try again later." },
  handler: (_req, res, _next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});
