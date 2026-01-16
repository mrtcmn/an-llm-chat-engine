import type { PrismaClient } from "@generated/prisma/client";
import type { User } from "../../interfaces/models";
import type { IUserRepository } from "../../interfaces";

export class UserPrismaRepositoryImpl implements IUserRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }
}
