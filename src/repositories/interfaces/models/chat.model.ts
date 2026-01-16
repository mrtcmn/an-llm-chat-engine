import type { Message } from "./message.model";
import type { User } from "./user.model";

/**
 * Chat domain model representing a chat session in the business layer.
 * Decoupled from Prisma-generated types for portability and testing.
 */
export interface Chat {
  id: string;
  title: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  // Optional relations - only populated when explicitly loaded
  user?: User;
  messages?: Message[];
}
