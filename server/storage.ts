import { db } from "./db";
import { eq } from "drizzle-orm";
import { projects, rooms, finishes } from "@shared/schema";
import type { Project, InsertProject, Room, InsertRoom, Finish, InsertFinish } from "@shared/schema";

export interface IStorage {
  // Project operations
  getProject(id: string): Promise<Project | undefined>;
  getProjectsByUserId(userId: string): Promise<Project[]>;
  getProjectByAccessCode(accessCode: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;

  // Room operations
  getRoom(id: string): Promise<Room | undefined>;
  getRoomsByProjectId(projectId: string): Promise<Room[]>;
  createRoom(room: InsertRoom): Promise<Room>;

  // Finish operations
  getFinish(id: string): Promise<Finish | undefined>;
  getFinishesByProjectId(projectId: string): Promise<Finish[]>;
  getFinishesByRoomId(roomId: string): Promise<Finish[]>;
  createFinish(finish: InsertFinish): Promise<Finish>;
}

export class DatabaseStorage implements IStorage {
  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getProjectsByUserId(userId: string): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.user_id, userId));
  }

  async getProjectByAccessCode(accessCode: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.access_code, accessCode));
    return project;
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

  async getFinish(id: string): Promise<Finish | undefined> {
    const [finish] = await db.select().from(finishes).where(eq(finishes.id, id));
    return finish;
  }

  async getFinishesByProjectId(projectId: string): Promise<Finish[]> {
    return await db.select().from(finishes).where(eq(finishes.project_id, projectId));
  }

  async getFinishesByRoomId(roomId: string): Promise<Finish[]> {
    return await db.select().from(finishes).where(eq(finishes.room_id, roomId));
  }

  async createFinish(finish: InsertFinish): Promise<Finish> {
    const [created] = await db.insert(finishes).values(finish).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();