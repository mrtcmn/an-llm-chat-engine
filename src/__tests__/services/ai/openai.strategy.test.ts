import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the external dependencies
vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn().mockReturnValue(vi.fn().mockReturnValue({ name: 'mock-model' }))
}))

vi.mock('ai', () => ({
  generateText: vi.fn().mockResolvedValue({
    text: 'Mock AI response',
    toolCalls: [],
    toolResults: [],
    usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    finishReason: 'stop'
  }),
  streamText: vi.fn().mockReturnValue({
    fullStream: (async function* () {
      yield { type: 'text-delta', textDelta: 'Hello ' }
      yield { type: 'text-delta', textDelta: 'world!' }
    })(),
    toolResults: Promise.resolve([])
  })
}))

vi.mock('@utils/logger', () => ({
  LoggerService: {
    getInstance: vi.fn().mockReturnValue({
      forService: vi.fn().mockReturnValue({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn()
      })
    })
  }
}))

// Mock ToolRegistry
vi.mock('../../../services/ai/tool-library', () => ({
  ToolRegistry: class MockToolRegistry {
    getTools() {
      return {}
    }
  }
}))

import { OpenAIProvider } from '../../../services/ai/strategies/openai.strategy'
import { generateText, streamText } from 'ai'
import type { AIMessage } from '../../../services/ai/ai.types'

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider

  beforeEach(() => {
    vi.clearAllMocks()
    provider = new OpenAIProvider('test-api-key')
  })

  describe('constructor', () => {
    it('should have name "openai"', () => {
      expect(provider.name).toBe('openai')
    })
  })

  describe('complete', () => {
    const messages: AIMessage[] = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello!' }
    ]

    it('should return AI response with content', async () => {
      const result = await provider.complete(messages)

      expect(result.content).toBe('Mock AI response')
      expect(result.role).toBe('assistant')
    })

    it('should use default model when not specified', async () => {
      await provider.complete(messages)

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          maxTokens: 2048
        })
      )
    })

    it('should pass custom model from options', async () => {
      await provider.complete(messages, { model: 'gpt-4' })

      expect(generateText).toHaveBeenCalled()
    })

    it('should pass maxTokens from options', async () => {
      await provider.complete(messages, { maxTokens: 1000 })

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          maxTokens: 1000
        })
      )
    })

    it('should include tool calls when present', async () => {
      vi.mocked(generateText).mockResolvedValueOnce({
        text: 'I will search for that.',
        toolCalls: [
          { toolCallId: 'tc-1', toolName: 'search', args: { query: 'test' } }
        ],
        toolResults: [
          { toolCallId: 'tc-1', toolName: 'search', result: 'Search result' }
        ],
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        finishReason: 'tool-calls'
      } as any)

      const result = await provider.complete(messages, { tools: true })

      expect(result.toolCalls).toHaveLength(1)
      expect(result.toolCalls![0].name).toBe('search')
      expect(result.toolCalls![0].result).toBe('Search result')
    })

    it('should throw on error', async () => {
      vi.mocked(generateText).mockRejectedValueOnce(new Error('API Error'))

      await expect(provider.complete(messages)).rejects.toThrow('API Error')
    })
  })

  describe('stream', () => {
    const messages: AIMessage[] = [
      { role: 'user', content: 'Hello!' }
    ]

    beforeEach(() => {
      // Reset the streamText mock to return a fresh generator
      vi.mocked(streamText).mockReturnValue({
        fullStream: (async function* () {
          yield { type: 'text-delta', textDelta: 'Hello ' }
          yield { type: 'text-delta', textDelta: 'world!' }
        })(),
        toolResults: Promise.resolve([])
      } as any)
    })

    it('should yield start chunk', async () => {
      const chunks = []
      for await (const chunk of provider.stream(messages)) {
        chunks.push(chunk)
      }

      expect(chunks[0].type).toBe('start')
    })

    it('should yield content chunks from text-delta', async () => {
      const chunks = []
      for await (const chunk of provider.stream(messages)) {
        chunks.push(chunk)
      }

      const contentChunks = chunks.filter(c => c.type === 'content')
      expect(contentChunks).toHaveLength(2)
      expect(contentChunks[0].content).toBe('Hello ')
      expect(contentChunks[1].content).toBe('world!')
    })

    it('should yield done chunk at end', async () => {
      const chunks = []
      for await (const chunk of provider.stream(messages)) {
        chunks.push(chunk)
      }

      expect(chunks[chunks.length - 1].type).toBe('done')
    })

    it('should yield tool_call chunks', async () => {
      vi.mocked(streamText).mockReturnValueOnce({
        fullStream: (async function* () {
          yield { type: 'tool-call', toolCallId: 'tc-1', toolName: 'search', args: { query: 'test' } }
        })(),
        toolResults: Promise.resolve([
          { toolCallId: 'tc-1', toolName: 'search', result: 'Result' }
        ])
      } as any)

      const chunks = []
      for await (const chunk of provider.stream(messages, { tools: true })) {
        chunks.push(chunk)
      }

      const toolCallChunks = chunks.filter(c => c.type === 'tool_call')
      expect(toolCallChunks).toHaveLength(1)
      expect(toolCallChunks[0].toolCall?.name).toBe('search')
    })

    it('should yield tool_result chunks', async () => {
      vi.mocked(streamText).mockReturnValueOnce({
        fullStream: (async function* () {
          yield { type: 'tool-call', toolCallId: 'tc-1', toolName: 'search', args: { query: 'test' } }
        })(),
        toolResults: Promise.resolve([
          { toolCallId: 'tc-1', toolName: 'search', result: 'Search Result' }
        ])
      } as any)

      const chunks = []
      for await (const chunk of provider.stream(messages, { tools: true })) {
        chunks.push(chunk)
      }

      const toolResultChunks = chunks.filter(c => c.type === 'tool_result')
      expect(toolResultChunks).toHaveLength(1)
      expect(toolResultChunks[0].toolCall?.result).toBe('Search Result')
    })

    it('should yield step_start and step_finish', async () => {
      vi.mocked(streamText).mockReturnValueOnce({
        fullStream: (async function* () {
          yield { type: 'step-start' }
          yield { type: 'text-delta', textDelta: 'Hello' }
          yield { type: 'step-finish', finishReason: 'stop', usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 } }
        })(),
        toolResults: Promise.resolve([])
      } as any)

      const chunks = []
      for await (const chunk of provider.stream(messages)) {
        chunks.push(chunk)
      }

      expect(chunks.some(c => c.type === 'step_start')).toBe(true)
      expect(chunks.some(c => c.type === 'step_finish')).toBe(true)
    })

    it('should handle errors gracefully', async () => {
      vi.mocked(streamText).mockReturnValueOnce({
        fullStream: (async function* () {
          yield { type: 'error', error: 'Stream failed' }
        })(),
        toolResults: Promise.resolve([])
      } as any)

      const chunks = []
      for await (const chunk of provider.stream(messages)) {
        chunks.push(chunk)
      }

      const errorChunks = chunks.filter(c => c.type === 'error')
      expect(errorChunks).toHaveLength(1)
      expect(errorChunks[0].error).toBe('Stream failed')
    })
  })
})
