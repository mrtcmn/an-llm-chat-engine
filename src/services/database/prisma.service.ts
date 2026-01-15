import { PrismaClient } from "@generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import type { DatabaseStrategy, PoolStats } from "./database.strategy";
import type { ConfigService } from "@config";
import { LoggerService } from "@utils/logger";

export class PrismaService implements DatabaseStrategy {
  public client: PrismaClient;
  private pool: pg.Pool;
  private config: ConfigService;
  private logger = LoggerService.getInstance().forService('PrismaService');

  constructor(config: ConfigService) {
    this.config = config;
    const connectionString = config.get("DATABASE_URL");

    this.pool = new pg.Pool({
      connectionString,
      min: this.config.get("DB_POOL_MIN"),
      max: this.config.get("DB_POOL_MAX"),
      connectionTimeoutMillis: this.config.get("DB_CONNECTION_TIMEOUT"),
      idleTimeoutMillis: this.config.get("DB_IDLE_TIMEOUT"),
    });

    const adapter = new PrismaPg(this.pool);

    this.client = new PrismaClient({
      adapter,
      log: this.config.isDevelopment()
        ? ["error", "warn"]
        : ["error", "warn"],
    });
  }

  private async connectWithRetry(): Promise<void> {
    const maxRetries = this.config.get("DB_MAX_RETRY_ATTEMPTS");
    const baseDelay = this.config.get("DB_RETRY_BASE_DELAY");

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await this.client.$connect();
        this.logger.info('Connected successfully', { attempt: attempt + 1 });
        return;
      } catch (error) {
        this.logger.error('Connection attempt failed', error as Error, {
          attempt: attempt + 1,
          maxRetries,
        });

        if (attempt === maxRetries - 1) {
          throw new Error(
            `Failed to connect to database after ${maxRetries} attempts. ` +
            `Last error: ${error instanceof Error ? error.message : String(error)}`,
          );
        }

        const delay = baseDelay * Math.pow(2, attempt);
        this.logger.info('Retrying connection', { delay, attempt: attempt + 1 });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  async connect(): Promise<void> {
    await this.connectWithRetry();
  }

  async disconnect(): Promise<void> {
    await this.client.$disconnect();
    await this.pool.end();
    this.logger.info('Database disconnected');
  }

  async reconnect(): Promise<void> {
    this.logger.info('Initiating reconnection');
    await this.disconnect();
    await this.connectWithRetry();
    this.logger.info('Reconnection successful');
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  async isConnected(): Promise<boolean> {
    try {
      await this.client.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  async executeInTransaction<T>(
    fn: (
      tx: Omit<
        PrismaClient,
        | "$connect"
        | "$disconnect"
        | "$on"
        | "$transaction"
        | "$use"
        | "$extends"
      >,
    ) => Promise<T>,
  ): Promise<T> {
    return this.client.$transaction(fn);
  }
}
