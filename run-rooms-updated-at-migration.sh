#!/bin/bash

# Script to run the room updated_at migration
echo "🔄 Running migration to add updated_at column to rooms table..."

# Set the database URL from .env file
export $(grep -v '^#' .env | xargs)

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not found in .env file"
  exit 1
fi

# Run the migration
psql "$DATABASE_URL" -f migrations/008_add_rooms_updated_at.sql

# Check if the migration was successful
if [ $? -eq 0 ]; then
  echo "✅ Migration completed successfully"
else
  echo "❌ Migration failed"
fi

exit 0
