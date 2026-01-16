import type { PrismaClient } from "@generated/prisma/client";
import type { IUserRepository } from "../../interfaces";
import type { User } from "../../interfaces/models";

export class UserPrismaRepositoryImpl implements IUserRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }
}
