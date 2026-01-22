import bcrypt from "bcryptjs";
import crypto from "crypto";
import { storage } from "../storage";
import type { User } from "@shared/schema";
import { sendVerificationEmail, sendWelcomeEmail, isEmailConfigured } from "./emailService";

const SALT_ROUNDS = 12;
const SESSION_DURATION_DAYS = 30;
const VERIFICATION_TOKEN_DURATION_HOURS = 24;
const APPLE_TEAM_ID = "439GU2NXZH";

export interface AuthResult {
  success: boolean;
  user?: Omit<User, 'password' | 'verificationToken'>;
  token?: string;
  error?: string;
  verificationRequired?: boolean;
  verificationToken?: string;
  emailSent?: boolean;
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

    // Send real verification email
    const emailResult = await sendVerificationEmail(
      email,
      name || email.split('@')[0],
      verificationToken
    );

    if (!emailResult.success) {
      console.warn('Failed to send verification email:', emailResult.error);
    }

    return {
      success: true,
      user: sanitizeUser(user),
      verificationRequired: true,
      // Only return token if email failed (fallback for testing)
      verificationToken: emailResult.success ? undefined : verificationToken,
      emailSent: emailResult.success,
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
    
    // Send welcome email
    if (updatedUser) {
      sendWelcomeEmail(updatedUser.email, updatedUser.name || '').catch(console.error);
    }
    
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

    // Send verification email
    const emailResult = await sendVerificationEmail(
      user.email,
      user.name || '',
      verificationToken
    );

    return {
      success: true,
      emailSent: emailResult.success,
      verificationToken: emailResult.success ? undefined : verificationToken,
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

// Apple Sign-In authentication
export async function authenticateWithApple(
  identityToken: string,
  email: string | null,
  fullName: { givenName?: string; familyName?: string } | null,
  user: string // Apple user identifier
): Promise<AuthResult> {
  try {
    // Verify the Apple identity token
    const verificationResult = await verifyAppleToken(identityToken);
    if (!verificationResult.valid) {
      return { success: false, error: "Invalid Apple authentication" };
    }

    // Check if user already exists with this Apple ID
    let existingUser = await storage.getUserByAppleId(user);
    
    if (!existingUser && email) {
      // Check if there's a user with this email (might want to link accounts)
      existingUser = await storage.getUserByEmail(email);
      if (existingUser && !existingUser.appleId) {
        // Link the Apple ID to the existing account
        await storage.updateUser(existingUser.id, { appleId: user });
      }
    }

    if (existingUser) {
      // Existing user - create session
      const sessionToken = generateToken();
      const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);
      await storage.createSession(existingUser.id, sessionToken, expiresAt);

      return {
        success: true,
        user: sanitizeUser(existingUser),
        token: sessionToken,
      };
    }

    // New user - create account
    const name = fullName 
      ? [fullName.givenName, fullName.familyName].filter(Boolean).join(' ')
      : email?.split('@')[0] || 'Apple User';

    const newUser = await storage.createUser({
      email: email || `${user}@privaterelay.appleid.com`,
      password: await bcrypt.hash(generateToken(), SALT_ROUNDS), // Random password for Apple users
      name,
      appleId: user,
      emailVerified: true, // Apple accounts are pre-verified
    });

    const sessionToken = generateToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);
    await storage.createSession(newUser.id, sessionToken, expiresAt);

    // Send welcome email if we have a real email
    if (email && !email.includes('privaterelay')) {
      sendWelcomeEmail(email, name).catch(console.error);
    }

    return {
      success: true,
      user: sanitizeUser(newUser),
      token: sessionToken,
    };
  } catch (error) {
    console.error("Apple authentication error:", error);
    return { success: false, error: "Apple authentication failed" };
  }
}

async function verifyAppleToken(identityToken: string): Promise<{ valid: boolean; payload?: any }> {
  try {
    // Decode the JWT without verification first to get the key ID
    const [headerB64] = identityToken.split('.');
    const header = JSON.parse(Buffer.from(headerB64, 'base64').toString());
    
    // Fetch Apple's public keys
    const keysResponse = await fetch('https://appleid.apple.com/auth/keys');
    const keysData = await keysResponse.json() as { keys: any[] };
    
    // Find the matching key
    const key = keysData.keys.find((k: any) => k.kid === header.kid);
    if (!key) {
      console.error('Apple key not found for kid:', header.kid);
      return { valid: false };
    }

    // Import the key and verify the token
    const { createPublicKey } = await import('crypto');
    const { jwtVerify, importJWK } = await import('jose');
    
    const publicKey = await importJWK(key, 'RS256');
    
    const { payload } = await jwtVerify(identityToken, publicKey, {
      issuer: 'https://appleid.apple.com',
      audience: `com.briefcase.app`, // Your bundle identifier
    });

    return { valid: true, payload };
  } catch (error) {
    console.error('Apple token verification error:', error);
    return { valid: false };
  }
}
