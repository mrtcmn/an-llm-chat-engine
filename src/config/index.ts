import { ConfigService } from './config.service'
import { envSchema, validateEnv, type EnvConfig } from './env.config'
import {
  featureFlagsSchema,
  defaultFeatureFlags,
  type FeatureFlags,
} from './feature-flags.config'

// Export all constants
export * from './constants'

export { ConfigService }
export { envSchema, validateEnv, type EnvConfig }
export { featureFlagsSchema, defaultFeatureFlags, type FeatureFlags }
export { default as configPlugin } from './config.plugin'

// Singleton instance getter (for non-Fastify contexts if needed)
export const getConfig = () => ConfigService.getInstance()
