# HomeSpec

HomeSpec is an advanced home documentation platform that enables comprehensive tracking and management of home finishes, materials, and project details with robust digital record-keeping capabilities for homeowners and service professionals.

## Technology Stack

- **Frontend**:
  - React with TypeScript
  - Framer Motion for animations
  - TanStack Query for data fetching
  - Tailwind CSS with shadcn/ui components
  - Wouter for routing

- **Backend**:
  - Express.js server
  - Supabase for authentication and storage
  - PostgreSQL database with Drizzle ORM
  - Type-safe API using shared TypeScript types

## Features

- User authentication and authorization
- Project and room management
- Item tracking with history and versioning
- Image and document uploads
- Interactive tutorial system with animated mascot
- Responsive design

## Local Development Setup (VS Code)

### Prerequisites

- Node.js (v18+ recommended)
- PostgreSQL database
- VS Code with recommended extensions:
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features
  - Tailwind CSS IntelliSense

### Initial Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd homespec
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Update the following variables:
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/homespec

# Supabase (Create a new project at supabase.com)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Session
SESSION_SECRET=your_random_secret_key

# Server
PORT=5000
```

### Database Setup

1. Create a PostgreSQL database:
```sql
CREATE DATABASE homespec;
```

2. Push the schema to your database:
```bash
npm run db:push
```

### Running the Application

1. Start the development server:
```bash
npm run dev
```

2. Open `http://localhost:5000` in your browser

### VS Code Debugging

Launch configurations are provided in `.vscode/launch.json` for debugging both frontend and backend:

1. Backend Debugging:
   - Set breakpoints in your Express routes
   - Use the "Launch Server" configuration
   - Server will start in debug mode

2. Frontend Debugging:
   - Use Chrome DevTools or React Developer Tools
   - Source maps are enabled for TypeScript debugging
   - Set breakpoints directly in VS Code

### Building for Production

1. Create production build:
```bash
npm run build
```

2. Start production server:
```bash
npm start
```

## Project Structure

```
├── client/                # Frontend React application
│   ├── src/
│   │   ├── components/   # Reusable React components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utility functions and configurations
│   │   └── pages/        # Page components
├── migrations/           # Database migration files
├── server/              # Backend Express application
├── shared/              # Shared TypeScript types and schemas
└── package.json
```

## Development Guidelines

- Follow the TypeScript type definitions in `shared/schema.ts`
- Use Drizzle ORM for database operations
- Keep the backend thin, with business logic in the frontend
- Use TanStack Query for data fetching and caching
- Follow shadcn/ui component patterns

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.