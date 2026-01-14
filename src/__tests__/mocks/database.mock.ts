import { vi } from 'vitest'
import type { DatabaseService } from '../../services/database/database.service'
import type { PrismaService } from '../../services/database/prisma.service'
import { createMockPrismaClient, type MockPrismaClient } from './prisma.mock'

export function createMockDatabaseService(mockPrisma?: MockPrismaClient): DatabaseService {
  const prismaClient = mockPrisma || createMockPrismaClient()
  
  const mockPrismaService: PrismaService = {
    client: prismaClient as any,
    connect: vi.fn(),
    disconnect: vi.fn(),
    reconnect: vi.fn(),
    healthCheck: vi.fn(),
    isConnected: vi.fn(),
  } as any

  const mockDb: DatabaseService = {
    getStrategy: vi.fn().mockReturnValue(mockPrismaService),
    connect: vi.fn(),
    disconnect: vi.fn(),
    reconnect: vi.fn(),
    healthCheck: vi.fn(),
    isConnected: vi.fn(),
  } as any

  return mockDb
}
