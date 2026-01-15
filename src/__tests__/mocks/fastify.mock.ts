import { vi } from "vitest";
import { createMockLogger, type MockBoundLogger } from "./logger.mock";

export interface JwtUserPayload {
  sub: string;
  email: string;
  role: "user" | "admin";
  iat?: number;
  exp?: number;
}

export interface MockFastifyRequest {
  user: JwtUserPayload | undefined;
  log: MockBoundLogger;
  logger: MockBoundLogger;
  correlationId: string;
  clientType: string;
  id: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  params: Record<string, string>;
  query: Record<string, unknown>;
  body: unknown;
  ip: string;
  jwtVerify: ReturnType<typeof vi.fn>;
  routeOptions?: { url: string };
}

export interface MockFastifyReply {
  status: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  header: ReturnType<typeof vi.fn>;
  raw: {
    writeHead: ReturnType<typeof vi.fn>;
    write: ReturnType<typeof vi.fn>;
    end: ReturnType<typeof vi.fn>;
  };
  elapsedTime: number;
  statusCode: number;
}

export function createMockRequest(
  overrides?: Partial<MockFastifyRequest>
): MockFastifyRequest {
  const mockLogger = createMockLogger();

  return {
    user: {
      sub: "test-user-id",
      email: "test@example.com",
      role: "user",
    },
    log: mockLogger,
    logger: mockLogger,
    correlationId: "test-correlation-id",
    clientType: "web",
    id: "test-request-id",
    method: "GET",
    url: "/api/test",
    headers: {
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0",
    },
    params: {},
    query: {},
    body: {},
    ip: "127.0.0.1",
    jwtVerify: vi.fn().mockResolvedValue({
      sub: "test-user-id",
      email: "test@example.com",
      role: "user",
    }),
    routeOptions: { url: "/api/test" },
    ...overrides,
  };
}

export function createMockReply(): MockFastifyReply {
  const reply: MockFastifyReply = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    header: vi.fn().mockReturnThis(),
    raw: {
      writeHead: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
    },
    elapsedTime: 0,
    statusCode: 200,
  };

  return reply;
}

export function resetMockRequest(mock: MockFastifyRequest): void {
  mock.jwtVerify.mockReset();
  mock.log.info.mockReset();
  mock.log.warn.mockReset();
  mock.log.error.mockReset();
  mock.log.debug.mockReset();
}

export function resetMockReply(mock: MockFastifyReply): void {
  mock.status.mockReset().mockReturnThis();
  mock.send.mockReset().mockReturnThis();
  mock.header.mockReset().mockReturnThis();
  mock.raw.writeHead.mockReset();
  mock.raw.write.mockReset();
  mock.raw.end.mockReset();
}
