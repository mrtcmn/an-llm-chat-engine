import { LoggerService } from "@utils/logger";
import { config as reloadDotenv } from "dotenv";
import { type FSWatcher, watch } from "fs";
import { resolve } from "path";
import { type EnvConfig, validateEnv } from "./env.config";
import type { FeatureFlags } from "./feature-flags.schema";

export class ConfigService {
  private static instance: ConfigService;
  private config: EnvConfig;
  private featureFlags: FeatureFlags;
  private watcher: FSWatcher | null = null;
  private reloadDebounceTimer: NodeJS.Timeout | null = null;
  private readonly envPath: string;
  private logger = LoggerService.getInstance().forService("ConfigService");

  private constructor() {
    this.envPath = resolve(process.cwd(), ".env");
    this.config = validateEnv();
    this.featureFlags = this.loadFeatureFlags();
    this.setupFileWatcher();
  }

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  private loadFeatureFlags(): FeatureFlags {
    return {
      streamingEnabled: this.config.STREAMING_ENABLED,
      paginationLimit: this.config.PAGINATION_LIMIT,
      aiToolsEnabled: this.config.AI_TOOLS_ENABLED,
      chatHistoryEnabled: this.config.CHAT_HISTORY_ENABLED,
    };
  }

  private setupFileWatcher(): void {
    try {
      this.watcher = watch(this.envPath, (eventType) => {
        if (eventType === "change") {
          this.debouncedReload();
        }
      });

      this.watcher.on("error", (error) => {
        this.logger.error("File watcher error", error);
      });

      this.logger.info("Watching .env file for changes", {
        envPath: this.envPath,
      });
    } catch (error) {
      this.logger.warn("Could not watch .env file", {
        error: (error as Error).message,
      });
    }
  }

  private debouncedReload(): void {
    // Debounce to prevent multiple rapid reloads
    if (this.reloadDebounceTimer) {
      clearTimeout(this.reloadDebounceTimer);
    }

    this.reloadDebounceTimer = setTimeout(() => {
      this.reload();
    }, 100); // 100ms debounce
  }

  private reload(): void {
    try {
      this.logger.info("Reloading configuration from .env file");

      // Reload .env file into process.env
      reloadDotenv({ path: this.envPath, override: true });

      // Revalidate environment variables
      const newConfig = validateEnv();

      // Update config and feature flags
      this.config = newConfig;
      this.featureFlags = this.loadFeatureFlags();

      this.logger.info("Configuration reloaded successfully");
    } catch (error) {
      this.logger.error("Failed to reload configuration", error as Error);
      // Keep the old configuration if reload fails
    }
  }

  /**
   * Manually reload configuration from .env file
   */
  public reloadConfig(): void {
    this.reload();
  }

  /**
   * Stop watching the .env file
   */
  public stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      this.logger.info("Stopped watching .env file");
    }

    if (this.reloadDebounceTimer) {
      clearTimeout(this.reloadDebounceTimer);
      this.reloadDebounceTimer = null;
    }
  }

  get<K extends keyof EnvConfig>(key: K): EnvConfig[K] {
    return this.config[key];
  }

  getAll(): Readonly<EnvConfig> {
    return Object.freeze({ ...this.config });
  }

  getFeatureFlag<K extends keyof FeatureFlags>(flag: K): FeatureFlags[K] {
    return this.featureFlags[flag];
  }

  getAllFeatureFlags(): Readonly<FeatureFlags> {
    return Object.freeze({ ...this.featureFlags });
  }

  isProduction(): boolean {
    return this.config.NODE_ENV === "production";
  }

  isDevelopment(): boolean {
    return this.config.NODE_ENV === "development";
  }

  isTest(): boolean {
    return this.config.NODE_ENV === "test";
  }
}
