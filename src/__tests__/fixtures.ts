// Test fixtures for unit tests

// User fixtures
export const mockUser = {
  id: "1b0bc859-f8dc-4305-8bca-a92bd9e1924f",
  email: "john.doe@example.com",
  name: "John Doe",
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: new Date("2024-01-01T00:00:00.000Z"),
};

export const mockUser2 = {
  id: "2c1cd960-g9ed-5406-9dcb-b03ce0f2035g",
  email: "jane.doe@example.com",
  name: "Jane Doe",
  createdAt: new Date("2024-01-02T00:00:00.000Z"),
  updatedAt: new Date("2024-01-02T00:00:00.000Z"),
};

// Chat fixtures
export const mockChat = {
  id: "chat-123",
  title: "Test Chat",
  userId: mockUser.id,
  createdAt: new Date("2024-01-01T10:00:00.000Z"),
  updatedAt: new Date("2024-01-01T10:00:00.000Z"),
  deletedAt: null,
};

export const mockChat2 = {
  id: "chat-456",
  title: "Another Chat",
  userId: mockUser.id,
  createdAt: new Date("2024-01-02T10:00:00.000Z"),
  updatedAt: new Date("2024-01-02T10:00:00.000Z"),
  deletedAt: null,
};

export const mockChatOwnedByUser2 = {
  id: "chat-789",
  title: "User 2 Chat",
  userId: mockUser2.id,
  createdAt: new Date("2024-01-03T10:00:00.000Z"),
  updatedAt: new Date("2024-01-03T10:00:00.000Z"),
  deletedAt: null,
};

// Message fixtures
export const mockUserMessage = {
  id: "msg-001",
  chatId: mockChat.id,
  role: "user",
  content: "Hello, how can you help me today?",
  metadata: null,
  createdAt: new Date("2024-01-01T10:01:00.000Z"),
  updatedAt: new Date("2024-01-01T10:01:00.000Z"),
  deletedAt: null,
};

export const mockAssistantMessage = {
  id: "msg-002",
  chatId: mockChat.id,
  role: "assistant",
  content: "Hello! I'm here to help. What would you like to know?",
  metadata: null,
  createdAt: new Date("2024-01-01T10:01:30.000Z"),
  updatedAt: new Date("2024-01-01T10:01:30.000Z"),
  deletedAt: null,
};

export const mockUserMessage2 = {
  id: "msg-003",
  chatId: mockChat.id,
  role: "user",
  content: "Tell me about TypeScript.",
  metadata: null,
  createdAt: new Date("2024-01-01T10:02:00.000Z"),
  updatedAt: new Date("2024-01-01T10:02:00.000Z"),
  deletedAt: null,
};

export const mockAssistantMessage2 = {
  id: "msg-004",
  chatId: mockChat.id,
  role: "assistant",
  content:
    "TypeScript is a strongly typed programming language that builds on JavaScript.",
  metadata: null,
  createdAt: new Date("2024-01-01T10:02:30.000Z"),
  updatedAt: new Date("2024-01-01T10:02:30.000Z"),
  deletedAt: null,
};

export const mockMessages = [
  mockUserMessage,
  mockAssistantMessage,
  mockUserMessage2,
  mockAssistantMessage2,
];

// AI Response fixtures
export const mockAIResponse = {
  content: "This is a mock AI response.",
  role: "assistant" as const,
  toolCalls: [],
};

export const mockAIResponseWithTools = {
  content: "I will search for that information.",
  role: "assistant" as const,
  toolCalls: [
    {
      name: "search",
      arguments: { query: "TypeScript" },
      result: { results: ["TypeScript is a language"] },
    },
  ],
};

// Stream chunk fixtures
export const mockStreamChunks = {
  start: { type: "start" as const },
  content1: { type: "content" as const, content: "Hello" },
  content2: { type: "content" as const, content: " world" },
  content3: { type: "content" as const, content: "!" },
  toolCall: {
    type: "tool_call" as const,
    toolCall: { name: "search", arguments: { query: "test" } },
  },
  toolResult: {
    type: "tool_result" as const,
    toolCall: { name: "search", result: "Search result" },
  },
  stepStart: {
    type: "step_start" as const,
    stepInfo: { stepType: "initial" as const },
  },
  stepFinish: {
    type: "step_finish" as const,
    stepInfo: {
      finishReason: "stop" as const,
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    },
  },
  done: { type: "done" as const },
  error: { type: "error" as const, error: "An error occurred" },
};

// Pagination fixtures
export const mockPaginationParams = {
  default: { limit: 20, offset: 0 },
  page2: { limit: 20, offset: 20, page: 2 },
  customLimit: { limit: 50, offset: 0 },
  withPage: { page: 3 },
};

export const mockPaginationResponse = {
  total: 100,
  page: 1,
  limit: 20,
  totalPages: 5,
  hasNext: true,
  hasPrevious: false,
};

// JWT payload fixture
export const mockJwtPayload = {
  sub: mockUser.id,
  email: mockUser.email,
  role: "user" as const,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
};

// Feature flag fixtures
export const mockFeatureFlags = {
  default: {
    streamingEnabled: true,
    paginationLimit: 20,
    aiToolsEnabled: true,
    chatHistoryEnabled: true,
  },
  streamingDisabled: {
    streamingEnabled: false,
    paginationLimit: 20,
    aiToolsEnabled: true,
    chatHistoryEnabled: true,
  },
  toolsDisabled: {
    streamingEnabled: true,
    paginationLimit: 20,
    aiToolsEnabled: false,
    chatHistoryEnabled: true,
  },
  historyDisabled: {
    streamingEnabled: true,
    paginationLimit: 20,
    aiToolsEnabled: true,
    chatHistoryEnabled: false,
  },
};

// Error fixtures
export const mockErrors = {
  notFound: {
    statusCode: 404,
    error: "Not Found",
    message: "Chat not found",
  },
  forbidden: {
    statusCode: 403,
    error: "Forbidden",
    message: "Access denied",
  },
  unauthorized: {
    statusCode: 401,
    error: "Unauthorized",
    message: "Authentication required",
  },
  badRequest: {
    statusCode: 400,
    error: "Bad Request",
    message: "Validation failed",
  },
  tooManyRequests: {
    statusCode: 429,
    error: "Too Many Requests",
    message: "Rate limit exceeded",
  },
};

// AI Message array fixture (for completion service)
export const mockAIMessages = [
  { role: "system" as const, content: "You are a helpful assistant." },
  { role: "user" as const, content: "Hello!" },
  { role: "assistant" as const, content: "Hi there! How can I help you?" },
  { role: "user" as const, content: "Tell me a joke." },
];

// Database config fixture
export const mockDbConfig = {
  host: "localhost",
  port: 5432,
  database: "test_db",
  user: "test_user",
  password: "test_password",
  ssl: false,
  min: 2,
  max: 10,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 30_000,
};
