import pino from 'pino'
import type { FastifyRequest, FastifyBaseLogger } from 'fastify'
import type { FeatureFlags } from '@config/feature-flags.config'
import type { BoundLogger } from './logger.types'

/**
 * LoggerService - Singleton for creating structured loggers
 * Wraps Pino with automatic context binding
 */
export class LoggerService {
  private static instance: LoggerService
  private baseLogger: pino.Logger | FastifyBaseLogger

  private constructor(logger?: pino.Logger | FastifyBaseLogger) {
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    this.baseLogger = logger || pino({
      level: process.env.LOG_LEVEL || 'info',
      transport: isDevelopment ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss.l',
          ignore: 'pid,hostname,environment',
          messageFormat: '{if service}[{service}]{end} {msg}',
          customColors: 'info:blue,warn:yellow,error:red,debug:magenta,trace:gray',
          levelFirst: true,
          singleLine: false,
        }
      } : undefined,
    })
  }

  /**
   * Initialize LoggerService with optional Pino logger
   * @param logger Optional Pino logger instance (e.g., from Fastify)
   */
  static initialize(logger?: pino.Logger | FastifyBaseLogger): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService(logger)
    }
    return LoggerService.instance
  }

  /**
   * Get singleton instance
   * Initializes with default Pino logger if not yet initialized
   */
  static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService()
    }
    return LoggerService.instance
  }

  /**
   * Create a service-bound logger with automatic context
   * @param serviceName Name of the service (e.g., "ConfigService", "PrismaService")
   * @param flags Optional feature flags to include in logs
   */
  forService(serviceName: string, flags?: Partial<FeatureFlags>): BoundLogger {
    const bindings: Record<string, unknown> = {
      service: serviceName,
      environment: process.env.NODE_ENV || 'development',
    }

    if (flags && Object.keys(flags).length > 0) {
      bindings.featureFlags = flags
    }

    const childLogger = this.baseLogger.child(bindings)
    return new BoundLoggerImpl(childLogger)
  }

  /**
   * Create a request-bound logger with request context
   * @param req Fastify request object
   * @param serviceName Optional service name override
   */
  forRequest(req: FastifyRequest, serviceName?: string): BoundLogger {
    const bindings: Record<string, unknown> = {
      requestId: req.id,
      correlationId: req.correlationId,
      environment: process.env.NODE_ENV || 'development',
    }

    if (serviceName) {
      bindings.service = serviceName
    }

    if (req.user) {
      bindings.userId = req.user.sub
    }

    if (req.clientType) {
      bindings.clientType = req.clientType
    }

    if (req.appCheck?.verified && req.appCheck.appId) {
      bindings.firebase = {
        appId: req.appCheck.appId,
        appName: req.appCheck.appName,
      }
    }

    const childLogger = this.baseLogger.child(bindings)
    return new BoundLoggerImpl(childLogger)
  }

  /**
   * Direct access to base logger (for advanced use cases)
   */
  getBaseLogger(): pino.Logger | FastifyBaseLogger {
    return this.baseLogger
  }
}

/**
 * BoundLogger implementation - wraps Pino logger with consistent API
 */
class BoundLoggerImpl implements BoundLogger {
  constructor(private logger: pino.Logger | FastifyBaseLogger) {}

  info(message: string, context?: Record<string, unknown>): void {
    if (context) {
      this.logger.info(context, message)
    } else {
      this.logger.info(message)
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (context) {
      this.logger.warn(context, message)
    } else {
      this.logger.warn(message)
    }
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    const errorContext: Record<string, unknown> = {
      ...(context || {}),
    }

    if (error) {
      errorContext.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }
    }

    this.logger.error(errorContext, message)
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (context) {
      this.logger.debug(context, message)
    } else {
      this.logger.debug(message)
    }
  }

  child(bindings: Record<string, unknown>): BoundLogger {
    return new BoundLoggerImpl(this.logger.child(bindings))
  }
}
