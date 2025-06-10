// Test script for chat functionality with database storage
import 'dotenv/config';
import { initializeStorage, getStorage } from './server/storage';
import { initializeDatabase, connectionState } from './server/db';
import { ChatService } from './server/chat-service';

// Configuration
const PROJECT_ID = '024ecf72-dfad-48bd-a1c6-1619022dac3a';
const USER_ID = 'f5a5c8bb-e276-4aee-be4d-6b9d2d27ecfc';
const TITLE = `Test Conversation ${new Date().toISOString()}`;

// Force database storage mode
process.env.STORAGE_MODE = 'database';

// Main function
async function testChatFunctionality() {
  try {
    console.log('🔄 Starting chat functionality test...');
    
    // Initialize database and storage
    console.log('🔄 Initializing database...');
    await initializeDatabase();
    console.log(`Database connection: ${connectionState.connected ? 'CONNECTED' : 'DISCONNECTED'}`);
    
    console.log('🔄 Initializing storage...');
    await initializeStorage();
    
    // Get storage
    const storage = await getStorage();
    
    // List projects
    console.log('\n📋 Listing projects...');
    const projects = await storage.getProjectsByUserId(USER_ID);
    console.log(`Found ${projects.length} projects:`);
    projects.forEach(p => console.log(`- ${p.name} (${p.id})`));
    
    // Create conversation
    console.log('\n💬 Creating test conversation...');
    const conversation = await ChatService.createConversation(PROJECT_ID, USER_ID, TITLE);
    console.log(`Created conversation: ${conversation.id}`);
    
    // Send test message
    console.log('\n📝 Sending test message...');
    const response = await ChatService.processMessage(
      conversation.id,
      "What kind of countertops do I have in my kitchen?",
      USER_ID,
      PROJECT_ID
    );
    
    console.log('\n✅ Message sent and response received:');
    console.log(`AI: ${response.message.content}`);
    
    // Show usage stats
    console.log('\n📊 Usage stats:');
    console.log(JSON.stringify(response.usage, null, 2));
    
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run the test
testChatFunctionality();
