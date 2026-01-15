import { describe, it, expect, beforeEach } from 'vitest'
import { MessageRepository } from '../../repositories/message.repository'
import { createMockPrismaClient, type MockPrismaClient } from '../mocks/prisma.mock'
import { createMockDatabaseService } from '../mocks/database.mock'
import { mockChat, mockUserMessage, mockAssistantMessage, mockMessages } from '../fixtures'

describe('MessageRepository', () => {
  let messageRepo: MessageRepository
  let mockPrisma: MockPrismaClient

  beforeEach(() => {
    mockPrisma = createMockPrismaClient()
    const mockDb = createMockDatabaseService(mockPrisma)
    messageRepo = new MessageRepository(mockDb)
  })

  describe('findByChatId', () => {
    it('should return all messages ordered by createdAt asc', async () => {
      mockPrisma.message.findMany.mockResolvedValue(mockMessages)

      const result = await messageRepo.findByChatId(mockChat.id)

      expect(result).toEqual(mockMessages)
      expect(mockPrisma.message.findMany).toHaveBeenCalledWith({
        where: { chatId: mockChat.id, deletedAt: null },
        orderBy: { createdAt: 'asc' }
      })
    })

    it('should apply limit when provided', async () => {
      const limitedMessages = mockMessages.slice(0, 2)
      mockPrisma.message.findMany.mockResolvedValue(limitedMessages)

      const result = await messageRepo.findByChatId(mockChat.id, { limit: 2 })

      expect(result).toEqual(limitedMessages)
      expect(mockPrisma.message.findMany).toHaveBeenCalledWith({
        where: { chatId: mockChat.id, deletedAt: null },
        orderBy: { createdAt: 'asc' },
        take: 2
      })
    })

    it('should return empty array when no messages exist', async () => {
      mockPrisma.message.findMany.mockResolvedValue([])

      const result = await messageRepo.findByChatId('empty-chat-id')

      expect(result).toEqual([])
    })

    it('should not include take when limit is not provided', async () => {
      mockPrisma.message.findMany.mockResolvedValue(mockMessages)

      await messageRepo.findByChatId(mockChat.id)

      expect(mockPrisma.message.findMany).toHaveBeenCalledWith({
        where: { chatId: mockChat.id, deletedAt: null },
        orderBy: { createdAt: 'asc' }
      })
      // Verify no 'take' key in the call
      const callArgs = mockPrisma.message.findMany.mock.calls[0][0]
      expect(callArgs).not.toHaveProperty('take')
    })
  })

  describe('create', () => {
    it('should create message with chatId, role, and content', async () => {
      const newMessage = { ...mockUserMessage, id: 'new-msg-id' }
      mockPrisma.message.create.mockResolvedValue(newMessage)

      const result = await messageRepo.create({
        chatId: mockChat.id,
        role: 'user',
        content: 'Hello!'
      })

      expect(result).toEqual(newMessage)
      expect(mockPrisma.message.create).toHaveBeenCalledWith({
        data: {
          chatId: mockChat.id,
          role: 'user',
          content: 'Hello!'
        }
      })
    })

    it('should create assistant message', async () => {
      const newMessage = { ...mockAssistantMessage, id: 'new-assistant-msg' }
      mockPrisma.message.create.mockResolvedValue(newMessage)

      const result = await messageRepo.create({
        chatId: mockChat.id,
        role: 'assistant',
        content: 'How can I help?'
      })

      expect(result).toEqual(newMessage)
      expect(mockPrisma.message.create).toHaveBeenCalledWith({
        data: {
          chatId: mockChat.id,
          role: 'assistant',
          content: 'How can I help?'
        }
      })
    })
  })
})
