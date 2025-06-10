#!/bin/bash

# Test script for the chat functionality
echo "🧪 Testing AI Chat Functionality"
echo "================================"

# Set the base URL
BASE_URL="http://localhost:4001"

# Use a test user ID
TEST_USER_ID="550e8400-e29b-41d4-a716-446655440001"
TEST_PROJECT_ID="550e8400-e29b-41d4-a716-446655440000"

echo -e "\n📋 Testing GET conversations endpoint..."
curl -s -H "X-User-ID: $TEST_USER_ID" \
  $BASE_URL/api/projects/$TEST_PROJECT_ID/conversations | jq .

echo -e "\n📝 Testing POST conversation creation..."
CONVERSATION_ID=$(curl -s -X POST \
  -H "X-User-ID: $TEST_USER_ID" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Conversation from Script"}' \
  $BASE_URL/api/projects/$TEST_PROJECT_ID/conversations | jq -r '.id')

echo "Created conversation with ID: $CONVERSATION_ID"

if [ "$CONVERSATION_ID" == "null" ]; then
  echo "❌ Failed to create conversation!"
  exit 1
fi

echo -e "\n💬 Testing POST message to conversation..."
MESSAGE_RESPONSE=$(curl -s -X POST \
  -H "X-User-ID: $TEST_USER_ID" \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello, this is a test message"}' \
  $BASE_URL/api/conversations/$CONVERSATION_ID/messages)

echo "Message response:"
echo "$MESSAGE_RESPONSE" | jq .

echo -e "\n✅ Test completed!"
