import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
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
let pool: Pool | null = null;
let db: any = null;

/**
 * Initialize the database connection
 * This function can be called multiple times safely
 */
export async function initializeDatabase() {
  // Skip if already configured
  if (connectionState.configured) {
    return { pool, db };
  }
  
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.warn('⚠️ No DATABASE_URL provided - database will not be available');
    connectionState.error = new Error('No DATABASE_URL provided');
    return { pool: null, db: null };
  }
  
  try {
    console.log('Configuring database connection...');
    
    // Configure database connection
    pool = new Pool({ 
      connectionString: dbUrl,
      connectionTimeoutMillis: 5000 // 5 second connection timeout
    });
    
    db = drizzle({ client: pool, schema });
    connectionState.configured = true;
    console.log('✅ Database configuration successful');
    
    // Test the connection
    try {
      await pool.query('SELECT 1');
      connectionState.connected = true;
      console.log('✅ Database connection verified');
    } catch (error) {
      console.error('❌ Database connection test failed:', error);
      connectionState.error = error instanceof Error ? error : new Error(String(error));
      // Keep the connection configuration even if the test failed
    }
    
    return { pool, db };
  } catch (error) {
    console.error('❌ Database configuration failed:', error);
    connectionState.error = error instanceof Error ? error : new Error(String(error));
    return { pool: null, db: null };
  }
}

// Initialize right away but don't wait for it
initializeDatabase().catch(err => {
  console.error('Database initialization error:', err);
});

// Test connection function that doesn't crash the server
export async function testDatabaseConnection(): Promise<boolean> {
  if (!pool) {
    console.log('No database pool available to test');
    return false;
  }
  
  try {
    await pool.query('SELECT 1');
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

export { pool, db };
