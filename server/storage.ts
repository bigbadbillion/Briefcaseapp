import { 
  users, 
  sessions, 
  holdings, 
  userSettings,
  type User, 
  type InsertUser,
  type Session,
  type Holding,
  type UserSettings,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gt } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser & { verificationToken?: string; verificationExpires?: Date }): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  
  createSession(userId: string, token: string, expiresAt: Date): Promise<Session>;
  getSessionByToken(token: string): Promise<Session | undefined>;
  deleteSession(token: string): Promise<void>;
  deleteUserSessions(userId: string): Promise<void>;
  
  getHoldingsByUser(userId: string): Promise<Holding[]>;
  createHolding(userId: string, holding: Omit<Holding, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Holding>;
  updateHolding(id: string, userId: string, data: Partial<Holding>): Promise<Holding | undefined>;
  deleteHolding(id: string, userId: string): Promise<boolean>;
  
  getUserSettings(userId: string): Promise<UserSettings | undefined>;
  upsertUserSettings(userId: string, settings: Partial<UserSettings>): Promise<UserSettings>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser & { verificationToken?: string; verificationExpires?: Date }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        email: insertUser.email.toLowerCase(),
      })
      .returning();
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async createSession(userId: string, token: string, expiresAt: Date): Promise<Session> {
    const [session] = await db
      .insert(sessions)
      .values({ userId, token, expiresAt })
      .returning();
    return session;
  }

  async getSessionByToken(token: string): Promise<Session | undefined> {
    const [session] = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())));
    return session || undefined;
  }

  async deleteSession(token: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.token, token));
  }

  async deleteUserSessions(userId: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.userId, userId));
  }

  async getHoldingsByUser(userId: string): Promise<Holding[]> {
    return db.select().from(holdings).where(eq(holdings.userId, userId));
  }

  async createHolding(userId: string, holding: Omit<Holding, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Holding> {
    const [newHolding] = await db
      .insert(holdings)
      .values({ ...holding, userId })
      .returning();
    return newHolding;
  }

  async updateHolding(id: string, userId: string, data: Partial<Holding>): Promise<Holding | undefined> {
    const [holding] = await db
      .update(holdings)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(holdings.id, id), eq(holdings.userId, userId)))
      .returning();
    return holding || undefined;
  }

  async deleteHolding(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(holdings)
      .where(and(eq(holdings.id, id), eq(holdings.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async getUserSettings(userId: string): Promise<UserSettings | undefined> {
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId));
    return settings || undefined;
  }

  async upsertUserSettings(userId: string, settings: Partial<UserSettings>): Promise<UserSettings> {
    const existing = await this.getUserSettings(userId);
    
    if (existing) {
      const [updated] = await db
        .update(userSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(userSettings.userId, userId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(userSettings)
        .values({ 
          userId, 
          currency: settings.currency || 'USD',
          notificationsEnabled: settings.notificationsEnabled ?? true,
        })
        .returning();
      return created;
    }
  }
}

export const storage = new DatabaseStorage();
