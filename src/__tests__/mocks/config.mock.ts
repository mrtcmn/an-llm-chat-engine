import { vi } from 'vitest'

export interface FeatureFlags {
  streamingEnabled: boolean
  paginationLimit: number
  aiToolsEnabled: boolean
  chatHistoryEnabled: boolean
}

export interface EnvConfig {
  DATABASE_URL: string
  DB_POOL_MIN: number
  DB_POOL_MAX: number
  DB_CONNECTION_TIMEOUT: number
  DB_IDLE_TIMEOUT: number
  DB_MAX_RETRY_ATTEMPTS: number
  DB_RETRY_BASE_DELAY: number
  DB_HEALTH_CHECK_INTERVAL: number
  DB_HEALTH_CHECK_ENABLED: boolean
  PORT: number
  NODE_ENV: 'development' | 'production' | 'test' | 'staging'
  HOST: string
  JWT_SECRET: string
  OPENAI_API_KEY: string
  AI_PROVIDER: 'openai' | 'anthropic' | 'azure'
  STREAMING_ENABLED: boolean
  PAGINATION_LIMIT: number
  AI_TOOLS_ENABLED: boolean
  CHAT_HISTORY_ENABLED: boolean
  LOG_LEVEL: string
  REQUEST_LOGGING_ENABLED: boolean
}

export interface MockConfigService {
  get: ReturnType<typeof vi.fn>
  getAll: ReturnType<typeof vi.fn>
  getFeatureFlag: ReturnType<typeof vi.fn>
  getAllFeatureFlags: ReturnType<typeof vi.fn>
  isProduction: ReturnType<typeof vi.fn>
  isDevelopment: ReturnType<typeof vi.fn>
  isTest: ReturnType<typeof vi.fn>
}

const defaultFeatureFlags: FeatureFlags = {
  streamingEnabled: true,
  paginationLimit: 20,
  aiToolsEnabled: true,
  chatHistoryEnabled: true
}

const defaultEnvConfig: Partial<EnvConfig> = {
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  DB_POOL_MIN: 2,
  DB_POOL_MAX: 10,
  DB_CONNECTION_TIMEOUT: 30000,
  DB_IDLE_TIMEOUT: 10000,
  DB_MAX_RETRY_ATTEMPTS: 5,
  DB_RETRY_BASE_DELAY: 1000,
  DB_HEALTH_CHECK_INTERVAL: 30000,
  DB_HEALTH_CHECK_ENABLED: false,
  PORT: 3000,
  NODE_ENV: 'test',
  HOST: 'localhost',
  JWT_SECRET: 'test-secret-key-for-jwt',
  OPENAI_API_KEY: 'test-openai-api-key',
  AI_PROVIDER: 'openai',
  STREAMING_ENABLED: true,
  PAGINATION_LIMIT: 20,
  AI_TOOLS_ENABLED: true,
  CHAT_HISTORY_ENABLED: true,
  LOG_LEVEL: 'debug',
  REQUEST_LOGGING_ENABLED: false
}

export function createMockConfigService(
  featureFlagsOverrides?: Partial<FeatureFlags>,
  envConfigOverrides?: Partial<EnvConfig>
): MockConfigService {
  const featureFlags = { ...defaultFeatureFlags, ...featureFlagsOverrides }
  const envConfig = { ...defaultEnvConfig, ...envConfigOverrides }

  return {
    get: vi.fn((key: keyof EnvConfig) => envConfig[key]),
    getAll: vi.fn(() => envConfig),
    getFeatureFlag: vi.fn((flag: keyof FeatureFlags) => featureFlags[flag]),
    getAllFeatureFlags: vi.fn(() => featureFlags),
    isProduction: vi.fn(() => envConfig.NODE_ENV === 'production'),
    isDevelopment: vi.fn(() => envConfig.NODE_ENV === 'development'),
    isTest: vi.fn(() => envConfig.NODE_ENV === 'test')
  }
}

export function resetMockConfigService(mock: MockConfigService): void {
  mock.get.mockReset()
  mock.getAll.mockReset()
  mock.getFeatureFlag.mockReset()
  mock.getAllFeatureFlags.mockReset()
  mock.isProduction.mockReset()
  mock.isDevelopment.mockReset()
  mock.isTest.mockReset()
}
