// Test script for items-to-finishes mapping
import 'dotenv/config';
import { getStorage } from './server/storage.js';

async function testItemsToFinishes() {
  try {
    console.log('Starting items-to-finishes mapping test...');
    
    // Get storage instance
    const storage = await getStorage();
    
    // Get a project (adjust with a valid project ID from your database)
    const projects = await storage.getProjectsByUserId('00000000-0000-0000-0000-000000000000');
    if (projects.length === 0) {
      console.log('No projects found. Please update the user ID in the test script.');
      return;
    }
    
    const projectId = projects[0].id;
    console.log(`Using project: ${projects[0].name} (${projectId})`);
    
    // Get rooms for the project
    const rooms = await storage.getRoomsByProjectId(projectId);
    console.log(`Found ${rooms.length} rooms`);
    
    if (rooms.length === 0) {
      console.log('No rooms found in the project.');
      return;
    }
    
    // Test getting items for a room
    const roomId = rooms[0].id;
    console.log(`Testing with room: ${rooms[0].name} (${roomId})`);
    
    const items = await storage.getItemsByRoomId(roomId);
    console.log(`Found ${items.length} items in the room`);
    
    // Test the mapping by getting "finishes" for the room
    const finishes = await storage.getFinishesByRoomId(roomId);
    console.log(`Successfully mapped ${finishes.length} items to finishes`);
    
    if (finishes.length > 0) {
      console.log('Example mapped finish:');
      console.log(JSON.stringify(finishes[0], null, 2));
    }
    
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testItemsToFinishes().catch(console.error);
