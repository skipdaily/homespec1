#!/bin/bash

# Kill any processes using port 4001
echo "Checking for processes using port 4001..."
PORT_PIDS=$(lsof -t -i:4001)
if [ -n "$PORT_PIDS" ]; then
  echo "Killing processes using port 4001: $PORT_PIDS"
  kill -9 $PORT_PIDS
  sleep 1
else
  echo "No processes found using port 4001"
fi

# Set the environment variables for development
export NODE_ENV=development
export PORT=5001
export OPENAI_API_KEY=$(grep OPENAI_API_KEY .env | cut -d'=' -f2)

# Start the server
echo "Starting the server on port 5001..."
cd "/Users/thomasgould/Desktop/Unit tracker/unit-tracker"
npm run dev
