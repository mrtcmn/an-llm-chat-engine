import { vi } from 'vitest'

export interface MockPoolClient {
  query: ReturnType<typeof vi.fn>
  release: ReturnType<typeof vi.fn>
}

export interface MockPool {
  connect: ReturnType<typeof vi.fn>
  query: ReturnType<typeof vi.fn>
  end: ReturnType<typeof vi.fn>
  on: ReturnType<typeof vi.fn>
  totalCount: number
  idleCount: number
  waitingCount: number
}

export function createMockPoolClient(): MockPoolClient {
  return {
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    release: vi.fn()
  }
}

export function createMockPool(): MockPool {
  const mockClient = createMockPoolClient()

  return {
    connect: vi.fn().mockResolvedValue(mockClient),
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    end: vi.fn().mockResolvedValue(undefined),
    on: vi.fn().mockReturnThis(),
    totalCount: 10,
    idleCount: 5,
    waitingCount: 0
  }
}

export function resetMockPool(mock: MockPool): void {
  mock.connect.mockReset()
  mock.query.mockReset()
  mock.end.mockReset()
  mock.on.mockReset()
}

export function resetMockPoolClient(mock: MockPoolClient): void {
  mock.query.mockReset()
  mock.release.mockReset()
}
