import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockConfigService, type MockConfigService } from '../../mocks/config.mock'

// Create mock instances that we can access in tests
const mockPrismaClientInstance = {
  $connect: vi.fn().mockResolvedValue(undefined),
  $disconnect: vi.fn().mockResolvedValue(undefined),
  $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]),
  $transaction: vi.fn()
}

const mockPoolInstance = {
  end: vi.fn().mockResolvedValue(undefined),
  connect: vi.fn().mockResolvedValue({
    query: vi.fn(),
    release: vi.fn()
  })
}

// Mock the modules
vi.mock('@prisma/client', () => {
  return {
    PrismaClient: class MockPrismaClient {
      $connect = vi.fn().mockResolvedValue(undefined)
      $disconnect = vi.fn().mockResolvedValue(undefined)
      $queryRaw = vi.fn().mockResolvedValue([{ 1: 1 }])
      $transaction = vi.fn()
    }
  }
})

vi.mock('@prisma/adapter-pg', () => {
  return {
    PrismaPg: class MockPrismaPg {
      constructor() {}
    }
  }
})

vi.mock('pg', () => {
  return {
    default: {
      Pool: class MockPool {
        end = vi.fn().mockResolvedValue(undefined)
        connect = vi.fn().mockResolvedValue({
          query: vi.fn(),
          release: vi.fn()
        })
        constructor() {}
      }
    }
  }
})

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

// Import after mocking
import { PrismaService } from '../../../services/database/prisma.service'
import { PrismaClient } from '@prisma/client'
import pg from 'pg'

describe('PrismaService', () => {
  let prismaService: PrismaService
  let mockConfig: MockConfigService

  beforeEach(() => {
    vi.clearAllMocks()

    mockConfig = createMockConfigService()

    // Set up default config values
    mockConfig.get.mockImplementation((key: string) => {
      const configMap: Record<string, unknown> = {
        DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
        DB_POOL_MIN: 2,
        DB_POOL_MAX: 10,
        DB_CONNECTION_TIMEOUT: 30000,
        DB_IDLE_TIMEOUT: 10000,
        DB_MAX_RETRY_ATTEMPTS: 3,
        DB_RETRY_BASE_DELAY: 10 // Fast retries for testing
      }
      return configMap[key]
    })

    mockConfig.isDevelopment.mockReturnValue(true)

    prismaService = new PrismaService(mockConfig as any)
  })

  describe('constructor', () => {
    it('should initialize with config', () => {
      expect(mockConfig.get).toHaveBeenCalledWith('DATABASE_URL')
      expect(mockConfig.get).toHaveBeenCalledWith('DB_POOL_MIN')
      expect(mockConfig.get).toHaveBeenCalledWith('DB_POOL_MAX')
    })

    it('should create PrismaClient', () => {
      expect(prismaService.client).toBeDefined()
    })
  })

  describe('connect', () => {
    it('should connect successfully on first attempt', async () => {
      const client = prismaService.client as any

      await prismaService.connect()

      expect(client.$connect).toHaveBeenCalledOnce()
    })

    it('should retry on failure with exponential backoff', async () => {
      const client = prismaService.client as any
      client.$connect
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce(undefined)

      await prismaService.connect()

      expect(client.$connect).toHaveBeenCalledTimes(3)
    })

    it('should throw after max retries', async () => {
      const client = prismaService.client as any
      client.$connect.mockRejectedValue(new Error('Connection failed'))

      await expect(prismaService.connect()).rejects.toThrow(
        'Failed to connect to database after 3 attempts'
      )
    })
  })

  describe('disconnect', () => {
    it('should disconnect client and pool', async () => {
      const client = prismaService.client as any
      const pool = (prismaService as any).pool

      await prismaService.disconnect()

      expect(client.$disconnect).toHaveBeenCalledOnce()
      expect(pool.end).toHaveBeenCalledOnce()
    })
  })

  describe('reconnect', () => {
    it('should disconnect then connect', async () => {
      const client = prismaService.client as any
      const pool = (prismaService as any).pool

      await prismaService.reconnect()

      expect(client.$disconnect).toHaveBeenCalled()
      expect(pool.end).toHaveBeenCalled()
      expect(client.$connect).toHaveBeenCalled()
    })
  })

  describe('healthCheck', () => {
    it('should return true when query succeeds', async () => {
      const client = prismaService.client as any
      client.$queryRaw.mockResolvedValue([{ 1: 1 }])

      const result = await prismaService.healthCheck()

      expect(result).toBe(true)
    })

    it('should return false when query fails', async () => {
      const client = prismaService.client as any
      client.$queryRaw.mockRejectedValue(new Error('Query failed'))

      const result = await prismaService.healthCheck()

      expect(result).toBe(false)
    })
  })

  describe('isConnected', () => {
    it('should return true when connected', async () => {
      const client = prismaService.client as any
      client.$queryRaw.mockResolvedValue([{ 1: 1 }])

      const result = await prismaService.isConnected()

      expect(result).toBe(true)
    })

    it('should return false when disconnected', async () => {
      const client = prismaService.client as any
      client.$queryRaw.mockRejectedValue(new Error('Not connected'))

      const result = await prismaService.isConnected()

      expect(result).toBe(false)
    })
  })

  describe('executeInTransaction', () => {
    it('should delegate to client.$transaction', async () => {
      const client = prismaService.client as any
      const mockFn = vi.fn().mockResolvedValue('result')
      client.$transaction.mockImplementation((fn: Function) => fn({}))

      await prismaService.executeInTransaction(mockFn)

      expect(client.$transaction).toHaveBeenCalledWith(mockFn)
    })
  })
})
