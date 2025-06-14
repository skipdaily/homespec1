# HomeSpecTracker Production Configuration Guide

## Overview
This document provides instructions for configuring HomeSpecTracker for production deployment.

## Database Setup

1. **Supabase Configuration**
   - Create a Supabase project at https://supabase.com
   - Set up the database using the schema provided in `migrations/001_initial_schema.sql`
   - Obtain your Supabase URL and API keys

2. **Environment Variables**
   - Update the `.env` file with your production settings:
   ```
   # Production Environment Variables
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

   # Database Configuration (Production)
   DATABASE_URL=postgres://postgres.your-project-id:password@db.your-project-id.supabase.co:5432/postgres

   # LLM API Keys (Production)
   OPENAI_API_KEY=your-actual-openai-api-key
   ANTHROPIC_API_KEY=your-actual-anthropic-api-key
   GEMINI_API_KEY=your-actual-gemini-api-key

   # Server Configuration
   PORT=4000
   NODE_ENV=production
   ```

3. **Database Migration**
   - Run the database migrations:
   ```bash
   npm run migrate
   ```

## LLM Provider Configuration

1. **OpenAI**
   - Create an account at https://openai.com
   - Generate an API key
   - Add the key to the `.env` file

2. **Anthropic (Optional)**
   - If you want to use Claude, create an account at https://anthropic.com
   - Generate an API key
   - Add the key to the `.env` file

3. **Google Gemini (Optional)**
   - If you want to use Gemini, create an account at https://ai.google.dev
   - Generate an API key
   - Add the key to the `.env` file

## Deployment

### Option 1: Vercel Deployment

1. **Vercel Setup**
   - Create a Vercel account and connect your repository
   - Configure the environment variables in the Vercel dashboard
   - Use the following build settings:
     - Build Command: `npm run build`
     - Output Directory: `dist`
     - Install Command: `npm install`

2. **Vercel Environment Variables**
   - Add all the environment variables from your `.env` file to Vercel

### Option 2: Self-Hosted Deployment

1. **Build the Application**
   ```bash
   npm run build
   ```

2. **Start the Production Server**
   ```bash
   npm start
   ```

## Security Considerations

1. **API Keys**
   - Keep your API keys secure
   - Do not commit them to version control
   - Use environment variables for configuration

2. **Database Access**
   - Configure database roles and permissions properly
   - Use row-level security in Supabase for enhanced protection

3. **Authentication**
   - Implement proper authentication mechanisms
   - Set up CORS properly to prevent unauthorized access

## Monitoring and Maintenance

1. **Logging**
   - Set up proper logging for the application
   - Monitor error logs regularly

2. **Backups**
   - Configure regular database backups
   - Test backup restoration procedures

3. **Updates**
   - Keep dependencies updated
   - Apply security patches promptly

## Support and Troubleshooting

If you encounter issues with your production deployment:

1. Check the server logs for error messages
2. Verify that all environment variables are correctly set
3. Ensure the database is accessible and properly configured
4. Test API endpoints using tools like Postman or curl

For additional support, please refer to the project documentation or contact the development team.
