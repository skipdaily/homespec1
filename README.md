# HomeSpec Backend Architecture

## Overview
The backend is built with Express.js and integrates with Supabase for authentication and PostgreSQL for data storage.

### Key Components

1. **Server Setup** (`server/index.ts`)
- Express.js server configuration
- JSON request parsing
- Request logging middleware
- Error handling middleware
- Serves both API and static frontend files

2. **Database Connection** (`server/db.ts`)
- PostgreSQL connection using Neon's serverless driver
- Drizzle ORM configuration
- Connection pooling for better performance

3. **API Routes** (`server/routes.ts`)
- RESTful endpoints for projects, rooms, and items
- Authentication middleware using Supabase
- Request validation using Zod schemas
- Error handling for database operations

4. **Storage Layer** (`server/storage.ts`)
- Database operations abstraction
- Implements CRUD operations for all entities
- Type-safe using TypeScript interfaces

### Database Schema

The database includes the following tables:
- `projects`: Stores construction projects
- `rooms`: Contains rooms within projects
- `items`: Stores items/materials within rooms

Each table includes:
- UUID primary keys
- Created/updated timestamps
- Row Level Security (RLS) policies
- Foreign key relationships

### Authentication

Authentication is handled by Supabase Auth, which provides:
- Email/password authentication
- Session management
- Row Level Security integration
- User management

### API Endpoints

```typescript
// Project endpoints
GET    /api/projects         - Get all projects for user
POST   /api/projects         - Create a new project

// Room endpoints
GET    /api/rooms/:id        - Get room details
POST   /api/rooms            - Create a new room
GET    /api/rooms/:id/items  - Get items in a room

// Item endpoints
POST   /api/rooms/:id/items  - Create a new item
```

Each endpoint includes:
- Input validation
- Error handling
- Type safety
- Authentication checks
