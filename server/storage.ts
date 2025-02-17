import { db } from "./db";
import { eq } from "drizzle-orm";
import { users, rooms, items } from "@shared/schema";
import type { Room, InsertRoom, Item, InsertItem } from "@shared/schema";
import type { User, InsertUser } from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Room operations
  getRoom(id: number): Promise<Room | undefined>;
  getRoomsByUserId(userId: string): Promise<Room[]>;
  createRoom(room: InsertRoom): Promise<Room>;

  // Item operations
  getItem(id: number): Promise<Item | undefined>;
  getItemsByRoomId(roomId: number): Promise<Item[]>;
  createItem(item: InsertItem): Promise<Item>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async getRoom(id: number): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));
    return room;
  }

  async getRoomsByUserId(userId: string): Promise<Room[]> {
    return await db.select().from(rooms).where(eq(rooms.user_id, userId));
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    const [created] = await db.insert(rooms).values(room).returning();
    return created;
  }

  async getItem(id: number): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.id, id));
    return item;
  }

  async getItemsByRoomId(roomId: number): Promise<Item[]> {
    return await db.select().from(items).where(eq(items.room_id, roomId));
  }

  async createItem(item: InsertItem): Promise<Item> {
    const [created] = await db.insert(items).values(item).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();