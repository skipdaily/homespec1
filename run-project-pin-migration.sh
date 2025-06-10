#!/bin/bash

# Script to run the project pin migration
echo "🔄 Running migration to add require_pin and edit_pin columns to projects table..."

# Set the database URL from .env file
export $(grep -v '^#' .env | xargs)

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not found in .env file"
  exit 1
fi

# Run the migration
psql "$DATABASE_URL" -f migrations/006_add_project_pin.sql

# Check if the migration was successful
if [ $? -eq 0 ]; then
  echo "✅ Migration completed successfully"
else
  echo "❌ Migration failed - you can still use the application with the current error handling"
fi

exit 0
