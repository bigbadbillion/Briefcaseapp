import bcrypt from "bcryptjs";
import crypto from "crypto";
import { storage } from "../storage";
import type { User } from "@shared/schema";

const SALT_ROUNDS = 12;
const SESSION_DURATION_DAYS = 30;
const VERIFICATION_TOKEN_DURATION_HOURS = 24;

export interface AuthResult {
  success: boolean;
  user?: Omit<User, 'password' | 'verificationToken'>;
  token?: string;
  error?: string;
  verificationRequired?: boolean;
  verificationToken?: string;
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function sanitizeUser(user: User): Omit<User, 'password' | 'verificationToken'> {
  const { password, verificationToken, ...sanitized } = user;
  return sanitized;
}

export async function register(
  email: string, 
  password: string, 
  name?: string
): Promise<AuthResult> {
  try {
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return { success: false, error: "An account with this email already exists" };
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const verificationToken = generateToken();
    const verificationExpires = new Date(
      Date.now() + VERIFICATION_TOKEN_DURATION_HOURS * 60 * 60 * 1000
    );

    const user = await storage.createUser({
      email,
      password: hashedPassword,
      name: name || email.split('@')[0],
      verificationToken,
      verificationExpires,
    });

    return {
      success: true,
      user: sanitizeUser(user),
      verificationRequired: true,
      verificationToken,
    };
  } catch (error) {
    console.error("Registration error:", error);
    return { success: false, error: "Failed to create account" };
  }
}

export async function login(email: string, password: string): Promise<AuthResult> {
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
        verificationRequired: true,
      };
    }

    const sessionToken = generateToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

    await storage.createSession(user.id, sessionToken, expiresAt);

    return {
      success: true,
      user: sanitizeUser(user),
      token: sessionToken,
    };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: "Failed to log in" };
  }
}

export async function verifyEmail(token: string): Promise<AuthResult> {
  try {
    const users = await storage.getUserByEmail('');
    
    const result = await import("../db").then(async ({ db }) => {
      const { users } = await import("@shared/schema");
      const { eq, and, gt } = await import("drizzle-orm");
      
      const [user] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.verificationToken, token),
            gt(users.verificationExpires, new Date())
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
      verificationExpires: null,
    });

    const sessionToken = generateToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);
    await storage.createSession(result.id, sessionToken, expiresAt);

    const updatedUser = await storage.getUser(result.id);
    
    return {
      success: true,
      user: updatedUser ? sanitizeUser(updatedUser) : undefined,
      token: sessionToken,
    };
  } catch (error) {
    console.error("Email verification error:", error);
    return { success: false, error: "Failed to verify email" };
  }
}

export async function resendVerification(email: string): Promise<AuthResult> {
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
      Date.now() + VERIFICATION_TOKEN_DURATION_HOURS * 60 * 60 * 1000
    );

    await storage.updateUser(user.id, {
      verificationToken,
      verificationExpires,
    });

    return {
      success: true,
      verificationToken,
    };
  } catch (error) {
    console.error("Resend verification error:", error);
    return { success: false, error: "Failed to resend verification" };
  }
}

export async function validateSession(token: string): Promise<AuthResult> {
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
      token,
    };
  } catch (error) {
    console.error("Session validation error:", error);
    return { success: false, error: "Failed to validate session" };
  }
}

export async function logout(token: string): Promise<{ success: boolean }> {
  try {
    await storage.deleteSession(token);
    return { success: true };
  } catch (error) {
    console.error("Logout error:", error);
    return { success: false };
  }
}

export async function getUserFromToken(token: string): Promise<User | null> {
  try {
    const session = await storage.getSessionByToken(token);
    if (!session) return null;

    const user = await storage.getUser(session.userId);
    return user || null;
  } catch {
    return null;
  }
}
