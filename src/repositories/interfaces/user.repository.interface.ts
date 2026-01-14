import type { User } from '@prisma/client'

export interface IUserRepository {
  findById(userId: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
}
