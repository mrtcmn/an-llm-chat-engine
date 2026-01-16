import type { Chat } from "./chat.model";

/**
 * User domain model representing a user entity in the business layer.
 * Decoupled from Prisma-generated types for portability and testing.
 */
export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;

  // Optional relation - only populated when explicitly loaded
  chats?: Chat[];
}
