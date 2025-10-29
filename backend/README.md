# Healthpack Backend

Express.js backend API with SQLite database using Drizzle ORM.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file (copy from `.env.example` if needed):
```
PORT=3001
DATABASE_PATH=./database.db
NODE_ENV=development
```

3. Run migrations:
```bash
npm run db:migrate
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run db:generate` - Generate database migrations
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Drizzle Studio (database GUI)

## API Endpoints

### Health Check
- `GET /health` - Server health check

### Users
- `POST /api/users` - Register a new user
  - Body: `{ email: string, name: string, password: string }`
  - Returns: Created user (password excluded)
  
- `GET /api/users/:id` - Get user by ID
  - Returns: User object (password excluded)

## Database

The database is SQLite and will be created automatically in the backend directory as `database.db`.

### Schema

**users** table:
- `id` - Integer primary key (auto-increment)
- `email` - Text (unique, not null)
- `name` - Text (not null)
- `password` - Text (hashed with Argon2, not null)
- `createdAt` - Timestamp
- `updatedAt` - Timestamp

## Adding New Tables

1. Add schema to `src/db/schema.ts`
2. Generate migration: `npm run db:generate`
3. Run migration: `npm run db:migrate`

## Development

The server runs on `http://localhost:3001` by default.

Make sure CORS is configured properly if calling from the frontend on a different port.


