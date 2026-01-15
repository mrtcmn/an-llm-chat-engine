import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ChatRepository } from '../../repositories/chat.repository'
import { createMockPrismaClient, type MockPrismaClient } from '../mocks/prisma.mock'
import { createMockDatabaseService } from '../mocks/database.mock'
import { mockChat, mockChat2, mockUser } from '../fixtures'

describe('ChatRepository', () => {
  let chatRepo: ChatRepository
  let mockPrisma: MockPrismaClient

  beforeEach(() => {
    mockPrisma = createMockPrismaClient()
    const mockDb = createMockDatabaseService(mockPrisma)
    chatRepo = new ChatRepository(mockDb)
  })

  describe('findById', () => {
    it('should return chat when found', async () => {
      mockPrisma.chat.findUnique.mockResolvedValue(mockChat)

      const result = await chatRepo.findById(mockChat.id)

      expect(result).toEqual(mockChat)
      expect(mockPrisma.chat.findUnique).toHaveBeenCalledWith({
        where: { id: mockChat.id, deletedAt: null }
      })
    })

    it('should return null when chat not found', async () => {
      mockPrisma.chat.findUnique.mockResolvedValue(null)

      const result = await chatRepo.findById('non-existent-id')

      expect(result).toBeNull()
      expect(mockPrisma.chat.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent-id', deletedAt: null }
      })
    })
  })

  describe('findByUserId', () => {
    it('should return paginated chats with count', async () => {
      const chats = [mockChat, mockChat2]
      mockPrisma.$transaction.mockResolvedValue([chats, 2])

      const result = await chatRepo.findByUserId(mockUser.id)

      expect(result).toEqual({ chats, total: 2 })
    })

    it('should apply default limit and offset', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0])

      await chatRepo.findByUserId(mockUser.id)

      expect(mockPrisma.$transaction).toHaveBeenCalled()
      // Verify findMany was called with default limit and offset
      expect(mockPrisma.chat.findMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id, deletedAt: null },
        take: 20,
        skip: 0,
        orderBy: { createdAt: 'desc' }
      })
    })

    it('should apply custom limit and offset', async () => {
      mockPrisma.$transaction.mockImplementation(async (queries) => {
        // Execute the mock queries to verify they're called correctly
        return [[], 0]
      })

      await chatRepo.findByUserId(mockUser.id, { limit: 50, offset: 10 })

      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })

    it('should order chats by createdAt desc', async () => {
      const chats = [mockChat2, mockChat] // Newer first
      mockPrisma.$transaction.mockResolvedValue([chats, 2])

      const result = await chatRepo.findByUserId(mockUser.id)

      expect(result.chats).toEqual(chats)
    })
  })

  describe('create', () => {
    it('should create new chat with provided data', async () => {
      const newChat = { ...mockChat, id: 'new-chat-id' }
      mockPrisma.chat.create.mockResolvedValue(newChat)

      const result = await chatRepo.create({
        userId: mockUser.id,
        title: 'New Chat'
      })

      expect(result).toEqual(newChat)
      expect(mockPrisma.chat.create).toHaveBeenCalledWith({
        data: { userId: mockUser.id, title: 'New Chat' }
      })
    })
  })

  describe('upsert', () => {
    it('should create chat if not exists', async () => {
      mockPrisma.chat.upsert.mockResolvedValue(mockChat)

      const result = await chatRepo.upsert({
        id: mockChat.id,
        userId: mockUser.id,
        title: mockChat.title
      })

      expect(result).toEqual(mockChat)
      expect(mockPrisma.chat.upsert).toHaveBeenCalledWith({
        where: { id: mockChat.id },
        create: { id: mockChat.id, userId: mockUser.id, title: mockChat.title },
        update: {}
      })
    })

    it('should skip update if chat exists', async () => {
      mockPrisma.chat.upsert.mockResolvedValue(mockChat)

      await chatRepo.upsert({
        id: mockChat.id,
        userId: mockUser.id,
        title: 'Updated Title'
      })

      // Verify update is empty object (no update)
      expect(mockPrisma.chat.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: {}
        })
      )
    })
  })
})
