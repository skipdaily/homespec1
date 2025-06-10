#!/bin/bash

# Run the migration to add finishes table
echo "🔄 Running migration to add finishes and finish_history tables..."

# Get the database URL from .env file
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo "❌ .env file not found"
  exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not found in .env file"
  exit 1
fi

# Run the migration
echo "🔄 Connecting to database..."
psql "$DATABASE_URL" -f migrations/009_add_finishes_tables.sql

# Check if the migration was successful
if [ $? -eq 0 ]; then
  echo "✅ Migration completed successfully"
else
  echo "❌ Migration failed - check the error message above"
fi

# Exit with the same status as the psql command
exit $?
