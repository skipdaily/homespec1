import { db } from "./db";
import { eq } from "drizzle-orm";
import { projects, rooms, items } from "@shared/schema";
import type { Project, InsertProject, Room, InsertRoom, Item, InsertItem } from "@shared/schema";

export interface IStorage {
  // Project operations
  getProject(id: string): Promise<Project | undefined>;
  getProjectsByUserId(userId: string): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;

  // Room operations
  getRoom(id: string): Promise<Room | undefined>;
  getRoomsByProjectId(projectId: string): Promise<Room[]>;
  createRoom(room: InsertRoom): Promise<Room>;

  // Item operations
  getItem(id: string): Promise<Item | undefined>;
  getItemsByRoomId(roomId: string): Promise<Item[]>;
  createItem(item: InsertItem): Promise<Item>;
}

export class DatabaseStorage implements IStorage {
  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getProjectsByUserId(userId: string): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.user_id, userId));
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [created] = await db.insert(projects).values(project).returning();
    return created;
  }

  async getRoom(id: string): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));
    return room;
  }

  async getRoomsByProjectId(projectId: string): Promise<Room[]> {
    return await db.select().from(rooms).where(eq(rooms.project_id, projectId));
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    const [created] = await db.insert(rooms).values(room).returning();
    return created;
  }

  async getItem(id: string): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.id, id));
    return item;
  }

  async getItemsByRoomId(roomId: string): Promise<Item[]> {
    return await db.select().from(items).where(eq(items.room_id, roomId));
  }

  async createItem(item: InsertItem): Promise<Item> {
    const [created] = await db.insert(items).values(item).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();