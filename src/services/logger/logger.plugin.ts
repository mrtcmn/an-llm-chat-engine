import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify'
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

  fastify.log.info('[LoggerPlugin] Structured logging service initialized')
}

export default fp(loggerPlugin, {
  name: 'logger-plugin',
  fastify: '5.x',
  dependencies: ['config-plugin'],
})
