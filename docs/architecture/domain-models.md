# Domain Models Architecture

## Overview

This project uses domain models to decouple business logic from database implementation details. Domain models are TypeScript interfaces that define the shape of business entities without coupling to Prisma-generated types.

## Location

Domain models live in `src/repositories/interfaces/models/`:

- `user.model.ts` - User entity
- `chat.model.ts` - Chat session entity
- `message.model.ts` - Chat message entity

## Design Principles

### Structural Compatibility

Domain models are designed to be structurally compatible with Prisma-generated types. This means:

- Field names match exactly between domain models and Prisma schema
- Field types are compatible (e.g., `Date` in both)
- No runtime mapping overhead - TypeScript's structural typing handles compatibility

### Selective Field Inclusion

Domain models only include fields that business logic actually uses:

- Scalar fields: `id`, `email`, `title`, `content`, etc.
- Timestamps: `createdAt`, `updatedAt`
- Soft delete: `deletedAt` (for entities that support soft delete)
- Relations: Optional fields (e.g., `user.chats?: Chat[]`)

### Relations Are Optional

Relation fields are always optional to reflect that they're only populated when explicitly loaded:

```typescript
export interface User {
  id: string;
  email: string;
  // ... other scalar fields

  // Optional - only present when loaded with include
  chats?: Chat[];
}
```

## Benefits

1. **Testing** - Repository interfaces can be mocked without Prisma dependencies
2. **Portability** - Switching ORMs requires only new implementations, not interface changes
3. **Type Safety** - Full TypeScript support throughout the stack
4. **Performance** - Zero runtime overhead from structural typing
5. **Clarity** - Business layer sees only relevant entity fields

## Usage Example

```typescript
// Repository interface uses domain model
import type { User } from "./models";

export interface IUserRepository {
  findById(userId: string): Promise<User | null>;
}

// Prisma implementation satisfies domain model through structural typing
import type { PrismaClient } from "@generated/prisma/client";
import type { User } from "../../interfaces/models";

export class UserPrismaRepositoryImpl implements IUserRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(userId: string): Promise<User | null> {
    // Prisma returns User type that structurally matches domain model
    return this.prisma.user.findUnique({ where: { id: userId } });
  }
}
```

## Migration Path

If migrating to a different ORM:

1. Keep domain models unchanged
2. Keep repository interfaces unchanged
3. Create new implementations (e.g., `user.typeorm.repository.ts`)
4. Update repository factory to use new implementations
5. Business logic requires zero changes
