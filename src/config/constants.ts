/**
 * Application Constants
 *
 * This file contains non-configurable constants that are part of the application logic.
 * These values should NOT be in environment variables as they are application-level decisions.
 *
 * Environment variables (env.config.ts) should only contain:
 * - Infrastructure configuration (DB URLs, ports)
 * - Secrets (API keys, JWT secrets)
 */

/**
 * API Configuration
 */
export const API = {
  PREFIX: "/api",
  DOCS_PATH: "/docs",
  HEALTH_PATH: "/health",
} as const;

/**
 * Authentication & Authorization
 */
export const AUTH = {
  ACCESS_TOKEN_EXPIRY: "7d",

  // Token validation
  MIN_SECRET_LENGTH: 16,
} as const;

/**
 * Rate Limiting Configuration
 * These are application-level limits, at least for now :), not environment-specific
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
} as const;

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

  // Retry configuration
  DEFAULT_MAX_RETRY_ATTEMPTS: 5,
  DEFAULT_RETRY_BASE_DELAY: 1000, // 1 second

  // Health check
  DEFAULT_HEALTH_CHECK_INTERVAL: 30000, // 30 seconds
} as const;

/**
 * Pagination Configuration
 */
export const PAGINATION = {
  MIN_LIMIT: 1,
  MAX_LIMIT: 100,
  DEFAULT_LIMIT: 20,
} as const;

/**
 * Request/Response Configuration
 */
export const REQUEST = {
  // Timeouts
  DEFAULT_TIMEOUT: 180_000, // 30 seconds

  // Size limits
  MAX_PAYLOAD_SIZE: 10 * 1024 * 1024, // 10MB

  // Headers
  CORRELATION_ID_HEADER: "x-correlation-id",
  REQUEST_ID_HEADER: "x-request-id",
} as const;

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
} as const;

/**
 * Error Codes
 */
export const ERROR_CODES = {
  // Authentication & Authorization
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  INVALID_TOKEN: "INVALID_TOKEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",

  // Validation
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",

  // Resources
  NOT_FOUND: "NOT_FOUND",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  CONFLICT: "CONFLICT",

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",

  // Server Errors
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",

  // Database
  DATABASE_ERROR: "DATABASE_ERROR",
  CONNECTION_ERROR: "CONNECTION_ERROR",
  QUERY_TIMEOUT: "QUERY_TIMEOUT",

  // AI Provider
  AI_PROVIDER_ERROR: "AI_PROVIDER_ERROR",
  AI_TIMEOUT: "AI_TIMEOUT",
  INVALID_AI_RESPONSE: "INVALID_AI_RESPONSE",
} as const;


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
  HTTP_STATUS,
  ERROR_CODES,
} as const;

// Type-safe constant access
export type Constants = typeof CONSTANTS;
