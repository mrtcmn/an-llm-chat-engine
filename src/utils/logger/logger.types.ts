import type { FeatureFlags } from "@config/feature-flags.schema";
import type { FastifyRequest } from "fastify";

/**
 * Base structured log context - always included
 */
export interface BaseLogContext {
  service: string;
  environment: string;
}

/**
 * Request context - included when logging from request handlers
 */
export interface RequestLogContext {
  requestId: string;
  correlationId: string;
  userId?: string;
  clientType?: string;
  method?: string;
  url?: string;
  ip?: string;
}

/**
 * Feature flags context - only included if service uses these flags
 */
export interface FeatureFlagsContext {
  flags: Partial<FeatureFlags>;
}

/**
 * Business context - domain-specific data
 */
export interface BusinessLogContext {
  chatId?: string;
  messageId?: string;
  operation?: string;
  duration?: number;
  [key: string]: unknown;
}

/**
 * AI/Model context - for tracking AI operations
 */
export interface AILogContext {
  provider?: string;
  model?: string;
  messageCount?: number;
  toolsEnabled?: boolean;
  maxTokens?: number;
  contentLength?: number;
  toolCallCount?: number;
  finishReason?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

/**
 * Full structured log context
 */
export interface StructuredLogContext {
  base?: BaseLogContext;
  request?: RequestLogContext;
  featureFlags?: FeatureFlagsContext;
  business?: BusinessLogContext;
  ai?: AILogContext;
  error?: ErrorLogContext;
  metadata?: Record<string, unknown>;
}

/**
 * Error context for structured error logging
 */
export interface ErrorLogContext {
  name: string;
  message: string;
  stack?: string;
  code?: string;
  category?: string;
}

/**
 * Log levels supported by Pino
 */
export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

/**
 * Logger binding options for creating service-bound loggers
 */
export interface LoggerBindOptions {
  serviceName: string;
  featureFlags?: Partial<FeatureFlags>;
}

/**
 * Options for creating child loggers
 */
export interface ChildLoggerOptions {
  request?: FastifyRequest;
  bindings?: Record<string, unknown>;
}

/**
 * Bound logger interface - provides logging methods with automatic context
 */
export interface BoundLogger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(
    message: string,
    error?: Error,
    context?: Record<string, unknown>
  ): void;
  debug(message: string, context?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): BoundLogger;
}
