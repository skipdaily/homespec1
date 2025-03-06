# VS Code Migration Guide for HomeSpec

## Pre-migration Checklist

1. Ensure you have copied all the files from Replit to your local machine
2. Verify you have Node.js v18+ installed locally
3. Install PostgreSQL on your local machine
4. Copy the `.env` file with the correct credentials

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

## Additional Notes

- The application uses TypeScript with strict mode enabled
- Frontend hot reloading is configured through Vite
- Source maps are enabled for better debugging experience
- Tailwind CSS is configured with shadcn/ui components
