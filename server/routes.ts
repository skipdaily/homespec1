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
      res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "unknown",
        storageMode,
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        openAIKeyLength: process.env.OPENAI_API_KEY?.length || 0,
        openAIKeyPrefix: process.env.OPENAI_API_KEY?.substring(0, 10) || 'N/A',
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasSupabaseUrl: !!process.env.VITE_SUPABASE_URL,
        hasSupabaseKey: !!process.env.VITE_SUPABASE_ANON_KEY
      });
    } catch (error) {
      res.status(500).json({
        status: "ERROR",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      });
    }
  });

  // Add a debug route for testing OpenAI API
  app.get("/api/debug/openai", async (req, res) => {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      
      if (!apiKey) {
        return res.status(500).json({
          status: "ERROR",
          error: "OpenAI API key not configured",
          hasKey: false
        });
      }

      if (!apiKey.startsWith('sk-')) {
        return res.status(500).json({
          status: "ERROR", 
          error: "Invalid OpenAI API key format",
          hasKey: true,
          keyFormat: "invalid"
        });
      }

      // Test OpenAI API connectivity
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(500).json({
          status: "ERROR",
          error: `OpenAI API returned ${response.status}: ${response.statusText}`,
          details: errorText,
          hasKey: true,
          keyFormat: "valid"
        });
      }

      const models = await response.json();
      const hasGPT4oMini = models.data.some((model: any) => model.id === 'gpt-4o-mini');

      res.json({
        status: "OK",
        message: "OpenAI API is accessible",
        hasKey: true,
        keyFormat: "valid",
        keyLength: apiKey.length,
        keyPrefix: apiKey.substring(0, 10),
        modelCount: models.data.length,
        hasGPT4oMini,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(500).json({
        status: "ERROR",
        error: error instanceof Error ? error.message : "Unknown error",
        hasKey: !!process.env.OPENAI_API_KEY,
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
    const startTime = Date.now();
    const userId = req.headers["x-user-id"];
    
    console.log("🚀 Create conversation request started:", {
      projectId: req.params.projectId,
      userId: userId,
      title: req.body.title,
      timestamp: new Date().toISOString()
    });
    
    if (!userId || typeof userId !== "string") {
      console.error("❌ Missing user ID");
      return res.status(401).json({ 
        message: "Unauthorized", 
        details: "Missing or invalid user ID header"
      });
    }

    // Set a response timeout to prevent Vercel function timeout
    const timeout = setTimeout(() => {
      console.error("⏰ Function timeout - responding early");
      if (!res.headersSent) {
        res.status(500).json({ 
          message: "Request timeout", 
          details: "Function took too long to execute"
        });
      }
    }, 8000); // 8 seconds, leaving 2 seconds buffer for Vercel's 10s limit

    try {
      // Quick validation
      const title = req.body.title || 'New Conversation';
      
      console.log("⚙️ Validating conversation data...");
      const conversationData = {
        project_id: req.params.projectId,
        user_id: userId,
        title: title
      };

      // Parse with schema but catch errors quickly
      let validatedData;
      try {
        validatedData = insertConversationSchema.parse(conversationData);
        console.log("✅ Data validation passed");
      } catch (validationError) {
        clearTimeout(timeout);
        console.error("❌ Data validation failed:", validationError);
        return res.status(400).json({ 
          message: "Invalid conversation data", 
          details: validationError instanceof ZodError ? validationError.errors : String(validationError)
        });
      }
      
      console.log("💾 Creating conversation in storage...");
      const storageStart = Date.now();
      
      try {
        // Use a timeout for the storage operation
        const conversation = await Promise.race([
          storage.createConversation(validatedData),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Storage timeout')), 5000)
          )
        ]) as any;
        
        clearTimeout(timeout);
        const totalTime = Date.now() - startTime;
        const storageTime = Date.now() - storageStart;
        
        console.log("✅ Conversation created successfully:", {
          id: conversation.id,
          totalTime: `${totalTime}ms`,
          storageTime: `${storageTime}ms`
        });
        
        res.status(201).json(conversation);
        
      } catch (storageError) {
        clearTimeout(timeout);
        const totalTime = Date.now() - startTime;
        
        console.error("❌ Storage error:", {
          error: String(storageError),
          totalTime: `${totalTime}ms`,
          errorType: storageError instanceof Error ? storageError.name : typeof storageError
        });
        
        // Check if it's a timeout error
        if (String(storageError).includes('timeout')) {
          return res.status(504).json({ 
            message: "Database connection timeout", 
            details: "The database is taking too long to respond",
            suggestion: "Please try again in a moment"
          });
        }
        
        // Generic storage error
        return res.status(500).json({ 
          message: "Failed to create conversation", 
          details: String(storageError),
          help: "This might be a temporary database issue"
        });
      }
      
    } catch (error) {
      clearTimeout(timeout);
      const totalTime = Date.now() - startTime;
      
      console.error("💥 Unexpected error:", {
        error: String(error),
        stack: error instanceof Error ? error.stack : undefined,
        totalTime: `${totalTime}ms`
      });
      
      res.status(500).json({ 
        message: "Internal server error", 
        details: String(error),
        totalTime: `${totalTime}ms`
      });
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
      console.error('❌ Chat request missing user ID');
      return res.status(401).json({ message: "Unauthorized - User ID required" });
    }

    console.log('💬 Chat message request:', {
      conversationId: req.params.conversationId,
      userId,
      timestamp: new Date().toISOString(),
      hasContent: !!req.body.content
    });

    try {
      // Verify user owns this conversation
      const conversation = await storage.getConversation(req.params.conversationId);
      
      if (!conversation) {
        console.error(`❌ Conversation not found: ${req.params.conversationId}`);
        return res.status(404).json({ message: "Conversation not found" });
      }

      if (conversation.user_id !== userId) {
        console.error(`❌ Access denied for conversation ${req.params.conversationId}: conversation user ${conversation?.user_id} != request user ${userId}`);
        return res.status(403).json({ message: "Access denied - You don't own this conversation" });
      }

      const { content } = req.body;
      if (!content || typeof content !== "string") {
        console.error('❌ Missing or invalid message content');
        return res.status(400).json({ message: "Message content is required and must be a string" });
      }

      if (content.trim().length === 0) {
        console.error('❌ Empty message content');
        return res.status(400).json({ message: "Message content cannot be empty" });
      }

      console.log('✅ Request validation passed, processing message...');

      // Process the message with AI
      const result = await ChatService.processMessage(
        req.params.conversationId,
        content.trim(),
        userId,
        conversation.project_id
      );

      console.log('✅ Message processed successfully');
      res.json(result);

    } catch (error) {
      console.error("💥 Chat error:", {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        conversationId: req.params.conversationId,
        userId,
        timestamp: new Date().toISOString()
      });

      // Provide user-friendly error messages
      let userMessage = "Failed to process message";
      let statusCode = 500;

      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          userMessage = "AI service configuration error. Please check your settings.";
          statusCode = 502;
        } else if (error.message.includes('rate limit')) {
          userMessage = "Too many requests. Please try again in a moment.";
          statusCode = 429;
        } else if (error.message.includes('Invalid')) {
          userMessage = error.message;
          statusCode = 400;
        } else {
          userMessage = error.message;
        }
      }

      res.status(statusCode).json({ 
        message: userMessage,
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : error) : undefined
      });
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