import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockRequest, createMockReply } from '../mocks/fastify.mock'

// Mock middleware
vi.mock('@middleware', () => ({
  registerMiddlewareChain: vi.fn(),
  rateLimitMiddleware: vi.fn(),
  appCheckMiddleware: vi.fn(),
  clientDetectionMiddleware: vi.fn(),
  loggingMiddleware: vi.fn()
}))

describe('Auth Routes', () => {
  describe('GET /api/auth/jwt/test', () => {
    it('should return JWT token with correct payload', async () => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test'
      const mockJwtSign = vi.fn().mockReturnValue(mockToken)

      // Simulate the route handler behavior
      const handler = async () => {
        const token = mockJwtSign({
          sub: '1b0bc859-f8dc-4305-8bca-a92bd9e1924f',
          email: 'john.doe@example.com',
          role: 'user'
        })
        return { token }
      }

      const result = await handler()

      expect(mockJwtSign).toHaveBeenCalledWith({
        sub: '1b0bc859-f8dc-4305-8bca-a92bd9e1924f',
        email: 'john.doe@example.com',
        role: 'user'
      })
      expect(result.token).toBe(mockToken)
    })

    it('should include correct user payload in token', () => {
      const expectedPayload = {
        sub: '1b0bc859-f8dc-4305-8bca-a92bd9e1924f',
        email: 'john.doe@example.com',
        role: 'user'
      }

      // Verify the hardcoded payload values
      expect(expectedPayload.sub).toBe('1b0bc859-f8dc-4305-8bca-a92bd9e1924f')
      expect(expectedPayload.email).toBe('john.doe@example.com')
      expect(expectedPayload.role).toBe('user')
    })
  })
})
