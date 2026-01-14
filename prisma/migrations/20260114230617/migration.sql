/*
  Warnings:

  - You are about to alter the column `title` on the `Chat` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - Added the required column `updatedAt` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Message_chatId_createdAt_idx";

-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ALTER COLUMN "title" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "Chat_userId_deletedAt_idx" ON "Chat"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "Message_chatId_createdAt_idx" ON "Message"("chatId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Message_chatId_deletedAt_idx" ON "Message"("chatId", "deletedAt");
