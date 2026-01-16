import type { User } from "./models";

export interface IUserRepository {
  findById(userId: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
}
