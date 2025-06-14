// Simple script to test CORS and API connectivity
import fetch from 'node-fetch';

const testEndpoints = async () => {
  try {
    console.log('Testing API endpoint from server directly...');
    const response = await fetch('http://localhost:5001/api');
    const data = await response.text();
    console.log('Response:', response.status, data);
  } catch (error) {
    console.error('Error connecting to API:', error.message);
  }
};

testEndpoints();
