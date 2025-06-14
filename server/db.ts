import { neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import ws from "ws";
import * as schema from "@shared/schema";

// Set up WebSocket for Neon database
neonConfig.webSocketConstructor = ws;

// Database connection state
export let connectionState = {
  configured: false,
  connected: false,
  error: null as Error | null
};

console.log('Initializing database module...');

// Initialize with null values
let sqlClient: postgres.Sql<{}> | null = null;
let db: any = null;

/**
 * Initialize the database connection
 * This function can be called multiple times safely
 */
export async function initializeDatabase() {
  // Skip if already configured
  if (connectionState.configured) {
    return { sqlClient, db };
  }
  
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.warn('⚠️ No DATABASE_URL provided - database will not be available');
    connectionState.error = new Error('No DATABASE_URL provided');
    return { sqlClient: null, db: null };
  }
  
  try {
    console.log('Configuring database connection...');
    
    // Use postgres-js for both local and remote connections
    // Configure connection options based on environment
    const options: postgres.Options<{}> = {
      ssl: !dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1'),
      max: 10, // Maximum number of connections
      idle_timeout: 20, // Idle connection timeout in seconds
      connect_timeout: 10, // Connection timeout in seconds
    };

    // Create postgres client
    sqlClient = postgres(dbUrl, options);
    
    // Create drizzle ORM instance
    db = drizzle(sqlClient, { schema });
    
    connectionState.configured = true;
    console.log('✅ Database configuration successful');
    
    // Test the connection
    try {
      await sqlClient`SELECT 1`;
      connectionState.connected = true;
      console.log('✅ Database connection verified');
    } catch (error) {
      console.error('❌ Database connection test failed:', error);
      connectionState.error = error instanceof Error ? error : new Error(String(error));
      // Keep the connection configuration even if the test failed
    }
    
    return { sqlClient, db };
  } catch (error) {
    console.error('❌ Database configuration failed:', error);
    connectionState.error = error instanceof Error ? error : new Error(String(error));
    return { sqlClient: null, db: null };
  }
}

// Initialize right away but don't wait for it
initializeDatabase().catch(err => {
  console.error('Database initialization error:', err);
});

// Test connection function that doesn't crash the server
export async function testDatabaseConnection(): Promise<boolean> {
  if (!sqlClient) {
    console.log('No database connection available to test');
    return false;
  }
  
  try {
    await sqlClient`SELECT 1`;
    connectionState.connected = true;
    console.log('✅ Database connection test successful');
    return true;
  } catch (error) {
    connectionState.connected = false;
    connectionState.error = error instanceof Error ? error : new Error(String(error));
    console.error('❌ Database connection test failed:', error);
    return false;
  }
}

export { sqlClient as pool, db };
