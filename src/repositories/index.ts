// Export interfaces
export * from './interfaces'

// Export ONLY public adapters (NOT internal implementations)
export { ChatRepository } from './chat.repository'
export { MessageRepository } from './message.repository'
export { UserRepository } from './user.repository'

// Internal implementations (prisma/typeorm) are NOT exported
