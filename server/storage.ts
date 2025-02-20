import { db } from "./db";
import { eq } from "drizzle-orm";
import { projects, rooms, finishes, finishHistory } from "@shared/schema";
import type { Project, InsertProject, Room, InsertRoom, Finish, InsertFinish, FinishHistory, InsertFinishHistory } from "@shared/schema";

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
  updateFinish(id: string, finish: Partial<InsertFinish>, userId: string): Promise<Finish>;

  // Finish History operations
  getFinishHistory(finishId: string): Promise<FinishHistory[]>;
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

  async updateFinish(id: string, finish: Partial<InsertFinish>, userId: string): Promise<Finish> {
    // Start a transaction
    return await db.transaction(async (tx) => {
      // Get the current finish
      const [currentFinish] = await tx
        .select()
        .from(finishes)
        .where(eq(finishes.id, id));

      if (!currentFinish) {
        throw new Error("Finish not found");
      }

      // Store the current state in history
      await tx.insert(finishHistory).values({
        finish_id: id,
        version: currentFinish.version,
        change_type: 'edit',
        previous_data: JSON.stringify(currentFinish),
        changed_by: userId,
      });

      // Update the finish with new version
      const [updatedFinish] = await tx
        .update(finishes)
        .set({
          ...finish,
          version: currentFinish.version + 1,
          updated_at: new Date(),
        })
        .where(eq(finishes.id, id))
        .returning();

      return updatedFinish;
    });
  }

  async getFinishHistory(finishId: string): Promise<FinishHistory[]> {
    return await db
      .select()
      .from(finishHistory)
      .where(eq(finishHistory.finish_id, finishId))
      .orderBy(finishHistory.version);
  }
}

export const storage = new DatabaseStorage();