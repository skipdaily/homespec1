import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { config } from 'dotenv';
import fs from 'fs';

// Set up proper __dirname and load .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: __dirname + '/.env' });

// Read the DATABASE_URL directly from the .env file
const envFile = fs.readFileSync(__dirname + '/.env', 'utf8');
const dbUrlMatch = envFile.match(/DATABASE_URL=(.+)/);
if (dbUrlMatch && dbUrlMatch[1]) {
  process.env.DATABASE_URL = dbUrlMatch[1];
  console.log(`📊 Using DATABASE_URL from .env file: ${process.env.DATABASE_URL.substring(0, 20)}...`);
} else {
  console.error('❌ DATABASE_URL not found in .env file');
  process.exit(1);
}

// Set STORAGE_MODE
process.env.STORAGE_MODE = 'database';
process.env.NODE_ENV = 'development';

// Import the necessary modules
import { initializeStorage, getStorage, storageMode } from './server/storage.js';
import { initializeDatabase, connectionState } from './server/db.js';
import { ChatService } from './server/chat-service.js';
import crypto from 'crypto';

// Create a unique conversation title
const title = `Migration Test ${new Date().toISOString()}`;
const PROJECT_ID = '024ecf72-dfad-48bd-a1c6-1619022dac3a';
const USER_ID = 'f5a5c8bb-e276-4aee-be4d-6b9d2d27ecfc';

async function run() {
  try {
    console.log('🌱 Starting database test script...');
    
    // Initialize the database and storage
    console.log('🔄 Initializing database connection...');
    await initializeDatabase();
    
    console.log('🔄 Initializing storage...');
    await initializeStorage();
    
    console.log(`⚙️ Storage mode: ${storageMode}`);
    console.log(`🔌 Database connection: ${connectionState.connected ? 'CONNECTED' : 'DISCONNECTED'}`);
    
    // Get storage instance
    const storage = await getStorage();
    
    // 1. List projects
    console.log('\n📋 Listing projects...');
    const projects = await storage.getProjectsByUserId(USER_ID);
    console.log(`Found ${projects.length} projects:`);
    projects.forEach(p => console.log(` - ${p.name} (${p.id})`));
    
    // 2. Create conversation
    console.log('\n💬 Creating test conversation...');
    const conversation = await storage.createConversation({
      project_id: PROJECT_ID,
      user_id: USER_ID,
      title: title
    });
    console.log(`Created conversation: ${conversation.id}`);
    
    // 3. Send a test message
    console.log('\n📝 Sending test message...');
    const response = await ChatService.processMessage(
      conversation.id,
      "What kind of countertops do I have in my kitchen?",
      USER_ID,
      PROJECT_ID
    );
    
    console.log('✅ Message sent and response received:');
    console.log(`AI: ${response.message.content}`);
    
    console.log('\n📊 Usage stats:');
    console.log(response.usage);
    
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

run();
