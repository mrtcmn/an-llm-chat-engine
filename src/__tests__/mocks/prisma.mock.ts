import { vi } from 'vitest'
import type { PrismaClient } from '@generated/prisma/client'

export type MockPrismaClient = {
  user: {
    findUnique: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
  chat: {
    findUnique: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
    count: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    upsert: ReturnType<typeof vi.fn>
  }
  message: {
    findMany: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
  $transaction: ReturnType<typeof vi.fn>
  $connect: ReturnType<typeof vi.fn>
  $disconnect: ReturnType<typeof vi.fn>
  $queryRaw: ReturnType<typeof vi.fn>
}

export function createMockPrismaClient(): MockPrismaClient {
  const mock: MockPrismaClient = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn()
    },
    chat: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn()
    },
    message: {
      findMany: vi.fn(),
      create: vi.fn()
    },
    $transaction: vi.fn(),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $queryRaw: vi.fn()
  }

  // Default $transaction implementation that handles array of promises
  mock.$transaction.mockImplementation(async (queries: unknown[] | ((tx: MockPrismaClient) => Promise<unknown>)) => {
    if (Array.isArray(queries)) {
      return Promise.all(queries)
    }
    // Handle callback style transaction
    return queries(mock)
  })

  return mock
}

export function resetMockPrismaClient(mock: MockPrismaClient): void {
  mock.user.findUnique.mockReset()
  mock.user.create.mockReset()
  mock.chat.findUnique.mockReset()
  mock.chat.findMany.mockReset()
  mock.chat.count.mockReset()
  mock.chat.create.mockReset()
  mock.chat.upsert.mockReset()
  mock.message.findMany.mockReset()
  mock.message.create.mockReset()
  mock.$transaction.mockReset()
  mock.$connect.mockReset()
  mock.$disconnect.mockReset()
  mock.$queryRaw.mockReset()
}
