import express, { type Request, Response, NextFunction } from "express";
import cors from 'cors';
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeStorage, storageMode } from "./storage";
import { initializeDatabase, connectionState } from "./db";
import 'dotenv/config';

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  console.error('🚨 UNCAUGHT EXCEPTION:', error);
  console.error('Stack trace:', error.stack);
  // Don't exit the process in development
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 UNHANDLED PROMISE REJECTION:', reason);
  // Don't exit the process in development
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

async function startServer() {
  try {
    const app = express();
    
    // Initialize storage as early as possible
    await initializeDatabase();
    await initializeStorage();
    
    console.log(`Starting server with storage mode: ${storageMode}`);
    console.log(`Database connection state: ${connectionState.connected ? 'CONNECTED' : 'NOT CONNECTED'}`);

    // Add CORS configuration before other middleware
    app.use(cors({
      origin: process.env.NODE_ENV === 'production' 
        ? [
            process.env.FRONTEND_URL || 'https://homespec-skipdaily.vercel.app',
            'https://homespec.vercel.app',
            'https://homespec-git-main-skipdaily.vercel.app'
          ] 
        : ['http://localhost:4000', 'http://localhost:5173', 'http://localhost:4001'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Client-Info',
        'X-User-ID',
        'apikey',
        'X-Supabase-Auth',
        'Range'
      ]
    }));

    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    // Auth debugging middleware - add after parsing middleware
    app.use((req, res, next) => {
      // Only log auth-related endpoints
      if (req.path.startsWith('/api/') && 
          (req.path.includes('/conversations') || 
           req.path.includes('/messages') || 
           req.path.includes('/chat-settings'))) {
        
        const userId = req.headers["x-user-id"];
        
        if (!userId || typeof userId !== "string") {
          console.log(`🔒 AUTH WARNING: Missing user ID header for ${req.method} ${req.path}`);
        } else {
          console.log(`🔒 AUTH OK: User ${userId.substring(0, 8)}... accessing ${req.method} ${req.path}`);
        }
      }
      next();
    });

    // Add request logging middleware
    app.use((req, res, next) => {
      const start = Date.now();
      const path = req.path;
      let capturedJsonResponse: Record<string, any> | undefined = undefined;

      const originalResJson = res.json;
      res.json = function (bodyJson, ...args) {
        capturedJsonResponse = bodyJson;
        return originalResJson.apply(res, [bodyJson, ...args]);
      };

      res.on("finish", () => {
        const duration = Date.now() - start;
        if (path.startsWith("/api")) {
          let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
          if (capturedJsonResponse) {
            logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
          }

          if (logLine.length > 80) {
            logLine = logLine.slice(0, 79) + "…";
          }

          log(logLine);
        }
      });

      next();
    });

    // Static files and vite setup for non-API routes
    if (app.get("env") === "development") {
      // Set up non-API routes to be handled by Vite
      // This needs to be before registerRoutes to allow API routes to be prioritized
      app.use(/^(?!\/api\/).*$/, async (req, res, next) => {
        try {
          // Only handle non-API routes with Vite
          await setupVite(app, null, req, res, next);
        } catch (e) {
          next(e);
        }
      });
    } else {
      serveStatic(app);
    }

    // Register the API routes AFTER Vite setup to ensure they take precedence
    const server = await registerRoutes(app);

    // Error handler middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      const stack = process.env.NODE_ENV === 'development' ? err.stack : undefined;

      console.error('🚨 Server error:', err);
      
      res.status(status).json({ 
        message, 
        stack,
        timestamp: new Date().toISOString()
      });
    });

    // Use PORT from environment variable, defaulting to 4001
    const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4001;
    console.log(`Starting server on port ${PORT}...`);
    
    server.listen(PORT, "0.0.0.0", () => {
      log(`✅ Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
