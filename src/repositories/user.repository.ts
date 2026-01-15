import type { DatabaseService } from '../services/database/database.service'
import type { PrismaService } from '../services/database/prisma.service'
import type { IUserRepository } from './interfaces'
import { UserPrismaRepositoryImpl } from './implementations/prisma/user.prisma.repository'
import type { User } from '@generated/prisma/client'

export class UserRepository implements IUserRepository {
  private impl: IUserRepository

  constructor(db: DatabaseService) {
    const strategy = db.getStrategy()
    
    // Check which database strategy is active
    if (this.isPrismaService(strategy)) {
      this.impl = new UserPrismaRepositoryImpl(strategy.client)
    } else {
      throw new Error(
        `Unsupported database strategy: ${strategy.constructor.name}. ` +
        `Supported strategies: PrismaService`
      )
    }
  }

  private isPrismaService(strategy: any): strategy is PrismaService {
    return 'client' in strategy && strategy.client !== undefined
  }

  // Delegate all interface methods
  async findById(userId: string): Promise<User | null> {
    return this.impl.findById(userId)
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.impl.findByEmail(email)
  }
}
