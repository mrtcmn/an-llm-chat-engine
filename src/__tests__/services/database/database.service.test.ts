import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DatabaseService } from '../../../services/database/database.service'
import type { DatabaseStrategy } from '../../../services/database/database.strategy'

describe('DatabaseService', () => {
  let mockStrategy: DatabaseStrategy
  let originalInstance: DatabaseService | undefined

  beforeEach(() => {
    // Save and clear the singleton instance before each test
    originalInstance = (DatabaseService as any).instance
    ;(DatabaseService as any).instance = undefined

    mockStrategy = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      reconnect: vi.fn().mockResolvedValue(undefined),
      healthCheck: vi.fn().mockResolvedValue(true),
      isConnected: vi.fn().mockResolvedValue(true)
    }
  })

  afterEach(() => {
    // Restore the original instance
    ;(DatabaseService as any).instance = originalInstance
  })

  describe('initialize', () => {
    it('should create singleton instance', () => {
      const instance = DatabaseService.initialize(mockStrategy)

      expect(instance).toBeInstanceOf(DatabaseService)
    })

    it('should return existing instance on subsequent calls', () => {
      const instance1 = DatabaseService.initialize(mockStrategy)
      const instance2 = DatabaseService.initialize(mockStrategy)

      expect(instance1).toBe(instance2)
    })
  })

  describe('getInstance', () => {
    it('should return instance after initialization', () => {
      DatabaseService.initialize(mockStrategy)

      const instance = DatabaseService.getInstance()

      expect(instance).toBeInstanceOf(DatabaseService)
    })

    it('should throw if not initialized', () => {
      expect(() => DatabaseService.getInstance()).toThrow(
        'DatabaseService not initialized. Call initialize() first.'
      )
    })
  })

  describe('getStrategy', () => {
    it('should return underlying strategy', () => {
      DatabaseService.initialize(mockStrategy)
      const instance = DatabaseService.getInstance()

      const strategy = instance.getStrategy()

      expect(strategy).toBe(mockStrategy)
    })
  })

  describe('connect', () => {
    it('should delegate to strategy', async () => {
      DatabaseService.initialize(mockStrategy)
      const instance = DatabaseService.getInstance()

      await instance.connect()

      expect(mockStrategy.connect).toHaveBeenCalledOnce()
    })
  })

  describe('disconnect', () => {
    it('should delegate to strategy', async () => {
      DatabaseService.initialize(mockStrategy)
      const instance = DatabaseService.getInstance()

      await instance.disconnect()

      expect(mockStrategy.disconnect).toHaveBeenCalledOnce()
    })
  })

  describe('reconnect', () => {
    it('should delegate to strategy', async () => {
      DatabaseService.initialize(mockStrategy)
      const instance = DatabaseService.getInstance()

      await instance.reconnect()

      expect(mockStrategy.reconnect).toHaveBeenCalledOnce()
    })
  })

  describe('healthCheck', () => {
    it('should delegate to strategy and return true when healthy', async () => {
      DatabaseService.initialize(mockStrategy)
      const instance = DatabaseService.getInstance()
      ;(mockStrategy.healthCheck as ReturnType<typeof vi.fn>).mockResolvedValue(true)

      const result = await instance.healthCheck()

      expect(result).toBe(true)
      expect(mockStrategy.healthCheck).toHaveBeenCalledOnce()
    })

    it('should return false when unhealthy', async () => {
      DatabaseService.initialize(mockStrategy)
      const instance = DatabaseService.getInstance()
      ;(mockStrategy.healthCheck as ReturnType<typeof vi.fn>).mockResolvedValue(false)

      const result = await instance.healthCheck()

      expect(result).toBe(false)
    })
  })

  describe('isConnected', () => {
    it('should delegate to strategy and return true when connected', async () => {
      DatabaseService.initialize(mockStrategy)
      const instance = DatabaseService.getInstance()
      ;(mockStrategy.isConnected as ReturnType<typeof vi.fn>).mockResolvedValue(true)

      const result = await instance.isConnected()

      expect(result).toBe(true)
      expect(mockStrategy.isConnected).toHaveBeenCalledOnce()
    })

    it('should return false when disconnected', async () => {
      DatabaseService.initialize(mockStrategy)
      const instance = DatabaseService.getInstance()
      ;(mockStrategy.isConnected as ReturnType<typeof vi.fn>).mockResolvedValue(false)

      const result = await instance.isConnected()

      expect(result).toBe(false)
    })
  })
})
