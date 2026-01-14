import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import { ChatRepository, MessageRepository } from '../../repositories'
import { ChatService } from './chat.service'
import { CompletionService } from './completion.service'
import { ResponseStrategyPlugin } from './response-strategy.plugin'

declare module 'fastify' {
  interface FastifyInstance {
    chatService: ChatService
    completionService: CompletionService
  }
}

const chatServicePlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.log.info('[ChatServicePlugin] Initializing chat services...')

  const config = fastify.config
  const db = fastify.db

  const chatRepo = new ChatRepository(db)
  const messageRepo = new MessageRepository(db)

  const chatService = new ChatService(chatRepo, messageRepo, config)
  const responseStrategy = new ResponseStrategyPlugin(config, messageRepo)
  const completionService = new CompletionService(chatService, messageRepo, config, responseStrategy)

  fastify.decorate('chatService', chatService)
  fastify.decorate('completionService', completionService)

  fastify.log.info('[ChatServicePlugin] Chat services registered')
}

export default fp(chatServicePlugin, {
  name: 'chat-service-plugin',
  fastify: '5.x',
  dependencies: ['config-plugin', 'database-plugin'],
})
