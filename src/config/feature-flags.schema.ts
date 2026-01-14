import { z } from 'zod'

export const featureFlagsSchema = z.object({
  streamingEnabled: z.boolean(),
  paginationLimit: z.number().min(10).max(100),
  aiToolsEnabled: z.boolean(),
  chatHistoryEnabled: z.boolean(),
})

export type FeatureFlags = z.infer<typeof featureFlagsSchema>