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

## Testing the API

After completing the Quick Start steps, you can test the API using the interactive documentation:

### 1. Navigate to API Documentation

Open your browser and go to:

**`http://localhost:3000/docs`**

This provides a Swagger/OpenAPI interface with Scalar UI for testing all endpoints.

### 2. Obtain JWT Token for Authentication

Protected routes require JWT authentication. To get a test token:

1. In the API docs, find the **`/api/auth/jwt/test`** endpoint
2. Click **"Send"** to execute the request
3. Copy the JWT token from the response

**Example response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
}
```

### 3. Authenticate in Scalar UI

1. At the top of the Scalar UI, look for the **"Authentication"** section
2. Paste the JWT token you copied to **"Bearer Token"** area

Now all your requests will include the authentication header automatically.

### 5. Feature Flags Configuration

The application behavior can be controlled via environment variables (feature flags):

- **`STREAMING_ENABLED`** (default: `true`) - Enable/disable Server-Sent Events streaming
- **`PAGINATION_LIMIT`** (default: `20`) - Maximum items per page (10-100)
- **`AI_TOOLS_ENABLED`** (default: `true`) - Enable/disable AI function calling
- **`CHAT_HISTORY_ENABLED`** (default: `true`) - Enable/disable chat history in AI context

To modify these settings, edit your `.env` file. For a complete list of available environment variables and their defaults, check the `.env.example` file.

**App will detect .env file changes on runtime.


### Known Issues on Scalar UI

- **SSE Routes**: When testing Server-Sent Events (SSE) endpoints in Scalar UI, the response may not display correctly in the UI. To verify SSE responses, check the Network tab in browser DevTools.

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
- `STREAMING_ENABLED` - Enable/disable streaming responses (default: `true`)
- `PAGINATION_LIMIT` - Maximum items per page (default: `20`)
- `AI_TOOLS_ENABLED` - Enable/disable AI function calling (default: `false`)
- `CHAT_HISTORY_ENABLED` - Enable/disable chat history (default: `true`)


## Tech Stack

- **Framework**: Fastify
- **Database**: PostgreSQL
- **ORM**: Prisma 7
- **AI**: OpenAI API with Vercel AI SDK
- **Validation**: Zod
- **Authentication**: JWT
- **Testing**: Vitest
- **Runtime**: Node.js with TypeScript
