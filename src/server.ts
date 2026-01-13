import Fastify from "fastify";
import { configPlugin } from "@config";
import { databasePlugin } from "@services/database";

const isDevelopment = process.env.NODE_ENV !== "production";

const fastify = Fastify({
  logger: isDevelopment
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss Z",
            ignore: "pid,hostname",
          },
        },
      }
    : true, // Structured JSON output for production
});

// Register config plugin first (all other plugins depend on it)
fastify.register(configPlugin);

// Register database plugin (depends on config plugin)
fastify.register(databasePlugin);

const start = async () => {
  try {
    // Access config from fastify instance (DI pattern)
    const port = parseInt(process.env.PORT || "3000");
    await fastify.listen({ port: port, host: "0.0.0.0" });
    fastify.log.info(`Server listening on port ${port}`);
  } catch (err) {
    fastify.log.error({ err }, "Error starting server");
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async (signal: string) => {
  fastify.log.info(`Received ${signal}, starting graceful shutdown...`);
  try {
    await fastify.close();
    fastify.log.info("Graceful shutdown completed");
    process.exit(0);
  } catch (err) {
    fastify.log.error({ err }, "Error during graceful shutdown");
    process.exit(1);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start();
