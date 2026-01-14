import { describe, it, expect, beforeEach } from 'vitest'
import { clientDetectionMiddleware } from '../../middleware/client-detection.middleware'
import { createMockRequest, createMockReply } from '../mocks/fastify.mock'

describe('clientDetectionMiddleware', () => {
  let mockReq: ReturnType<typeof createMockRequest>
  let mockReply: ReturnType<typeof createMockReply>

  beforeEach(() => {
    mockReq = createMockRequest()
    mockReply = createMockReply()
    mockReq.headers = {}
  })

  describe('X-Client-Type header detection', () => {
    it('should use X-Client-Type header when provided with valid value', async () => {
      mockReq.headers['x-client-type'] = 'mobile'

      await clientDetectionMiddleware(mockReq as any, mockReply as any)

      expect(mockReq.clientType).toBe('mobile')
    })

    it('should detect web from header', async () => {
      mockReq.headers['x-client-type'] = 'web'

      await clientDetectionMiddleware(mockReq as any, mockReply as any)

      expect(mockReq.clientType).toBe('web')
    })

    it('should detect desktop from header', async () => {
      mockReq.headers['x-client-type'] = 'desktop'

      await clientDetectionMiddleware(mockReq as any, mockReply as any)

      expect(mockReq.clientType).toBe('desktop')
    })

    it('should detect unknown from header', async () => {
      mockReq.headers['x-client-type'] = 'unknown'

      await clientDetectionMiddleware(mockReq as any, mockReply as any)

      expect(mockReq.clientType).toBe('unknown')
    })

    it('should fall back to User-Agent when header has invalid value', async () => {
      mockReq.headers['x-client-type'] = 'invalid-type'
      mockReq.headers['user-agent'] = 'Mozilla/5.0 Chrome/120.0'

      await clientDetectionMiddleware(mockReq as any, mockReply as any)

      expect(mockReq.clientType).toBe('web')
    })
  })

  describe('User-Agent detection', () => {
    describe('mobile detection', () => {
      it('should detect mobile from user-agent with mobile keyword', async () => {
        mockReq.headers['user-agent'] = 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36'

        await clientDetectionMiddleware(mockReq as any, mockReply as any)

        expect(mockReq.clientType).toBe('mobile')
      })

      it('should detect mobile from Android user-agent', async () => {
        mockReq.headers['user-agent'] = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0'

        await clientDetectionMiddleware(mockReq as any, mockReply as any)

        expect(mockReq.clientType).toBe('mobile')
      })

      it('should detect mobile from iPhone user-agent', async () => {
        mockReq.headers['user-agent'] = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15'

        await clientDetectionMiddleware(mockReq as any, mockReply as any)

        expect(mockReq.clientType).toBe('mobile')
      })

      it('should detect mobile from iPad user-agent', async () => {
        mockReq.headers['user-agent'] = 'Mozilla/5.0 (iPad; CPU OS 17_0) AppleWebKit/605.1.15'

        await clientDetectionMiddleware(mockReq as any, mockReply as any)

        expect(mockReq.clientType).toBe('mobile')
      })

      it('should detect mobile from iPod user-agent', async () => {
        mockReq.headers['user-agent'] = 'Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0) AppleWebKit/605.1.15'

        await clientDetectionMiddleware(mockReq as any, mockReply as any)

        expect(mockReq.clientType).toBe('mobile')
      })
    })

    describe('desktop detection', () => {
      it('should detect desktop from Electron user-agent', async () => {
        mockReq.headers['user-agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X) Electron/28.0.0'

        await clientDetectionMiddleware(mockReq as any, mockReply as any)

        expect(mockReq.clientType).toBe('desktop')
      })

      it('should detect desktop from desktop keyword in user-agent', async () => {
        mockReq.headers['user-agent'] = 'MyApp/1.0 Desktop Client'

        await clientDetectionMiddleware(mockReq as any, mockReply as any)

        expect(mockReq.clientType).toBe('desktop')
      })
    })

    describe('web detection', () => {
      it('should detect web from Mozilla user-agent', async () => {
        mockReq.headers['user-agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'

        await clientDetectionMiddleware(mockReq as any, mockReply as any)

        expect(mockReq.clientType).toBe('web')
      })

      it('should detect web from Chrome user-agent', async () => {
        mockReq.headers['user-agent'] = 'Chrome/120.0.0.0 Safari/537.36'

        await clientDetectionMiddleware(mockReq as any, mockReply as any)

        expect(mockReq.clientType).toBe('web')
      })

      it('should detect web from Safari user-agent', async () => {
        mockReq.headers['user-agent'] = 'Safari/605.1.15'

        await clientDetectionMiddleware(mockReq as any, mockReply as any)

        expect(mockReq.clientType).toBe('web')
      })

      it('should detect web from Firefox user-agent', async () => {
        mockReq.headers['user-agent'] = 'Firefox/120.0'

        await clientDetectionMiddleware(mockReq as any, mockReply as any)

        expect(mockReq.clientType).toBe('web')
      })

      it('should detect web from Edge user-agent', async () => {
        mockReq.headers['user-agent'] = 'Edge/120.0.0.0'

        await clientDetectionMiddleware(mockReq as any, mockReply as any)

        expect(mockReq.clientType).toBe('web')
      })
    })

    describe('unknown detection', () => {
      it('should return unknown when no user-agent', async () => {
        delete mockReq.headers['user-agent']

        await clientDetectionMiddleware(mockReq as any, mockReply as any)

        expect(mockReq.clientType).toBe('unknown')
      })

      it('should return unknown for unrecognized user-agent', async () => {
        mockReq.headers['user-agent'] = 'CustomBot/1.0'

        await clientDetectionMiddleware(mockReq as any, mockReply as any)

        expect(mockReq.clientType).toBe('unknown')
      })

      it('should return unknown for empty user-agent', async () => {
        mockReq.headers['user-agent'] = ''

        await clientDetectionMiddleware(mockReq as any, mockReply as any)

        expect(mockReq.clientType).toBe('unknown')
      })
    })
  })

  describe('case insensitivity', () => {
    it('should handle uppercase user-agent values', async () => {
      mockReq.headers['user-agent'] = 'MOZILLA/5.0 CHROME/120.0'

      await clientDetectionMiddleware(mockReq as any, mockReply as any)

      expect(mockReq.clientType).toBe('web')
    })

    it('should handle mixed case ANDROID', async () => {
      mockReq.headers['user-agent'] = 'Mozilla/5.0 (Linux; ANDROID 10)'

      await clientDetectionMiddleware(mockReq as any, mockReply as any)

      expect(mockReq.clientType).toBe('mobile')
    })
  })

  describe('logging', () => {
    it('should log debug message with detected client type', async () => {
      mockReq.headers['user-agent'] = 'Mozilla/5.0 Chrome/120.0'

      await clientDetectionMiddleware(mockReq as any, mockReply as any)

      expect(mockReq.logger.debug).toHaveBeenCalledWith(
        '[Middleware] ClientDetection: client type detected',
        { clientType: 'web' }
      )
    })

    it('should log mobile client type', async () => {
      mockReq.headers['x-client-type'] = 'mobile'

      await clientDetectionMiddleware(mockReq as any, mockReply as any)

      expect(mockReq.logger.debug).toHaveBeenCalledWith(
        '[Middleware] ClientDetection: client type detected',
        { clientType: 'mobile' }
      )
    })
  })

  describe('error handling', () => {
    it('should handle errors and set unknown client type', async () => {
      mockReq.headers = {}

      await clientDetectionMiddleware(mockReq as any, mockReply as any)

      expect(mockReq.clientType).toBe('unknown')
    })
  })

  describe('header priority', () => {
    it('should prefer X-Client-Type header over User-Agent', async () => {
      mockReq.headers['x-client-type'] = 'desktop'
      mockReq.headers['user-agent'] = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)'

      await clientDetectionMiddleware(mockReq as any, mockReply as any)

      expect(mockReq.clientType).toBe('desktop')
    })
  })
})
