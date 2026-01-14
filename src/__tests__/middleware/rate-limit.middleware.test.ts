import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createMockRequest, createMockReply } from '../mocks/fastify.mock'

// Mock @config before importing rate-limit middleware
vi.mock('@config', () => ({
  RATE_LIMITS: {
    IP: { WINDOW_MS: 15 * 60 * 1000, MAX_REQUESTS: 500 },
    USER: { WINDOW_MS: 60 * 1000, MAX_REQUESTS: 60 },
    ROUTE: { WINDOW_MS: 60 * 1000, MAX_REQUESTS: 20 }
  },
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
  },
  ERROR_CODES: {
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
  }
}))

// Import after mock setup
import { rateLimitMiddleware } from '../../middleware/rate-limit.middleware'
import { AppError } from '../../middleware/error-handler.middleware'

describe('rateLimitMiddleware', () => {
  let mockReq: ReturnType<typeof createMockRequest>
  let mockReply: ReturnType<typeof createMockReply>

  beforeEach(() => {
    vi.clearAllMocks()
    mockReq = createMockRequest()
    mockReply = createMockReply()
    mockReq.ip = '192.168.1.1'
    mockReq.method = 'GET'
    mockReq.url = '/api/chats'
    mockReq.routeOptions = { url: '/api/chats' }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('unauthenticated requests (IP-based limiting)', () => {
    beforeEach(() => {
      mockReq.user = undefined
    })

    it('should allow requests under IP limit', async () => {
      // Use unique IP to avoid cross-test contamination
      mockReq.ip = `192.168.1.${Math.floor(Math.random() * 255)}`

      await rateLimitMiddleware(mockReq as any, mockReply as any)

      expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Limit', 500)
      expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(Number))
      expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(Number))
    })

    it('should log debug message for passed rate limit check', async () => {
      mockReq.ip = `10.0.0.${Math.floor(Math.random() * 255)}`

      await rateLimitMiddleware(mockReq as any, mockReply as any)

      expect(mockReq.logger.debug).toHaveBeenCalledWith(
        '[Middleware] RateLimit: rate limit check passed (unauthenticated)',
        expect.objectContaining({ ip: mockReq.ip })
      )
    })

    it('should set rate limit headers for unauthenticated requests', async () => {
      mockReq.ip = `172.16.0.${Math.floor(Math.random() * 255)}`

      await rateLimitMiddleware(mockReq as any, mockReply as any)

      expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Limit', 500)
    })
  })

  describe('authenticated requests (3-tier limiting)', () => {
    beforeEach(() => {
      mockReq.user = { sub: `user-${Date.now()}`, email: 'test@test.com', role: 'user' }
      mockReq.ip = `10.10.10.${Math.floor(Math.random() * 255)}`
    })

    it('should allow requests under all limits', async () => {
      await rateLimitMiddleware(mockReq as any, mockReply as any)

      expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Limit', 20)
      expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(Number))
    })

    it('should log debug message with userId and route', async () => {
      await rateLimitMiddleware(mockReq as any, mockReply as any)

      expect(mockReq.logger.debug).toHaveBeenCalledWith(
        '[Middleware] RateLimit: rate limit check passed',
        expect.objectContaining({
          userId: mockReq.user?.sub,
          route: expect.any(String),
          remaining: expect.any(Number)
        })
      )
    })

    it('should use routeOptions.url for route hash', async () => {
      mockReq.routeOptions = { url: '/api/chats/:chatId' }

      await rateLimitMiddleware(mockReq as any, mockReply as any)

      expect(mockReq.logger.debug).toHaveBeenCalledWith(
        '[Middleware] RateLimit: rate limit check passed',
        expect.objectContaining({
          route: 'GET:/api/chats/:chatId'
        })
      )
    })

    it('should fall back to req.url when routeOptions.url is not available', async () => {
      mockReq.routeOptions = undefined
      mockReq.url = '/api/chats/123'

      await rateLimitMiddleware(mockReq as any, mockReply as any)

      expect(mockReq.logger.debug).toHaveBeenCalledWith(
        '[Middleware] RateLimit: rate limit check passed',
        expect.objectContaining({
          route: 'GET:/api/chats/123'
        })
      )
    })
  })

  describe('rate limit exceeded scenarios', () => {
    it('should throw AppError when IP limit exceeded', async () => {
      // Use same IP for many requests to exceed limit
      const ip = '1.2.3.4'
      mockReq.ip = ip
      mockReq.user = undefined

      // Make 500 requests first (should all pass)
      for (let i = 0; i < 500; i++) {
        try {
          await rateLimitMiddleware(mockReq as any, mockReply as any)
        } catch {
          // Should not throw within limit
          expect.fail('Should not throw before limit is reached')
        }
      }

      // 501st request should fail
      await expect(
        rateLimitMiddleware(mockReq as any, mockReply as any)
      ).rejects.toThrow('Too many requests from this IP')
    })

    it('should throw AppError with correct status for rate limit exceeded', async () => {
      const ip = '5.6.7.8'
      mockReq.ip = ip
      mockReq.user = undefined

      // Exhaust IP limit
      for (let i = 0; i < 500; i++) {
        await rateLimitMiddleware(mockReq as any, mockReply as any)
      }

      try {
        await rateLimitMiddleware(mockReq as any, mockReply as any)
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(AppError)
        expect((error as AppError).statusCode).toBe(429)
      }
    })

    it('should log warning when IP rate limit exceeded', async () => {
      const ip = '9.10.11.12'
      mockReq.ip = ip
      mockReq.user = undefined

      // Exhaust IP limit
      for (let i = 0; i < 500; i++) {
        await rateLimitMiddleware(mockReq as any, mockReply as any)
      }

      try {
        await rateLimitMiddleware(mockReq as any, mockReply as any)
      } catch {
        // Expected
      }

      expect(mockReq.logger.warn).toHaveBeenCalledWith(
        '[Middleware] RateLimit: IP rate limit exceeded',
        { ip }
      )
    })
  })

  describe('user rate limit exceeded', () => {
    it('should throw when user limit exceeded', async () => {
      const userId = `heavy-user-${Date.now()}`
      mockReq.user = { sub: userId, email: 'heavy@test.com', role: 'user' }
      mockReq.ip = `unique-ip-${Date.now()}`

      // Make 60 requests to different routes to avoid hitting route limit
      // This way we test the user limit specifically
      for (let i = 0; i < 60; i++) {
        mockReq.routeOptions = { url: `/api/route-${Math.floor(i / 3)}` }
        await rateLimitMiddleware(mockReq as any, mockReply as any)
      }

      // 61st request should fail with user limit error
      mockReq.routeOptions = { url: '/api/final-route' }
      await expect(
        rateLimitMiddleware(mockReq as any, mockReply as any)
      ).rejects.toThrow('Too many requests')
    })
  })

  describe('route rate limit exceeded', () => {
    it('should throw when route limit exceeded for same endpoint', async () => {
      const userId = `route-heavy-user-${Date.now()}`
      mockReq.user = { sub: userId, email: 'route@test.com', role: 'user' }
      mockReq.ip = `route-ip-${Date.now()}`
      mockReq.routeOptions = { url: '/api/specific-route' }

      // Make 20 requests to same route (route limit)
      for (let i = 0; i < 20; i++) {
        await rateLimitMiddleware(mockReq as any, mockReply as any)
      }

      // 21st request to same route should fail
      await expect(
        rateLimitMiddleware(mockReq as any, mockReply as any)
      ).rejects.toThrow('Too many requests to this endpoint')
    })

    it('should log warning when route rate limit exceeded', async () => {
      const userId = `route-warn-user-${Date.now()}`
      mockReq.user = { sub: userId, email: 'routewarn@test.com', role: 'user' }
      mockReq.ip = `route-warn-ip-${Date.now()}`
      mockReq.routeOptions = { url: '/api/warn-route' }

      // Exhaust route limit
      for (let i = 0; i < 20; i++) {
        await rateLimitMiddleware(mockReq as any, mockReply as any)
      }

      try {
        await rateLimitMiddleware(mockReq as any, mockReply as any)
      } catch {
        // Expected
      }

      expect(mockReq.logger.warn).toHaveBeenCalledWith(
        '[Middleware] RateLimit: route rate limit exceeded',
        { userId, route: expect.any(String) }
      )
    })
  })

  describe('different routes for same user', () => {
    it('should track different routes independently', async () => {
      const userId = `multi-route-user-${Date.now()}`
      mockReq.user = { sub: userId, email: 'multi@test.com', role: 'user' }
      mockReq.ip = `multi-ip-${Date.now()}`

      // Make 20 requests to route A
      mockReq.routeOptions = { url: '/api/route-a' }
      for (let i = 0; i < 20; i++) {
        await rateLimitMiddleware(mockReq as any, mockReply as any)
      }

      // Switch to route B - should still work
      mockReq.routeOptions = { url: '/api/route-b' }
      await expect(
        rateLimitMiddleware(mockReq as any, mockReply as any)
      ).resolves.not.toThrow()
    })
  })
})
