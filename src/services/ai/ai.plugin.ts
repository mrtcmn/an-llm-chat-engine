import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import { AIService } from './ai.service'
import { OpenAIProvider } from './strategies'
import type { AIProvider } from './ai.types'

declare module 'fastify' {
  interface FastifyInstance {
    ai: AIService
  }
}

/**
 * AI Plugin
 * Initializes AI service with providers via DI pattern
 *
 * Default setup uses OpenAI as primary provider.
 * Future: Add more providers for failover/load balancing
 */
const aiPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Get config from Fastify instance (DI pattern)
  const config = fastify.config

  fastify.log.info('[AIPlugin] Initializing AI service...')

  // Create providers (inject config)
  const providers: AIProvider[] = []

  // OpenAI provider (primary)
  const openaiApiKey = config.get('OPENAI_API_KEY')
  const openaiProvider = new OpenAIProvider(openaiApiKey)
  providers.push(openaiProvider)

  // Future: Add more providers here
  // const anthropicApiKey = config.get('ANTHROPIC_API_KEY')
  // if (anthropicApiKey) {
  //   providers.push(new AnthropicProvider(anthropicApiKey))
  // }

  // Initialize AI service with providers
  const aiService = AIService.initialize(providers)

  // Log registered providers
  const providerNames = aiService.getProviderNames()
  fastify.log.info(
    { providers: providerNames },
    '[AIPlugin] AI service initialized with providers'
  )

  // Decorate Fastify instance with AI service
  fastify.decorate('ai', aiService)

  fastify.log.info('[AIPlugin] AI plugin registered')
}

export default fp(aiPlugin, {
  name: 'ai-plugin',
  fastify: '5.x',
  dependencies: ['config-plugin'], // Explicitly declare dependency on config plugin
})
