import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import { ChatRepository } from '../../repositories/chat.repository'
import { MessageRepository } from '../../repositories/message.repository'
import { UserRepository } from '../../repositories/user.repository'
import { ChatService } from './chat.service'
import { CompletionService } from './completion.service'
import { ResponseStrategyPlugin } from './response-strategy.plugin'
import type { PrismaService } from '../database/prisma.service'

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
  const prismaService = db.getStrategy<PrismaService>()
  const prisma = prismaService.client

  const chatRepo = new ChatRepository(prisma)
  const messageRepo = new MessageRepository(prisma)
  const userRepo = new UserRepository(prisma)

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
