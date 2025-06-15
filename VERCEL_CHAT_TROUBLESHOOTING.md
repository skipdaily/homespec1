# Vercel Chat API Troubleshooting Guide

This guide will help you debug the "API request failed: 500" error in your Vercel deployment.

## 🔍 Step 1: Check Environment Variables

Visit your Vercel dashboard and verify these environment variables are set correctly:

### Required Variables:
- `OPENAI_API_KEY` - Should start with `sk-proj-` or `sk-`
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key
- `DATABASE_URL` - Your Supabase database connection string
- `SESSION_SECRET` - A random secret for sessions
- `FRONTEND_URL` - Your Vercel app URL (e.g., `https://homespec-skipdaily.vercel.app`)

## 🔧 Step 2: Test API Configuration

### Option A: Use Debug Endpoints (Recommended)

After deploying the latest code, visit these URLs in your browser:

1. **General Status Check:**
   ```
   https://homespec-skipdaily.vercel.app/api/debug/status
   ```
   This will show:
   - Environment setup
   - Whether API keys are present
   - Storage configuration

2. **OpenAI API Check:**
   ```
   https://homespec-skipdaily.vercel.app/api/debug/openai
   ```
   This will test:
   - API key format
   - OpenAI API connectivity
   - Available models

### Option B: Check Browser Console

1. Open your app in the browser
2. Open Developer Tools (F12)
3. Go to the Console tab
4. Try to send a chat message
5. Look for detailed error logs

## 🚨 Common Issues & Solutions

### Issue 1: "OpenAI API key is required"
**Cause:** API key not set in Vercel environment variables  
**Solution:** Add `OPENAI_API_KEY` in Vercel dashboard

### Issue 2: "Invalid OpenAI API key format"
**Cause:** API key doesn't start with `sk-`  
**Solution:** Check that you copied the complete API key from OpenAI

### Issue 3: "OpenAI API returned 401: Unauthorized"
**Cause:** Invalid or expired API key  
**Solutions:**
- Regenerate your OpenAI API key
- Check your OpenAI account billing status
- Verify the key has proper permissions

### Issue 4: "OpenAI API returned 429: Rate Limit"
**Cause:** Too many requests to OpenAI API  
**Solutions:**
- Wait a few minutes and try again
- Upgrade your OpenAI plan if needed

### Issue 5: "API request failed: 500" with no specific error
**Cause:** Generic server error  
**Solutions:**
- Check Vercel function logs
- Verify all environment variables are set
- Redeploy the application

## 📊 Step 3: Check Vercel Function Logs

1. Go to your Vercel dashboard
2. Click on your project
3. Go to the "Functions" tab
4. Look for error logs in the serverless function logs

## 🔄 Step 4: Redeploy

After verifying environment variables:

1. Go to Vercel dashboard
2. Navigate to your project
3. Go to "Deployments" tab
4. Click "Redeploy" on the latest deployment

## 🧪 Step 5: Local Testing

You can test the same configuration locally:

```bash
# Run the API test script
node test-vercel-api.js

# Start the development server
npm run dev
```

## 📞 Getting More Help

If you're still having issues:

1. **Check the debug endpoints** (Step 2A above) - they'll give you specific error details
2. **Look at Vercel function logs** for detailed error messages
3. **Use the browser console** to see client-side errors
4. **Run the local test script** to verify your API key works

## 🎯 Quick Fix Checklist

- [ ] Environment variables are set in Vercel
- [ ] OpenAI API key starts with `sk-`
- [ ] OpenAI account has billing enabled
- [ ] Latest code is deployed to Vercel
- [ ] Debug endpoints show "OK" status
- [ ] Vercel function logs don't show errors

Most issues are resolved by ensuring the `OPENAI_API_KEY` environment variable is correctly set in Vercel with a valid API key.
