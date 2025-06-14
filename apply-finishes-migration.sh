#!/bin/bash

# Script to run the finishes migration
echo "🔄 Running migration to add finishes tables..."

# Read DATABASE_URL from .env file
export DATABASE_URL=$(grep DATABASE_URL .env | cut -d '=' -f2-)

# Check if DATABASE_URL was found
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not found in .env file"
  exit 1
fi

# Run the migration using psql with full output
echo "📊 Connecting to database..."
psql "$DATABASE_URL" -f migrations/009_add_finishes_tables.sql 

# Check if the migration was successful
if [ $? -eq 0 ]; then
  echo "✅ Migration completed successfully"
else
  echo "❌ Migration failed"
  exit 1
fi

exit 0
