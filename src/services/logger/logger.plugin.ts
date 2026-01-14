import type { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import fp from 'fastify-plugin'
import { LoggerService, BoundLogger } from '@utils/logger'

declare module 'fastify' {
  interface FastifyInstance {
    loggerService: LoggerService
  }
  interface FastifyRequest {
    logger: BoundLogger
  }
}

const loggerPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Initialize LoggerService with Fastify's Pino logger instance
  const loggerService = LoggerService.initialize(fastify.log)

  // Decorate Fastify instance with LoggerService
  fastify.decorate('loggerService', loggerService)

  // Add onRequest hook to decorate each request with a custom logger
  fastify.addHook('onRequest', async (req: FastifyRequest) => {
    req.logger = loggerService.forRequest(req)
  })

  // Add response logging hook with enhanced context
  fastify.addHook('onResponse', async (req: FastifyRequest, reply: FastifyReply) => {
    const responseTime = reply.elapsedTime
    const statusCode = reply.statusCode

    // Build comprehensive log context
    const logData: Record<string, unknown> = {
      method: req.method,
      url: req.url,
      statusCode,
      responseTime,
      
      // Request metadata
      requestId: req.id,
      correlationId: req.correlationId,
      
      // Client information
      clientType: req.clientType,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      
      // Feature flags from config (if available)
      featureFlags: fastify.config ? {
        streamingEnabled: fastify.config.getFeatureFlag('streamingEnabled'),
        paginationLimit: fastify.config.getFeatureFlag('paginationLimit'),
        aiToolsEnabled: fastify.config.getFeatureFlag('aiToolsEnabled'),
        chatHistoryEnabled: fastify.config.getFeatureFlag('chatHistoryEnabled'),
      } : undefined,
      
      // Environment info
      environment: process.env.NODE_ENV || 'development',
      appName: process.env.APP_NAME,
      
      // User context (if authenticated)
      userId: req.user?.sub,
    }

    // Filter out undefined values for cleaner logs
    Object.keys(logData).forEach(key => {
      if (logData[key] === undefined) {
        delete logData[key]
      }
    })

    // Log at appropriate level based on status code
    if (statusCode >= 500) {
      req.logger.error('Request completed with server error', undefined, logData)
    } else if (statusCode >= 400) {
      req.logger.warn('Request completed with client error', logData)
    }
  })

  fastify.log.info('[LoggerPlugin] Structured logging service initialized with response logging')
}

export default fp(loggerPlugin, {
  name: 'logger-plugin',
  fastify: '5.x',
  dependencies: ['config-plugin'],
})
