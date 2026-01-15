import type { Chat } from "@generated/prisma/client";

export interface IChatRepository {
  findById(chatId: string): Promise<Chat | null>;
  findByUserId(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ chats: Chat[]; total: number }>;
  create(data: { userId: string; title: string }): Promise<Chat>;
  upsert(data: { id: string; userId: string; title: string }): Promise<Chat>;
}
