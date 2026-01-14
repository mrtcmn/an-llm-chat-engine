import type { PrismaClient, User } from '@prisma/client'

export class UserRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id: userId } })
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } })
  }
}
