# HomeSpecTracker Development Mode

## Overview
This document explains how to use HomeSpecTracker in development mode with mock storage and AI responses.

## Setup Instructions

1. **Environment Configuration**
   - The `.env` file has been configured with development-friendly settings
   - Development port is set to 4001
   - Mock API keys are in place for all LLM providers

2. **Starting the Server**
   - Use the provided script to start the server:
     ```bash
     ./restart-server.sh
     ```
   - This will kill any existing processes on port 4001 and start the server

3. **Testing the Chat Functionality**

   **Via API:**
   ```bash
   # Create a conversation
   curl -X POST http://localhost:4001/api/projects/550e8400-e29b-41d4-a716-446655440000/conversations \
     -H "x-user-id: 550e8400-e29b-41d4-a716-446655440001" \
     -H "Content-Type: application/json" \
     -d '{"title":"Test Conversation"}'

   # Send a message
   curl -X POST http://localhost:4001/api/conversations/550e8400-e29b-41d4-a716-446655440002/messages \
     -H "x-user-id: 550e8400-e29b-41d4-a716-446655440001" \
     -H "Content-Type: application/json" \
     -d '{"role":"user","content":"Hello, can you help me with my home renovation project?"}'
   ```

   **Via Web Interface:**
   1. Open http://localhost:4001 in your browser
   2. Log in with any credentials (in development mode, authentication is mocked)
   3. Navigate to the chat functionality
   4. Create a new conversation and send messages

## Implementation Details

1. **Mock Storage**
   - In development mode, the application uses in-memory storage instead of a real database
   - Pre-populated with sample projects, rooms, and finishes

2. **Mock AI Responses**
   - The OpenAI provider has been modified to return mock responses in development mode
   - No real API calls are made to external LLM providers
   - All responses are generated locally

3. **Authentication**
   - For API testing, use the header `x-user-id: 550e8400-e29b-41d4-a716-446655440001`
   - In the UI, any login credentials will work in development mode

## Preparing for Production

Before deploying to production, make sure to:

1. Configure real Supabase DATABASE_URL
2. Set up actual LLM API keys
3. Ensure all required tables exist in the production database
4. Test the application thoroughly with real data

## Troubleshooting

If you encounter issues:

1. Check the server logs for error messages
2. Verify that port 4001 is not being used by another application
3. Make sure NODE_ENV is set to "development"
4. Restart the server using the provided script
