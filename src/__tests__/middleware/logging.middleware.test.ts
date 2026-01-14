import { describe, it, expect, beforeEach, vi } from 'vitest'
import { loggingMiddleware } from '../../middleware/logging.middleware'
import { createMockRequest, createMockReply } from '../mocks/fastify.mock'

describe('loggingMiddleware', () => {
  let mockReq: ReturnType<typeof createMockRequest>
  let mockReply: ReturnType<typeof createMockReply>

  beforeEach(() => {
    mockReq = createMockRequest()
    mockReply = createMockReply()
  })

  it('should log request information', async () => {
    mockReq.method = 'GET'
    mockReq.url = '/api/chats'
    mockReq.ip = '192.168.1.100'
    mockReq.headers['user-agent'] = 'Mozilla/5.0 Chrome/120.0'

    await loggingMiddleware(mockReq as any, mockReply as any)

    expect(mockReq.logger.debug).toHaveBeenCalledWith(
      '[Middleware] Logging: request received',
      {
        method: 'GET',
        url: '/api/chats',
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0 Chrome/120.0'
      }
    )
  })

  it('should log POST requests', async () => {
    mockReq.method = 'POST'
    mockReq.url = '/api/chats/123/completion'
    mockReq.ip = '10.0.0.1'
    mockReq.headers['user-agent'] = 'MyApp/1.0'

    await loggingMiddleware(mockReq as any, mockReply as any)

    expect(mockReq.logger.debug).toHaveBeenCalledWith(
      '[Middleware] Logging: request received',
      expect.objectContaining({
        method: 'POST',
        url: '/api/chats/123/completion'
      })
    )
  })

  it('should handle missing user-agent', async () => {
    mockReq.method = 'GET'
    mockReq.url = '/api/health'
    mockReq.ip = '127.0.0.1'
    mockReq.headers = {}

    await loggingMiddleware(mockReq as any, mockReply as any)

    expect(mockReq.logger.debug).toHaveBeenCalledWith(
      '[Middleware] Logging: request received',
      {
        method: 'GET',
        url: '/api/health',
        ip: '127.0.0.1',
        userAgent: undefined
      }
    )
  })

  it('should log all HTTP methods', async () => {
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']

    for (const method of methods) {
      vi.clearAllMocks()
      mockReq.method = method

      await loggingMiddleware(mockReq as any, mockReply as any)

      expect(mockReq.logger.debug).toHaveBeenCalledWith(
        '[Middleware] Logging: request received',
        expect.objectContaining({ method })
      )
    }
  })

  it('should include IP address from various sources', async () => {
    mockReq.ip = '203.0.113.50'
    mockReq.method = 'GET'
    mockReq.url = '/test'

    await loggingMiddleware(mockReq as any, mockReply as any)

    expect(mockReq.logger.debug).toHaveBeenCalledWith(
      '[Middleware] Logging: request received',
      expect.objectContaining({ ip: '203.0.113.50' })
    )
  })

  it('should log full URL including query parameters', async () => {
    mockReq.method = 'GET'
    mockReq.url = '/api/chats?limit=10&offset=20'

    await loggingMiddleware(mockReq as any, mockReply as any)

    expect(mockReq.logger.debug).toHaveBeenCalledWith(
      '[Middleware] Logging: request received',
      expect.objectContaining({ url: '/api/chats?limit=10&offset=20' })
    )
  })

  it('should not modify request or reply objects', async () => {
    mockReq.method = 'GET'
    mockReq.url = '/test'
    const originalMethod = mockReq.method
    const originalUrl = mockReq.url

    await loggingMiddleware(mockReq as any, mockReply as any)

    expect(mockReq.method).toBe(originalMethod)
    expect(mockReq.url).toBe(originalUrl)
    expect(mockReply.send).not.toHaveBeenCalled()
    expect(mockReply.status).not.toHaveBeenCalled()
  })

  it('should complete without throwing errors', async () => {
    mockReq.method = 'GET'
    mockReq.url = '/test'

    await expect(
      loggingMiddleware(mockReq as any, mockReply as any)
    ).resolves.not.toThrow()
  })
})
