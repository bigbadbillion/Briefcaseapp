import type { Request, Response, NextFunction } from "express";

interface PremiumRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string | null;
    isPremium: boolean;
  };
}

export function premiumMiddleware(
  req: PremiumRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user?.isPremium) {
    res.status(403).json({
      error: "Premium subscription required for AI features.",
    });
    return;
  }
  next();
}
