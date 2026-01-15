# LLM Chat Engine

A production-ready chat engine powered by LLMs, built with Fastify, Prisma, and OpenAI.

## Getting Started

### Prerequisites

- Node.js 24
- Docker & Docker Compose
- PostgreSQL (via Docker)

### Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and configure your OpenAI API key and other settings.

3. **Start PostgreSQL database**
   ```bash
   docker compose up -d
   ```
   This will start PostgreSQL on **port 5432** with the following credentials:
   - Database: `chatdb`
   - User: `chatuser`
   - Password: `chatpassword`

4. **Generate Prisma client**
   ```bash
   npm run prisma:generate
   ```

5. **Run database migrations**
   ```bash
   npm run prisma:migrate
   ```

6. **Seed the database** (create mock users)
   ```bash
   npm run prisma:seed
   ```

7. **Start development server**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3000`

## Project Structure

```
an-llm-chat-engine/
├── src/
│   ├── config/          # Configuration files and environment setup
│   ├── middleware/      # Fastify middleware (auth, error handling, etc.)
│   ├── repositories/    # Data access layer (Prisma repositories)
│   ├── routes/          # API route handlers
│   ├── schemas/         # Zod validation schemas
│   ├── services/        # Business logic and AI integrations
│   │   └── ai/          # AI strategy implementations
│   ├── utils/           # Utility functions
│   ├── generated/       # Auto-generated files
│   ├── __tests__/       # Test files
│   └── server.ts        # Application entry point
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── seed.ts          # Database seeding script
├── docker-compose.yml   # PostgreSQL container configuration
└── package.json
```

## Testing

Run tests with:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm test` | Run tests |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run database migrations |
| `npm run prisma:studio` | Open Prisma Studio (database GUI) |
| `npm run prisma:seed` | Seed database with sample data |

## Environment Variables

Key environment variables (see `.env.example` for full list):

- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 3000)
- `OPENAI_API_KEY` - Your OpenAI API key
- `JWT_SECRET` - Secret key for JWT token signing
- `STREAMING_ENABLED` - Enable/disable streaming responses
- `CHAT_HISTORY_ENABLED` - Enable/disable chat history

## API Documentation

Once the server is running, navigate to:

**`http://localhost:3000/docs`**

This provides a Swagger/OpenAPI interface with Scalar UI for better developer experience.

#### Known Issues

- **SSE Routes**: When testing Server-Sent Events (SSE) endpoints in Scalar UI, the second trigger may not display in the UI. To verify SSE responses, check the Network tab in browser DevTools

### Getting Started with API

1. **Get JWT Token**: Visit `/api/auth/jwt/test` to obtain a test JWT token
2. **Authenticate**: Use the token in the Authorization header for protected routes
3. **Test Endpoints**: Try out all available endpoints directly from the docs


## Tech Stack

- **Framework**: Fastify
- **Database**: PostgreSQL
- **ORM**: Prisma 7
- **AI**: OpenAI API with Vercel AI SDK
- **Validation**: Zod
- **Authentication**: JWT
- **Testing**: Vitest
- **Runtime**: Node.js with TypeScript
