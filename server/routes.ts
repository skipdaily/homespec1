import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { insertRoomSchema, insertFinishSchema, insertProjectSchema, insertItemSchema } from "@shared/schema";
import { ZodError } from "zod";
import { nanoid } from "nanoid";

// Excel dates start from 1900-01-01
const EXCEL_EPOCH = new Date(1900, 0, 1);

function convertExcelDateToISO(excelDate: number | string): string | null {
  if (!excelDate) return null;

  const numericDate = Number(excelDate);
  if (isNaN(numericDate)) return null;

  // Excel dates are number of days since 1900-01-01
  const date = new Date(EXCEL_EPOCH);
  date.setDate(date.getDate() + numericDate - 2); // Subtract 2 to account for Excel's date system quirks

  // Return in YYYY-MM-DD format
  return date.toISOString().split('T')[0];
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Project routes
  app.get("/api/projects", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId || typeof userId !== "string") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const projects = await storage.getProjectsByUserId(userId);
    res.json(projects);
  });

  app.get("/api/projects/:accessCode", async (req, res) => {
    const project = await storage.getProjectByAccessCode(req.params.accessCode);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.json(project);
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const projectData = insertProjectSchema.parse({
        ...req.body,
        access_code: nanoid(10) // Generate a unique access code
      });
      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid project data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create project" });
      }
    }
  });

  // Room routes
  app.get("/api/projects/:projectId/rooms", async (req, res) => {
    const rooms = await storage.getRoomsByProjectId(req.params.projectId);
    res.json(rooms);
  });

  app.post("/api/projects/:projectId/rooms", async (req, res) => {
    try {
      const roomData = insertRoomSchema.parse({
        ...req.body,
        project_id: req.params.projectId
      });
      const room = await storage.createRoom(roomData);
      res.status(201).json(room);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid room data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create room" });
      }
    }
  });

  // Item routes
  app.get("/api/rooms/:roomId/items", async (req, res) => {
    const items = await storage.getItemsByRoomId(req.params.roomId);
    res.json(items);
  });

  app.post("/api/rooms/:roomId/items", async (req, res) => {
    try {
      // Convert Excel date to ISO format before validation
      const { installation_date, ...restData } = req.body;
      const convertedDate = convertExcelDateToISO(installation_date);

      const itemData = insertItemSchema.parse({
        ...restData,
        installation_date: convertedDate,
        room_id: req.params.roomId
      });

      const item = await storage.createItem(itemData);
      res.status(201).json(item);
    } catch (error) {
      console.error('Error creating item:', error);
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid item data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create item" });
      }
    }
  });

  // Finish routes
  app.get("/api/projects/:projectId/finishes", async (req, res) => {
    const finishes = await storage.getFinishesByProjectId(req.params.projectId);
    res.json(finishes);
  });

  app.get("/api/rooms/:roomId/finishes", async (req, res) => {
    const finishes = await storage.getFinishesByRoomId(req.params.roomId);
    res.json(finishes);
  });

  app.post("/api/projects/:projectId/finishes", async (req, res) => {
    try {
      const finishData = insertFinishSchema.parse({
        ...req.body,
        project_id: req.params.projectId,
      });
      const finish = await storage.createFinish(finishData);
      res.status(201).json(finish);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid finish data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create finish" });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}