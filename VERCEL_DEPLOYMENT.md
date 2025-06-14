# Vercel Deployment Instructions

This file contains important instructions for deploying this application to Vercel.

## Required Environment Variables

Please make sure the following environment variables are set in your Vercel project settings:

```
VITE_SUPABASE_URL=https://dxzsvrxwpfqddatmelzb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4enN2cnh3cGZxZGRhdG1lbHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk3Njc0OTQsImV4cCI6MjA1NTM0MzQ5NH0.sOWDKWEN2DVEgCpdbHy7b8xYW4zTI71C4oirhczgPYM
NODE_ENV=production
FRONTEND_URL=https://homespec-skipdaily.vercel.app

# Required for AI Chat functionality
OPENAI_API_KEY=your-openai-api-key-here

# Required for database operations (use your Supabase connection string)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.dxzsvrxwpfqddatmelzb.supabase.co:5432/postgres?sslmode=require

# Session secret for authentication
SESSION_SECRET=your-production-session-secret-change-this
```

**Important**: 
- Replace `your-openai-api-key-here` with your actual OpenAI API key
- Replace `[PASSWORD]` in the DATABASE_URL with your Supabase database password
- The AI chat functionality will not work without the OPENAI_API_KEY
- Database operations require the DATABASE_URL to be set

## Build Settings

Ensure the following settings are configured in Vercel:

1. Build Command: `npm run build`
2. Output Directory: `dist/public`
3. Install Command: `npm install`

## Framework Preset

Set the Framework Preset to "Vite" in your Vercel project settings.

## Deployment Troubleshooting

If you encounter a blank page after deployment:

1. Check browser console for errors
2. Verify environment variables are correctly set
3. Make sure the Vercel deployment is using Node.js 18 or higher
4. Ensure the latest commit is being deployed (check build logs for correct commit hash)

## Recent Changes

- Simplified build process to remove env.js dependency
- Added hardcoded fallbacks for Supabase credentials
- Removed problematic script tag that was causing bundling issues
