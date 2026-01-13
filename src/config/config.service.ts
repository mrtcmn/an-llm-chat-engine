import { EnvConfig, validateEnv } from './env.config'
import { FeatureFlags, defaultFeatureFlags } from './feature-flags.config'

export class ConfigService {
  private static instance: ConfigService
  private config: EnvConfig
  private featureFlags: FeatureFlags

  private constructor() {
    this.config = validateEnv()
    this.featureFlags = this.loadFeatureFlags()
  }

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService()
    }
    return ConfigService.instance
  }

  private loadFeatureFlags(): FeatureFlags {
    return {
      streamingEnabled: this.config.STREAMING_ENABLED,
      paginationLimit: this.config.PAGINATION_LIMIT,
      aiToolsEnabled: this.config.AI_TOOLS_ENABLED,
      chatHistoryEnabled: this.config.CHAT_HISTORY_ENABLED,
    }
  }

  get<K extends keyof EnvConfig>(key: K): EnvConfig[K] {
    return this.config[key]
  }

  getAll(): Readonly<EnvConfig> {
    return Object.freeze({ ...this.config })
  }

  getFeatureFlag<K extends keyof FeatureFlags>(flag: K): FeatureFlags[K] {
    return this.featureFlags[flag]
  }

  getAllFeatureFlags(): Readonly<FeatureFlags> {
    return Object.freeze({ ...this.featureFlags })
  }

  isProduction(): boolean {
    return this.config.NODE_ENV === 'production'
  }

  isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development'
  }

  isTest(): boolean {
    return this.config.NODE_ENV === 'test'
  }
}
