import type { Chat } from "./chat.model";

/**
 * Message domain model representing a chat message in the business layer.
 * Decoupled from Prisma-generated types for portability and testing.
 */
export interface Message {
  id: string;
  chatId: string;
  role: string;
  content: string;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  // Optional relation - only populated when explicitly loaded
  chat?: Chat;
}
