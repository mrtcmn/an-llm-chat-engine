import { describe, it, expect, beforeEach } from 'vitest'
import { UserRepository } from '../../repositories/user.repository'
import { createMockPrismaClient, type MockPrismaClient } from '../mocks/prisma.mock'
import { createMockDatabaseService } from '../mocks/database.mock'
import { mockUser, mockUser2 } from '../fixtures'

describe('UserRepository', () => {
  let userRepo: UserRepository
  let mockPrisma: MockPrismaClient

  beforeEach(() => {
    mockPrisma = createMockPrismaClient()
    const mockDb = createMockDatabaseService(mockPrisma)
    userRepo = new UserRepository(mockDb)
  })

  describe('findById', () => {
    it('should return user when found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)

      const result = await userRepo.findById(mockUser.id)

      expect(result).toEqual(mockUser)
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id }
      })
    })

    it('should return null when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const result = await userRepo.findById('non-existent-id')

      expect(result).toBeNull()
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' }
      })
    })
  })

  describe('findByEmail', () => {
    it('should return user when email found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)

      const result = await userRepo.findByEmail(mockUser.email)

      expect(result).toEqual(mockUser)
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: mockUser.email }
      })
    })

    it('should return null when email not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const result = await userRepo.findByEmail('nonexistent@example.com')

      expect(result).toBeNull()
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'nonexistent@example.com' }
      })
    })

    it('should handle different users correctly', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockUser2)

      const result1 = await userRepo.findByEmail(mockUser.email)
      const result2 = await userRepo.findByEmail(mockUser2.email)

      expect(result1).toEqual(mockUser)
      expect(result2).toEqual(mockUser2)
    })
  })
})
