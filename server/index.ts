// Load environment variables first
import 'dotenv/config';

import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import cors from 'cors';
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeStorage, storageMode } from "./storage";
import { initializeDatabase, connectionState } from "./db";

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

// Create Express app instance
const app = express();
let appInitialized = false;

async function createApp() {
  if (appInitialized) {
    return app;
  }

  try {
    console.log(`🚀 Starting server initialization...`);
    console.log(`📦 Storage mode: ${storageMode}`);
    console.log(`🗄️ Database connection state: ${connectionState}`);

    // Enable trust proxy for production
    if (process.env.NODE_ENV === 'production') {
      app.set('trust proxy', true);
    }

    // CORS configuration
    app.use(cors({
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://homespec1.vercel.app', /\.vercel\.app$/]
        : ['http://localhost:5173', 'http://localhost:4001'],
      credentials: true
    }));

    // Body parsing middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Enhanced request logging
    app.use((req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const logLevel = res.statusCode >= 400 ? '🔴' : res.statusCode >= 300 ? '🟡' : '🟢';
        console.log(`${logLevel} ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
        
        if (res.statusCode >= 400) {
          console.log(`   Headers: ${JSON.stringify(req.headers)}`);
          if (req.body && Object.keys(req.body).length > 0) {
            console.log(`   Body: ${JSON.stringify(req.body)}`);
          }
        }
      });
      
      next();
    });

    // Initialize storage first
    await initializeStorage();
    
    // Initialize database
    await initializeDatabase();

    // Development vs Production setup
    if (process.env.NODE_ENV !== "production") {
      // Development: Use Vite for all non-API routes
      const server = createServer();
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Register the API routes AFTER Vite setup to ensure they take precedence
    await registerRoutes(app);

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

    appInitialized = true;
    console.log('✅ App initialization complete');
    
    return app;
  } catch (error) {
    console.error('❌ Failed to initialize app:', error);
    throw error;
  }
}

async function startServer() {
  try {
    const app = await createApp();

    // Use PORT from environment variable, defaulting to 4001
    const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4001;
    console.log(`Starting server on port ${PORT}...`);
    
    const server = app.listen(PORT, "0.0.0.0", () => {
      log(`✅ Server running on http://localhost:${PORT}`);
    });

    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// For Vercel serverless deployment
export default async function handler(req: Request, res: Response) {
  try {
    const app = await createApp();
    return app(req, res);
  } catch (error) {
    console.error('❌ Serverless handler error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}

// Start the server in development/local environments
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  startServer();
}
