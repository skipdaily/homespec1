# Vercel Deployment Instructions

This file contains important instructions for deploying this application to Vercel.

## Required Environment Variables

Please make sure the following environment variables are set in your Vercel project settings:

```
VITE_SUPABASE_URL=https://dxzsvrxwpfqddatmelzb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4enN2cnh3cGZxZGRhdG1lbHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk3Njc0OTQsImV4cCI6MjA1NTM0MzQ5NH0.sOWDKWEN2DVEgCpdbHy7b8xYW4zTI71C4oirhczgPYM
NODE_ENV=production
FRONTEND_URL=https://homespec-skipdaily.vercel.app
```

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
