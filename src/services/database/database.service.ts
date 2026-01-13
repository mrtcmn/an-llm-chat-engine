import type { DatabaseStrategy, PoolStats } from "./database.strategy";

export class DatabaseService implements DatabaseStrategy {
  private static instance: DatabaseService;

  constructor(private readonly strategy: DatabaseStrategy) {}

  static initialize(strategy: DatabaseStrategy): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService(strategy);
    }
    return DatabaseService.instance;
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      throw new Error(
        "DatabaseService not initialized. Call initialize() first.",
      );
    }
    return DatabaseService.instance;
  }

  getStrategy<T extends DatabaseStrategy>(): T {
    return this.strategy as T;
  }

  async connect(): Promise<void> {
    return this.strategy.connect();
  }

  async disconnect(): Promise<void> {
    return this.strategy.disconnect();
  }

  async reconnect(): Promise<void> {
    return this.strategy.reconnect();
  }

  async healthCheck(): Promise<boolean> {
    return this.strategy.healthCheck();
  }

  async isConnected(): Promise<boolean> {
    return this.strategy.isConnected();
  }

}
