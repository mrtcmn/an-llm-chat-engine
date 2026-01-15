import type { User } from '@generated/prisma/client'

export interface IUserRepository {
  findById(userId: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
}
