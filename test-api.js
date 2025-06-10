import http from 'http';

// Configuration
const API_HOST = 'localhost';
const API_PORT = 4002;
const USER_ID = 'f5a5c8bb-e276-4aee-be4d-6b9d2d27ecfc';
const PROJECT_ID = '024ecf72-dfad-48bd-a1c6-1619022dac3a';

// Helper function to make API requests
function makeRequest(method, path, data = null) {
  console.log(`🔄 Making ${method} request to ${path}...`);
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: `/api${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': USER_ID
      }
    };
    
    console.log(`Request options: ${JSON.stringify(options)}`);
    console.log(`Request data: ${data ? JSON.stringify(data) : 'none'}`);
    

    const req = http.request(options, (res) => {
      let responseBody = '';
      
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseBody);
          console.log(`✅ ${method} ${path} - Status: ${res.statusCode}`);
          resolve(parsedData);
        } catch (e) {
          console.log(`❌ ${method} ${path} - Status: ${res.statusCode} - Response not JSON: ${responseBody.substring(0, 100)}...`);
          reject(e);
        }
      });
    });

    req.on('error', (e) => {
      console.error(`❌ ${method} ${path} - Request failed: ${e.message}`);
      reject(e);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// API tests
async function runTests() {
  try {
    console.log('🧪 Testing API endpoints...');
    
    // Test 1: Get projects
    console.log('\n📋 Testing GET /projects...');
    const projects = await makeRequest('GET', '/projects');
    console.log(`Found ${projects.length} projects`);
    
    // Test 2: Create a conversation
    console.log('\n💬 Testing POST /conversations...');
    const conversation = await makeRequest('POST', '/conversations', {
      project_id: PROJECT_ID,
      title: 'API Test Conversation ' + new Date().toISOString()
    });
    console.log(`Created conversation: ${conversation.id}`);
    
    // Test 3: Send a message
    console.log('\n📝 Testing POST /messages...');
    const message = await makeRequest('POST', '/messages', {
      conversation_id: conversation.id,
      content: 'What kind of countertops do I have in my kitchen?',
      project_id: PROJECT_ID
    });
    console.log(`Sent message and received response: ${message.message.content.substring(0, 50)}...`);
    
    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the tests
runTests();
