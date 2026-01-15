import type { ConfigService } from "@config";

export interface PoolStats {
  totalConnections: number;
  idleConnections: number;
  waitingRequests: number;
}

export interface DatabaseStrategy {
  // Lifecycle methods
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  reconnect(): Promise<void>;

  // Health & monitoring methods
  healthCheck(): Promise<boolean>;
  isConnected(): Promise<boolean>;
}

export interface DatabaseStrategyConstructor {
  new (config: ConfigService): DatabaseStrategy;
}
