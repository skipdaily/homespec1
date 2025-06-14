#!/bin/bash

# Test script to create default chat settings for development
echo "Creating default chat settings for development testing..."

# Test user ID (this should match the user ID you're testing with)
USER_ID="550e8400-e29b-41d4-a716-446655440000"
PROJECT_ID="your-project-id-here"

# Create chat settings using curl
curl -X PUT "http://localhost:4001/api/projects/${PROJECT_ID}/chat-settings" \
  -H "Content-Type: application/json" \
  -H "X-User-ID: ${USER_ID}" \
  -d '{
    "provider": "openai",
    "model": "gpt-4o-mini",
    "temperature": 0.7,
    "max_tokens": 1000,
    "system_prompt": "You are a helpful AI assistant for the HomeSpec project management system. Help users with questions about their home construction and renovation projects.",
    "restrict_to_project_data": true,
    "enable_web_search": false,
    "max_conversation_length": 50
  }' | jq .

echo "Default chat settings created!"
