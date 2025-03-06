# VS Code Migration Guide for HomeSpec

## Pre-migration Checklist

1. Ensure you have copied all the files from Replit to your local machine
2. Verify you have Node.js v18+ installed locally
3. Install PostgreSQL on your local machine
4. Copy the following `.env` file with the working credentials:

```env
# Database Configuration
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/homespec"

# Supabase Configuration
SUPABASE_URL="https://pnwqvfvhbxjkljdxxhom.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBud3F2ZnZoYnhqa2xqZHh4aG9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk3NTA0NjAsImV4cCI6MjAyNTMyNjQ2MH0.tZ7JFUDLgQvfJUsJ1AyKp9FJPLbP5ykpDLyL4Jt0uWE"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBud3F2ZnZoYnhqa2xqZHh4aG9tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcwOTc1MDQ2MCwiZXhwIjoyMDI1MzI2NDYwfQ.xq2RzgUaCoTpgS-pAMhqpkjlP8c6ZnQKXNYzTOaR3wM"

# Session Configuration
SESSION_SECRET="super-secure-session-secret-for-homespec-2025"

# Server Configuration
PORT=5000

# Optional Configuration
NODE_ENV="development"
```

## Setup Steps

### 1. Database Setup

```sql
CREATE DATABASE homespec;
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Migration

```bash
npm run db:push
```

### 4. VS Code Extensions

Install the following extensions:
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Tailwind CSS IntelliSense

### 5. Debugging Setup

The project includes pre-configured launch configurations in `.vscode/launch.json`:
- "Launch Server": Starts the Express backend in debug mode
- "Launch Chrome": Attaches the debugger to Chrome for frontend debugging
- "Full Stack Debug": Runs both configurations simultaneously

## Development Workflow

1. Start the development server:
```bash
npm run dev
```

2. Access the application at `http://localhost:5000`

3. For debugging:
   - Use the "Full Stack Debug" launch configuration
   - Set breakpoints in VS Code
   - Use Chrome DevTools for frontend debugging

## Verification Steps

1. **Database Connection**
   - Run `npm run dev`
   - Verify no database connection errors in the console
   - Try creating a new project or room to test database writes

2. **Frontend Assets**
   - Check if all styles are loading correctly
   - Verify if images and icons are displaying
   - Test if all animations are working

3. **Authentication**
   - Test login functionality
   - Verify protected routes are working
   - Check if Supabase authentication is connected

4. **File Uploads**
   - Test image uploads to verify Supabase storage connection
   - Verify document uploads are working
   - Check if uploaded files are accessible

## Common Issues and Solutions

1. **Port Already in Use**
   - Check if another process is using port 5000
   - Change the PORT in .env if needed

2. **Database Connection Issues**
   - Verify PostgreSQL is running
   - Check DATABASE_URL in .env
   - Ensure database exists and is accessible

3. **Node Modules Issues**
   - Delete node_modules and package-lock.json
   - Run `npm install` again

4. **TypeScript Errors**
   - Run `npm run build` to check for type errors
   - Verify tsconfig.json settings are correct
   - Check if all dependencies are properly installed

5. **Supabase Connection Issues**
   - Verify Supabase credentials in .env
   - Check if Supabase project is active
   - Ensure storage buckets are properly configured

## Additional Notes

- The application uses TypeScript with strict mode enabled
- Frontend hot reloading is configured through Vite
- Source maps are enabled for better debugging experience
- Tailwind CSS is configured with shadcn/ui components

## Migration Completion Checklist

- [ ] All files copied from Replit
- [ ] Environment variables set correctly
- [ ] Database created and migrated
- [ ] Dependencies installed
- [ ] VS Code extensions installed
- [ ] Development server running
- [ ] Database connections verified
- [ ] Frontend assets loading
- [ ] Authentication working
- [ ] File uploads functioning
- [ ] All tests passing (if applicable)