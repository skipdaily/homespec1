#!/bin/bash

# Start-all.sh - Script to start both frontend and backend servers
echo "🚀 Starting HomeSpec application..."

# Kill any processes using our required ports
echo "🔄 Checking for processes using port 5001 (API)..."
PORT_5001_PIDS=$(lsof -t -i:5001)
if [ -n "$PORT_5001_PIDS" ]; then
  echo "  📝 Killing processes using port 5001: $PORT_5001_PIDS"
  kill -9 $PORT_5001_PIDS
  sleep 1
else
  echo "  ✅ No processes found using port 5001"
fi

echo "🔄 Checking for processes using port 5173 (Frontend)..."
PORT_5173_PIDS=$(lsof -t -i:5173)
if [ -n "$PORT_5173_PIDS" ]; then
  echo "  📝 Killing processes using port 5173: $PORT_5173_PIDS"
  kill -9 $PORT_5173_PIDS
  sleep 1
else
  echo "  ✅ No processes found using port 5173"
fi

# Read OpenAI API key from .env file
echo "🔑 Extracting API keys from .env file..."
OPENAI_KEY=$(grep OPENAI_API_KEY .env | cut -d'=' -f2)

# Verify API key extraction
if [ -z "$OPENAI_KEY" ]; then
  echo "❌ ERROR: Failed to extract OPENAI_API_KEY from .env file"
  echo "Please ensure your .env file contains a valid OPENAI_API_KEY"
  exit 1
fi

echo "✅ API keys extracted successfully"

# Set up directory
cd "/Users/thomasgould/Desktop/Unit tracker/unit-tracker"

# Start backend server in background
echo "🔄 Starting backend server on port 5001..."
NODE_ENV=development PORT=5001 OPENAI_API_KEY="$OPENAI_KEY" npm run dev &
BACKEND_PID=$!
echo "✅ Backend server started with PID $BACKEND_PID"

# Give the backend a moment to start up
sleep 3

# Start frontend server in background
echo "🔄 Starting frontend server on port 5173..."
cd client && npx vite &
FRONTEND_PID=$!
echo "✅ Frontend server started with PID $FRONTEND_PID"

echo "🎉 Both servers are now running!"
echo "   - Frontend: http://localhost:5173"
echo "   - Backend: http://localhost:5001"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user interrupt
trap "kill $BACKEND_PID $FRONTEND_PID; echo ''; echo 'Servers stopped'; exit" INT
wait
