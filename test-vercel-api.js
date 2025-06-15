#!/usr/bin/env node

// Test script to check if OpenAI API works with Vercel environment variables
// This script can be run locally to test the same API key configuration used in Vercel

import 'dotenv/config';

async function testOpenAIWithVercelConfig() {
  console.log('🔍 Testing OpenAI API with Vercel-like configuration...\n');

  // Check environment variables (same as Vercel)
  const requiredEnvVars = {
    'OPENAI_API_KEY': process.env.OPENAI_API_KEY,
    'VITE_SUPABASE_URL': process.env.VITE_SUPABASE_URL,
    'VITE_SUPABASE_ANON_KEY': process.env.VITE_SUPABASE_ANON_KEY,
    'DATABASE_URL': process.env.DATABASE_URL,
    'SESSION_SECRET': process.env.SESSION_SECRET,
    'FRONTEND_URL': process.env.FRONTEND_URL
  };

  console.log('📋 Environment Variables Check:');
  for (const [key, value] of Object.entries(requiredEnvVars)) {
    const status = value ? '✅' : '❌';
    const preview = value ? `${value.substring(0, 20)}...` : 'NOT SET';
    console.log(`${status} ${key}: ${preview}`);
  }
  console.log('');

  // Check OpenAI API key format
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.error('❌ OPENAI_API_KEY is not set!');
    console.log('Please add your OpenAI API key to your .env file:');
    console.log('OPENAI_API_KEY=sk-proj-your-key-here');
    process.exit(1);
  }

  if (!openaiKey.startsWith('sk-')) {
    console.error('❌ Invalid OpenAI API key format!');
    console.log('OpenAI API keys should start with "sk-"');
    console.log('Your key starts with:', openaiKey.substring(0, 10));
    process.exit(1);
  }

  console.log('✅ OpenAI API key format looks correct');
  console.log(`Key length: ${openaiKey.length} characters`);
  console.log(`Key preview: ${openaiKey.substring(0, 20)}...`);
  console.log('');

  // Test OpenAI API call
  console.log('🤖 Testing OpenAI API call...');
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant for testing API connections.'
          },
          {
            role: 'user',
            content: 'Hello! Please confirm that the API is working by responding with "API connection successful".'
          }
        ],
        max_tokens: 50,
        temperature: 0.7
      })
    });

    console.log(`📡 Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API Error:');
      console.error(`Status: ${response.status}`);
      console.error(`Response: ${errorText}`);
      
      if (response.status === 401) {
        console.log('\n💡 Troubleshooting tips for 401 Unauthorized:');
        console.log('1. Check that your API key is correct');
        console.log('2. Make sure your OpenAI account has billing set up');
        console.log('3. Verify the API key has the necessary permissions');
      } else if (response.status === 429) {
        console.log('\n💡 Troubleshooting tips for 429 Rate Limit:');
        console.log('1. You may have exceeded your rate limit');
        console.log('2. Try again in a few minutes');
        console.log('3. Consider upgrading your OpenAI plan');
      }
      
      process.exit(1);
    }

    const data = await response.json();
    
    console.log('✅ OpenAI API call successful!');
    console.log(`Model used: ${data.model}`);
    console.log(`Response: "${data.choices[0].message.content}"`);
    console.log(`Usage: ${data.usage.prompt_tokens} prompt + ${data.usage.completion_tokens} completion = ${data.usage.total_tokens} total tokens`);

    // Test conversation flow similar to your app
    console.log('\n🔄 Testing conversation flow...');
    
    const conversationResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant for home construction and renovation projects.'
          },
          {
            role: 'user',
            content: 'What are some popular countertop materials for kitchens?'
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      })
    });

    if (conversationResponse.ok) {
      const conversationData = await conversationResponse.json();
      console.log('✅ Conversation test successful!');
      console.log(`Response preview: "${conversationData.choices[0].message.content.substring(0, 100)}..."`);
    } else {
      console.error('❌ Conversation test failed');
    }

  } catch (error) {
    console.error('❌ Network error testing OpenAI API:', error.message);
    console.log('\n💡 Troubleshooting tips:');
    console.log('1. Check your internet connection');
    console.log('2. Verify the OpenAI API is accessible from your network');
    console.log('3. Try again in a few minutes');
    process.exit(1);
  }

  console.log('\n🎉 All tests passed! Your OpenAI API configuration should work in Vercel.');
  console.log('\n📝 Next steps:');
  console.log('1. Make sure these same environment variables are set in Vercel');
  console.log('2. Deploy your application');
  console.log('3. Test the chat functionality in the deployed app');
}

// Run the test
testOpenAIWithVercelConfig().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
