import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ResponseStrategyPlugin } from '../../../services/chat/response-strategy.plugin'
import { createMockConfigService, type MockConfigService } from '../../mocks/config.mock'
import { createMockRequest, createMockReply } from '../../mocks/fastify.mock'
import { mockChat } from '../../fixtures'
import type { AIMessage, AICompletionOptions } from '../../../services/ai/ai.types'

// Mock the strategies module
vi.mock('../../../services/chat/strategies', () => ({
  streamingStrategy: vi.fn().mockResolvedValue({ content: 'Streaming response' }),
  regularStrategy: vi.fn().mockResolvedValue({ content: 'Regular response', role: 'assistant' })
}))

import { streamingStrategy, regularStrategy } from '../../../services/chat/strategies'

// Mock MessageRepository
function createMockMessageRepo() {
  return {
    findByChatId: vi.fn(),
    create: vi.fn().mockResolvedValue({ id: 'msg-id', chatId: mockChat.id, role: 'assistant', content: 'test' })
  }
}

describe('ResponseStrategyPlugin', () => {
  let responseStrategy: ResponseStrategyPlugin
  let mockConfig: MockConfigService
  let mockMessageRepo: ReturnType<typeof createMockMessageRepo>
  let mockReq: ReturnType<typeof createMockRequest>
  let mockReply: ReturnType<typeof createMockReply>

  const messages: AIMessage[] = [
    { role: 'system', content: 'You are helpful' },
    { role: 'user', content: 'Hello' }
  ]

  const aiOptions: AICompletionOptions = { tools: true }

  beforeEach(() => {
    vi.clearAllMocks()
    mockConfig = createMockConfigService()
    mockMessageRepo = createMockMessageRepo()
    mockReq = createMockRequest()
    mockReply = createMockReply()

    responseStrategy = new ResponseStrategyPlugin(
      mockConfig as any,
      mockMessageRepo as any
    )
  })

  describe('execute', () => {
    it('should use streaming strategy when flag is true', async () => {
      mockConfig.getFeatureFlag.mockReturnValue(true)

      await responseStrategy.execute(
        mockReq as any,
        mockReply as any,
        mockChat.id,
        messages,
        aiOptions
      )

      expect(streamingStrategy).toHaveBeenCalledWith(
        mockReq,
        mockReply,
        mockChat.id,
        messages,
        aiOptions
      )
      expect(regularStrategy).not.toHaveBeenCalled()
    })

    it('should use regular strategy when flag is false', async () => {
      mockConfig.getFeatureFlag.mockReturnValue(false)

      await responseStrategy.execute(
        mockReq as any,
        mockReply as any,
        mockChat.id,
        messages,
        aiOptions
      )

      expect(regularStrategy).toHaveBeenCalledWith(
        mockReq,
        mockReply,
        mockChat.id,
        messages,
        aiOptions
      )
      expect(streamingStrategy).not.toHaveBeenCalled()
    })

    it('should save assistant message after streaming', async () => {
      mockConfig.getFeatureFlag.mockReturnValue(true)
      vi.mocked(streamingStrategy).mockResolvedValue({ content: 'Streamed content' })

      await responseStrategy.execute(
        mockReq as any,
        mockReply as any,
        mockChat.id,
        messages,
        aiOptions
      )

      expect(mockMessageRepo.create).toHaveBeenCalledWith({
        chatId: mockChat.id,
        role: 'assistant',
        content: 'Streamed content'
      })
    })

    it('should save assistant message after regular response', async () => {
      mockConfig.getFeatureFlag.mockReturnValue(false)
      vi.mocked(regularStrategy).mockResolvedValue({ content: 'Regular content', role: 'assistant' })

      await responseStrategy.execute(
        mockReq as any,
        mockReply as any,
        mockChat.id,
        messages,
        aiOptions
      )

      expect(mockMessageRepo.create).toHaveBeenCalledWith({
        chatId: mockChat.id,
        role: 'assistant',
        content: 'Regular content'
      })
    })

    it('should return reply for streaming strategy', async () => {
      mockConfig.getFeatureFlag.mockReturnValue(true)

      const result = await responseStrategy.execute(
        mockReq as any,
        mockReply as any,
        mockChat.id,
        messages,
        aiOptions
      )

      expect(result).toBe(mockReply)
    })

    it('should return response for regular strategy', async () => {
      mockConfig.getFeatureFlag.mockReturnValue(false)
      const mockResponse = { content: 'Test', role: 'assistant' as const }
      vi.mocked(regularStrategy).mockResolvedValue(mockResponse)

      const result = await responseStrategy.execute(
        mockReq as any,
        mockReply as any,
        mockChat.id,
        messages,
        aiOptions
      )

      expect(result).toBe(mockResponse)
    })

    it('should pass correct params to streaming strategy', async () => {
      mockConfig.getFeatureFlag.mockReturnValue(true)
      const customOptions = { tools: false, model: 'gpt-4' }

      await responseStrategy.execute(
        mockReq as any,
        mockReply as any,
        'custom-chat-id',
        messages,
        customOptions
      )

      expect(streamingStrategy).toHaveBeenCalledWith(
        mockReq,
        mockReply,
        'custom-chat-id',
        messages,
        customOptions
      )
    })

    it('should pass correct params to regular strategy', async () => {
      mockConfig.getFeatureFlag.mockReturnValue(false)
      const customOptions = { tools: true, maxTokens: 500 }

      await responseStrategy.execute(
        mockReq as any,
        mockReply as any,
        'custom-chat-id',
        messages,
        customOptions
      )

      expect(regularStrategy).toHaveBeenCalledWith(
        mockReq,
        mockReply,
        'custom-chat-id',
        messages,
        customOptions
      )
    })
  })
})
