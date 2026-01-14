import { z } from "zod";
import 'dotenv/config'

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
  // Database
  DATABASE_URL: z.string().url(),
  DB_POOL_MIN: z.coerce.number().default(2),
  DB_POOL_MAX: z.coerce.number().default(10),
  DB_CONNECTION_TIMEOUT: z.coerce.number().default(30000),
  DB_IDLE_TIMEOUT: z.coerce.number().default(10000),

  // Database Connection Retry
  DB_MAX_RETRY_ATTEMPTS: z.coerce.number().default(5),
  DB_RETRY_BASE_DELAY: z.coerce.number().default(1000),
  
  // Database Health Check
  DB_HEALTH_CHECK_INTERVAL: z.coerce.number().default(30000), // 30 seconds
  DB_HEALTH_CHECK_ENABLED: booleanString(true),

  // Server
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // JWT
  JWT_SECRET: z.string().min(16),

  // OpenAI
  OPENAI_API_KEY: z.string().startsWith("sk-"),

  // Feature Flags
  STREAMING_ENABLED: booleanString(true),
  PAGINATION_LIMIT: z.coerce.number().default(20),
  AI_TOOLS_ENABLED: booleanString(false),
  CHAT_HISTORY_ENABLED: booleanString(true),
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
