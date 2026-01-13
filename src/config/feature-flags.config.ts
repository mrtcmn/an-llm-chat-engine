import { z } from 'zod'

export const featureFlagsSchema = z.object({
  streamingEnabled: z.boolean(),
  paginationLimit: z.number().min(1).max(100),
  aiToolsEnabled: z.boolean(),
  chatHistoryEnabled: z.boolean(),
})

export type FeatureFlags = z.infer<typeof featureFlagsSchema>

export const defaultFeatureFlags: FeatureFlags = {
  streamingEnabled: true,
  paginationLimit: 20,
  aiToolsEnabled: false,
  chatHistoryEnabled: true,
}
