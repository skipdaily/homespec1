// test-openai.js
import * as dotenv from 'dotenv';
import OpenAI from 'openai';

// Load environment variables
dotenv.config();

async function testOpenAI() {
  console.log('Starting OpenAI API test...');
  console.log('OpenAI API Key exists:', !!process.env.OPENAI_API_KEY);
  console.log('OpenAI API Key length:', process.env.OPENAI_API_KEY?.length || 0);
  
  if (!process.env.OPENAI_API_KEY) {
    console.error('ERROR: OPENAI_API_KEY is missing from environment variables!');
    process.exit(1);
  }
  
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    console.log('Sending test request to OpenAI API...');
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello, are you working properly?' }
      ],
      max_tokens: 50
    });
    
    console.log('✅ OpenAI API response received successfully!');
    console.log('Response message:', response.choices[0]?.message?.content);
    
  } catch (error) {
    console.error('❌ OpenAI API error:', error.message);
  }
}

testOpenAI();
