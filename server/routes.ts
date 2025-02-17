import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRoomSchema, insertItemSchema } from "@shared/schema";
import { ZodError } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Room routes
  app.get("/api/rooms", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId || typeof userId !== "string") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const rooms = await storage.getRoomsByUserId(userId);
    res.json(rooms);
  });

  app.post("/api/rooms", async (req, res) => {
    try {
      const roomData = insertRoomSchema.parse(req.body);
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
    const roomId = parseInt(req.params.roomId);
    if (isNaN(roomId)) {
      return res.status(400).json({ message: "Invalid room ID" });
    }

    const items = await storage.getItemsByRoomId(roomId);
    res.json(items);
  });

  app.post("/api/rooms/:roomId/items", async (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      if (isNaN(roomId)) {
        return res.status(400).json({ message: "Invalid room ID" });
      }

      const itemData = insertItemSchema.parse({ ...req.body, room_id: roomId });
      const item = await storage.createItem(itemData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid item data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create item" });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}