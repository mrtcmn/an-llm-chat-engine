/**
 * Application Constants
 * 
 * This file contains non-configurable constants that are part of the application logic.
 * These values should NOT be in environment variables as they are application-level decisions.
 * 
 * Environment variables (env.config.ts) should only contain:
 * - Infrastructure configuration (DB URLs, ports)
 * - Secrets (API keys, JWT secrets)
 * - Environment-specific behavior toggles
 */

/**
 * API Configuration
 */
export const API = {
  VERSION: 'v1',
  PREFIX: '/api',
  DOCS_PATH: '/docs',
  HEALTH_PATH: '/health',
} as const

/**
 * Authentication & Authorization
 */
export const AUTH = {
  // JWT Configuration
  JWT_ALGORITHM: 'HS256' as const,
  ACCESS_TOKEN_EXPIRY: '7d',
  REFRESH_TOKEN_EXPIRY: '30d',
  
  // Token validation
  MIN_SECRET_LENGTH: 16,
  RECOMMENDED_SECRET_LENGTH: 32,
  
  // Bearer token format
  BEARER_PREFIX: 'Bearer ',
} as const

/**
 * Rate Limiting Configuration
 * These are application-level limits, not environment-specific
 */
export const RATE_LIMITS = {
  // IP-based rate limiting (prevents DDoS)
  IP: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 500,
  },
  
  // User-based rate limiting
  USER: {
    WINDOW_MS: 60 * 1000, // 1 minute
    MAX_REQUESTS: 60,
  },
  
  // Per-route rate limiting
  ROUTE: {
    WINDOW_MS: 60 * 1000, // 1 minute
    MAX_REQUESTS: 20,
  },
} as const

/**
 * Database Configuration
 */
export const DATABASE = {
  // Connection pool defaults
  DEFAULT_POOL_MIN: 2,
  DEFAULT_POOL_MAX: 10,
  
  // Timeouts
  DEFAULT_CONNECTION_TIMEOUT: 30000, // 30 seconds
  DEFAULT_IDLE_TIMEOUT: 10000, // 10 seconds
  DEFAULT_QUERY_TIMEOUT: 30000, // 30 seconds
  
  // Retry configuration
  DEFAULT_MAX_RETRY_ATTEMPTS: 5,
  DEFAULT_RETRY_BASE_DELAY: 1000, // 1 second
  MAX_RETRY_BASE_DELAY: 30000, // 30 seconds
  
  // Health check
  DEFAULT_HEALTH_CHECK_INTERVAL: 30000, // 30 seconds
  MIN_HEALTH_CHECK_INTERVAL: 5000, // 5 seconds
  MAX_HEALTH_CHECK_INTERVAL: 300000, // 5 minutes
} as const

/**
 * Pagination Configuration
 */
export const PAGINATION = {
  MIN_LIMIT: 1,
  MAX_LIMIT: 100,
  DEFAULT_LIMIT: 20,
  DEFAULT_OFFSET: 0,
} as const

/**
 * Request/Response Configuration
 */
export const REQUEST = {
  // Timeouts
  DEFAULT_TIMEOUT: 30000, // 30 seconds
  AI_REQUEST_TIMEOUT: 120000, // 2 minutes for AI operations
  STREAM_TIMEOUT: 180000, // 3 minutes for streaming
  
  // Size limits
  MAX_PAYLOAD_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_JSON_SIZE: 1024 * 1024, // 1MB
  
  // Headers
  CORRELATION_ID_HEADER: 'x-correlation-id',
  REQUEST_ID_HEADER: 'x-request-id',
} as const

/**
 * Streaming Configuration
 */
export const STREAMING = {
  CHUNK_SIZE: 1024, // bytes
  BUFFER_SIZE: 8192, // bytes
  FLUSH_INTERVAL: 100, // ms
  KEEP_ALIVE_INTERVAL: 15000, // 15 seconds
} as const

/**
 * Validation Rules
 */
export const VALIDATION = {
  // Message validation
  MAX_MESSAGE_LENGTH: 10000,
  MIN_MESSAGE_LENGTH: 1,
  
  // Chat validation
  MAX_CHAT_TITLE_LENGTH: 100,
  MIN_CHAT_TITLE_LENGTH: 1,
  
  // User validation
  MAX_USERNAME_LENGTH: 50,
  MIN_USERNAME_LENGTH: 2,
  MAX_EMAIL_LENGTH: 255,
  
  // Common patterns
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  UUID_REGEX: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
} as const

