import { z } from "zod";
import 'dotenv/config'
import { DATABASE, AUTH } from './constants'

/**
 * Environment Configuration
 * 
 * This file defines ONLY environment-specific configuration that:
 * 1. Varies between environments (dev, staging, production)
 * 2. Contains secrets or sensitive data (API keys, DB credentials)
 * 3. Requires infrastructure-level configuration (URLs, ports)
 * 
 * Application constants (timeouts, limits, validation rules) belong in constants.ts
 * 
 * Guidelines:
 * - Use environment variables for: secrets, URLs, connection strings, ports
 * - Use constants for: business logic values, validation rules, retry policies
 */

// Helper to properly parse boolean environment variables
const booleanString = (defaultValue: boolean) => 
  z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined) return defaultValue;
      const normalized = val.toLowerCase().trim();
      return normalized === 'true' || normalized === '1' || normalized === 'yes';
    });

export const envSchema = z.object({
  // ==========================================
  // DATABASE CONFIGURATION (Infrastructure)
  // ==========================================
  // Connection string - MUST be environment-specific
  DATABASE_URL: z.string().url({
    message: "DATABASE_URL must be a valid PostgreSQL connection string"
  }),
  
  // Pool configuration - can be tuned per environment
  DB_POOL_MIN: z.coerce.number().default(DATABASE.DEFAULT_POOL_MIN),
  DB_POOL_MAX: z.coerce.number().default(DATABASE.DEFAULT_POOL_MAX),
  DB_CONNECTION_TIMEOUT: z.coerce.number().default(DATABASE.DEFAULT_CONNECTION_TIMEOUT),
  DB_IDLE_TIMEOUT: z.coerce.number().default(DATABASE.DEFAULT_IDLE_TIMEOUT),

  // Database Connection Retry - uses constants as defaults
  DB_MAX_RETRY_ATTEMPTS: z.coerce.number().default(DATABASE.DEFAULT_MAX_RETRY_ATTEMPTS),
  DB_RETRY_BASE_DELAY: z.coerce.number().default(DATABASE.DEFAULT_RETRY_BASE_DELAY),
  
  // Database Health Check - environment-specific behavior
  DB_HEALTH_CHECK_INTERVAL: z.coerce.number().default(DATABASE.DEFAULT_HEALTH_CHECK_INTERVAL),
  DB_HEALTH_CHECK_ENABLED: booleanString(true),

  // ==========================================
  // SERVER CONFIGURATION (Infrastructure)
  // ==========================================
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z
    .enum(["development", "production", "test", "staging"])
    .default("development"),
  
  // Host binding (useful for Docker/Kubernetes)
  HOST: z.string().default("0.0.0.0"),

  // ==========================================
  // AUTHENTICATION (Secrets)
  // ==========================================
  // JWT secret MUST be unique per environment and kept secure
  JWT_SECRET: z.string().min(AUTH.MIN_SECRET_LENGTH, {
    message: `JWT_SECRET must be at least ${AUTH.MIN_SECRET_LENGTH} characters`
  }),

  // ==========================================
  // AI PROVIDER CONFIGURATION (Secrets)
  // ==========================================
  // OpenAI API key - MUST be kept secure
  OPENAI_API_KEY: z.string().startsWith("sk-", {
    message: "OPENAI_API_KEY must start with 'sk-'"
  }),
  
  // Optional: AI provider selection (for future multi-provider support)
  AI_PROVIDER: z.enum(["openai", "anthropic", "azure"]).default("openai"),

  // ==========================================
  // FEATURE FLAGS (Environment-specific behavior)
  // ==========================================
  // These control environment-specific features, not business logic
  STREAMING_ENABLED: booleanString(true),
  PAGINATION_LIMIT: z.coerce.number()
    .min(10)
    .max(100)
    .default(20),
  AI_TOOLS_ENABLED: booleanString(false),
  CHAT_HISTORY_ENABLED: booleanString(true),
  
  // ==========================================
  // OPTIONAL: MONITORING & OBSERVABILITY
  // ==========================================
  // Log level per environment
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  
  // Enable request logging
  REQUEST_LOGGING_ENABLED: booleanString(true),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues.map(
      (issue) => `  - ${issue.path.join(".")}: ${issue.message}`,
    );
    throw new Error(`Environment validation failed:\n${errors.join("\n")}`);
  }

  return result.data;
}
