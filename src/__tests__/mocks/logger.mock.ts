import { vi } from "vitest";

export interface MockBoundLogger {
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  debug: ReturnType<typeof vi.fn>;
  child: ReturnType<typeof vi.fn>;
}

export function createMockLogger(): MockBoundLogger {
  const mockLogger: MockBoundLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(),
  };

  mockLogger.child.mockReturnValue(mockLogger);

  return mockLogger;
}

export function resetMockLogger(mock: MockBoundLogger): void {
  mock.info.mockReset();
  mock.warn.mockReset();
  mock.error.mockReset();
  mock.debug.mockReset();
  mock.child.mockReset().mockReturnValue(mock);
}

export interface MockLoggerService {
  forService: ReturnType<typeof vi.fn>;
  forRequest: ReturnType<typeof vi.fn>;
  getBaseLogger: ReturnType<typeof vi.fn>;
}

export function createMockLoggerService(): MockLoggerService {
  const mockBoundLogger = createMockLogger();

  return {
    forService: vi.fn().mockReturnValue(mockBoundLogger),
    forRequest: vi.fn().mockReturnValue(mockBoundLogger),
    getBaseLogger: vi.fn().mockReturnValue({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  };
}