/**
 * AI Provider Configuration
 */
export const AI = {
  // Model constraints
  DEFAULT_MAX_TOKENS: 2000,
  MIN_MAX_TOKENS: 1,
  MAX_MAX_TOKENS: 4096,
  
  // Temperature
  DEFAULT_TEMPERATURE: 0.7,
  MIN_TEMPERATURE: 0.0,
  MAX_TEMPERATURE: 2.0,
  
  // Context
  DEFAULT_CONTEXT_WINDOW: 4096,
  MAX_CONTEXT_WINDOW: 128000,
  
  // Retry configuration
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
  BACKOFF_MULTIPLIER: 2,
  
  // Streaming
  STREAM_CHUNK_DELIMITER: '\n',
  STREAM_EVENT_PREFIX: 'data: ',
} as const

/**
 * OpenAI Specific Configuration
 */
export const OPENAI = {
  MODELS: {
    GPT_4: 'gpt-4',
    GPT_4_TURBO: 'gpt-4-turbo-preview',
    GPT_35_TURBO: 'gpt-3.5-turbo',
  },
  
  API_VERSION: 'v1',
  BASE_URL: 'https://api.openai.com/v1',
  
  // API Key validation
  API_KEY_PREFIX: 'sk-',
  MIN_API_KEY_LENGTH: 20,
} as const

/**
 * HTTP Status Codes
 */
export const HTTP_STATUS = {
  // Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  
  // Redirection
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,
  
  // Client Errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  
  // Server Errors
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const

/**
 * Error Codes
 */
export const ERROR_CODES = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  
  // Server Errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  
  // Database
  DATABASE_ERROR: 'DATABASE_ERROR',
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  QUERY_TIMEOUT: 'QUERY_TIMEOUT',
  
  // AI Provider
  AI_PROVIDER_ERROR: 'AI_PROVIDER_ERROR',
  AI_TIMEOUT: 'AI_TIMEOUT',
  INVALID_AI_RESPONSE: 'INVALID_AI_RESPONSE',
} as const

/**
 * Logging Configuration
 */
export const LOGGING = {
  LEVELS: {
    FATAL: 60,
    ERROR: 50,
    WARN: 40,
    INFO: 30,
    DEBUG: 20,
    TRACE: 10,
  },
  
  // Sensitive fields to redact in logs
  REDACTED_FIELDS: [
    'password',
    'token',
    'secret',
    'apiKey',
    'authorization',
    'cookie',
    'jwt',
    'creditCard',
    'ssn',
  ],
  
  // Log message truncation
  MAX_LOG_LENGTH: 10000,
} as const

/**
 * Date/Time Formats
 */
export const DATE_FORMATS = {
  ISO_8601: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
  DATE_ONLY: 'YYYY-MM-DD',
  TIME_ONLY: 'HH:mm:ss',
  DISPLAY: 'MMM DD, YYYY HH:mm',
} as const

/**
 * Cache Configuration
 */
export const CACHE = {
  DEFAULT_TTL: 300, // 5 minutes in seconds
  SHORT_TTL: 60, // 1 minute
  LONG_TTL: 3600, // 1 hour
  MAX_TTL: 86400, // 24 hours
  
  // Cache key prefixes
  PREFIXES: {
    USER: 'user:',
    CHAT: 'chat:',
    MESSAGE: 'message:',
    SESSION: 'session:',
    RATE_LIMIT: 'rl:',
  },
} as const

/**
 * Environment Types
 */
export const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test',
  STAGING: 'staging',
} as const

/**
 * Client Types
 */
export const CLIENT_TYPES = {
  WEB: 'web',
  MOBILE: 'mobile',
  DESKTOP: 'desktop',
  API: 'api',
  UNKNOWN: 'unknown',
} as const

/**
 * Message Roles
 */
export const MESSAGE_ROLES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
} as const

/**
 * Export all constants as a single object for convenience
 */
export const CONSTANTS = {
  API,
  AUTH,
  RATE_LIMITS,
  DATABASE,
  PAGINATION,
  REQUEST,
  STREAMING,
  VALIDATION,
  AI,
  OPENAI,
  HTTP_STATUS,
  ERROR_CODES,
  LOGGING,
  DATE_FORMATS,
  CACHE,
  ENVIRONMENTS,
  CLIENT_TYPES,
  MESSAGE_ROLES,
} as const

// Type-safe constant access
export type Constants = typeof CONSTANTS
