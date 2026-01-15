import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { DatabaseService } from "./database.service";
import { PrismaService } from "./prisma.service";

declare module "fastify" {
  interface FastifyInstance {
    db: DatabaseService;
  }
}

const databasePlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Get config from Fastify instance (DI pattern)
  const config = fastify.config;

  // Initialize database service with Prisma strategy (inject config)
  const prismaService = new PrismaService(config);
  const db = DatabaseService.initialize(prismaService);

  fastify.log.info("[DatabasePlugin] Initializing database connection...");

  try {
    await db.connect();
    fastify.log.info("[DatabasePlugin] Database connected successfully");
  } catch (error) {
    fastify.log.error(
      { err: error },
      "[DatabasePlugin] Failed to connect to database"
    );
    throw error;
  }

  // Decorate Fastify instance with database service
  fastify.decorate("db", db);

  // Setup periodic health check with auto-reconnect
  let healthCheckInterval: NodeJS.Timeout | null = null;

  if (config.get("DB_HEALTH_CHECK_ENABLED")) {
    const interval = config.get("DB_HEALTH_CHECK_INTERVAL");

    fastify.log.info(
      { interval },
      "[DatabasePlugin] Starting health check monitoring"
    );

    healthCheckInterval = setInterval(async () => {
      try {
        const isHealthy = await db.healthCheck();

        if (!isHealthy) {
          fastify.log.warn(
            "[DatabasePlugin] Health check failed, attempting reconnection..."
          );

          try {
            await db.reconnect();
            fastify.log.info("[DatabasePlugin] Reconnection successful");
          } catch (reconnectError) {
            fastify.log.error(
              { err: reconnectError },
              "[DatabasePlugin] Reconnection failed"
            );
          }
        }
      } catch (error) {
        fastify.log.error(
          { err: error },
          "[DatabasePlugin] Error during health check"
        );
      }
    }, interval);
  }

  // Graceful shutdown hook
  fastify.addHook("onClose", async (instance) => {
    instance.log.info("[DatabasePlugin] Closing database connection...");

    // Clear health check interval
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
      instance.log.info("[DatabasePlugin] Health check monitoring stopped");
    }

    try {
      await db.disconnect();
      instance.log.info(
        "[DatabasePlugin] Database connection closed successfully"
      );
    } catch (error) {
      instance.log.error(
        { err: error },
        "[DatabasePlugin] Error closing database connection"
      );
      throw error;
    }
  });

  fastify.log.info("[DatabasePlugin] Database plugin registered");
};

export default fp(databasePlugin, {
  name: "database-plugin",
  fastify: "5.x",
  dependencies: ["config-plugin"], // Explicitly declare dependency on config plugin
});
