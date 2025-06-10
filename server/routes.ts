import type { Express } from "express";
import { createServer, type Server } from "http";
import { getStorage, storageMode } from "./storage";
import { db, connectionState } from "./db";
import { insertRoomSchema, insertFinishSchema, insertProjectSchema, insertItemSchema, insertConversationSchema, insertMessageSchema, insertChatSettingsSchema } from "@shared/schema";
import { ZodError } from "zod";
import { nanoid } from "nanoid";
import { ChatService } from "./chat-service";

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
  // Ensure storage is initialized
  const storage = await getStorage();
  
  // Add a debug route for checking server and database status
  app.get("/api/debug/status", async (req, res) => {
    try {
      const dbTestResult = await testDatabaseConnection();
      
      res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "unknown",
        storageMode,
        database: {
          connected: dbTestResult,
          connectionState
        },
        version: process.env.npm_package_version || "unknown"
      });
    } catch (error) {
      res.status(500).json({
        status: "ERROR",
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    }
  });

  // Project routes
  app.get("/api/projects", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId || typeof userId !== "string") {
      console.warn("Missing or invalid x-user-id header", {
        headers: req.headers,
        path: req.path
      });
      return res.status(401).json({ 
        message: "Unauthorized", 
        details: "Missing or invalid user ID header",
        help: "Check that the X-User-ID header is being properly set"
      });
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
    const userId = req.headers["x-user-id"];
    if (!userId || typeof userId !== "string") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const requestData = {
        ...req.body,
        user_id: userId,
        access_code: nanoid(10) // Generate a unique access code
      };
      
      const projectData = insertProjectSchema.parse(requestData);
      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (error) {
      console.error("Project creation error:", error);
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

  // Chat routes
  
  // Get conversations for a project
  app.get("/api/projects/:projectId/conversations", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId || typeof userId !== "string") {
      console.warn("Missing or invalid x-user-id header", {
        headers: req.headers,
        path: req.path
      });
      return res.status(401).json({ 
        message: "Unauthorized", 
        details: "Missing or invalid user ID header",
        help: "Check that the X-User-ID header is being properly set"
      });
    }

    try {
      // Use unified storage for consistency
      const conversations = await storage.getConversationsByProjectId(
        req.params.projectId, 
        userId
      );
      
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ 
        message: "Failed to fetch conversations",
        error: String(error)
      });
    }
  });

  // Create a new conversation
  app.post("/api/projects/:projectId/conversations", async (req, res) => {
    const userId = req.headers["x-user-id"];
    console.log("Create conversation request:", {
      projectId: req.params.projectId,
      userId: userId,
      body: req.body,
      headers: {
        ...req.headers,
        authorization: req.headers.authorization ? "[REDACTED]" : undefined
      }
    });
    
    if (!userId || typeof userId !== "string") {
      console.warn("Missing or invalid x-user-id header in conversation creation", {
        headers: req.headers,
        path: req.path
      });
      return res.status(401).json({ 
        message: "Unauthorized", 
        details: "Missing or invalid user ID header",
        help: "Check that the X-User-ID header is being properly set"
      });
    }

    try {
      const conversationData = insertConversationSchema.parse({
        ...req.body,
        project_id: req.params.projectId,
        user_id: userId
      });
      
      try {
        // Use unified storage for consistency
        const conversation = await storage.createConversation(conversationData);
        
        console.log("Conversation created successfully:", conversation);
        res.status(201).json(conversation);
      } catch (storageError) {
        console.error('Storage error creating conversation:', storageError);
        
        // Provide more detailed error for storage failures
        res.status(500).json({ 
          message: "Failed to create conversation in storage", 
          error: String(storageError),
          storageMode: 'DATABASE'
        });
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid conversation data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create conversation", error: String(error) });
      }
    }
  });

  // Get messages for a conversation
  app.get("/api/conversations/:conversationId/messages", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId || typeof userId !== "string") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // Verify user owns this conversation
      const conversation = await storage.getConversation(req.params.conversationId);
      
      if (!conversation || conversation.user_id !== userId) {
        console.log(`Access denied for conversation ${req.params.conversationId}: conversation user ${conversation?.user_id} != request user ${userId}`);
        return res.status(403).json({ message: "Access denied" });
      }

      // Always use the unified storage for consistency
      const messages = await storage.getConversationMessages(req.params.conversationId);
      
      // Ensure we always return fresh data by setting proper cache headers
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      console.log(`[DEBUG] Found ${messages.length} messages for conversation ${req.params.conversationId}`);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Send a message (chat with AI)
  app.post("/api/conversations/:conversationId/messages", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId || typeof userId !== "string") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // Verify user owns this conversation
      const conversation = await storage.getConversation(req.params.conversationId);
      
      if (!conversation || conversation.user_id !== userId) {
        console.log(`Access denied for conversation ${req.params.conversationId}: conversation user ${conversation?.user_id} != request user ${userId}`);
        return res.status(403).json({ message: "Access denied" });
      }

      const { content } = req.body;
      if (!content || typeof content !== "string") {
        return res.status(400).json({ message: "Message content is required" });
      }

      // Process the message with AI
      const result = await ChatService.processMessage(
        req.params.conversationId,
        content,
        userId,
        conversation.project_id
      );

      res.json(result);
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to process message" });
    }
  });

  // Get chat settings for a project
  app.get("/api/projects/:projectId/chat-settings", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId || typeof userId !== "string") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const settings = await storage.getChatSettings(req.params.projectId, userId);
      if (!settings) {
        // Return default settings if none exist
        const defaultSettings = {
          provider: "openai",
          model: "gpt-4o-mini",
          temperature: 0.7,
          max_tokens: 1000,
          restrict_to_project_data: true,
          enable_web_search: false,
          max_conversation_length: 50
        };
        return res.json(defaultSettings);
      }
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat settings" });
    }
  });

  // Update chat settings for a project
  app.put("/api/projects/:projectId/chat-settings", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId || typeof userId !== "string") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const settingsData = insertChatSettingsSchema.parse({
        ...req.body,
        project_id: req.params.projectId,
        user_id: userId
      });

      // Validate the settings
      const isValid = await ChatService.validateChatSettings(settingsData);
      if (!isValid) {
        return res.status(400).json({ message: "Invalid chat settings or API key" });
      }

      // Check if settings exist
      const existingSettings = await storage.getChatSettings(req.params.projectId, userId);
      
      let settings;
      if (existingSettings) {
        settings = await storage.updateChatSettings(req.params.projectId, userId, settingsData);
      } else {
        settings = await storage.createChatSettings(settingsData);
      }

      res.json(settings);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid settings data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update chat settings" });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}