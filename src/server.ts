import Fastify from "fastify";
import { configPlugin } from "@config";
import { databasePlugin } from "@services/database";
import { aiPlugin } from "@services/ai";
import { chatServicePlugin } from "@services/chat";
import { jwtPlugin } from "@services/auth";
import { swaggerPlugin } from "@services/docs";
import { routerPlugin } from "@routes";

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

// Register plugins in dependency order
// 1. Config plugin (all other plugins depend on it)
fastify.register(configPlugin);

// 2. Database plugin (depends on config)
fastify.register(databasePlugin);

// 4. AI plugin (depends on config, provides AI service)
fastify.register(aiPlugin);

// 5. Chat service plugin (depends on config, database)
fastify.register(chatServicePlugin);

// 6. JWT plugin (depends on config, provides auth infrastructure)
fastify.register(jwtPlugin);

// 7. Swagger plugin (depends on config, provides API documentation)
fastify.register(swaggerPlugin);

// 8. Router plugin (depends on jwt, database, and chat services, registers all routes)
fastify.register(routerPlugin);

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
