import Fastify from "fastify";
import { randomUUID } from "crypto";
import { configPlugin } from "@config";
import { loggerPlugin } from "@services/logger";
import { appCheckPlugin } from "@services/app-check";
import { databasePlugin } from "@services/database";
import { aiPlugin } from "@services/ai";
import { chatServicePlugin } from "@services/chat";
import { jwtPlugin } from "@services/auth";
import { swaggerPlugin } from "@services/docs";
import { routerPlugin } from "@routes";
import { REQUEST } from "@config/constants";
import { requestContextMiddleware, rateLimitMiddleware } from "@middleware";

const isDevelopment = process.env.NODE_ENV === "development";

const fastify = Fastify({
  genReqId: (req) => {
    // Use incoming x-request-id header if provided, otherwise generate UUID
    return (req.headers[REQUEST.REQUEST_ID_HEADER] as string) || `${process.env.APP_NAME}_${randomUUID()}`;
  },

  disableRequestLogging: true, // Disable default request logging - we'll use custom onResponse hook

});

// Register plugins in dependency order
// Config plugin (all other plugins depend on it)
fastify.register(configPlugin);

// App Check plugin (depends on logger, globally validates Firebase App Check tokens)
fastify.register(appCheckPlugin);

// Logger plugin (depends on config, provides structured logging)
fastify.register(loggerPlugin);

// Request context middleware (globally sets correlation ID for all requests)
fastify.addHook("preHandler", requestContextMiddleware);

// Rate limit middleware (globally checks IP-based rate limits, blocks restricted IPs early)
fastify.addHook("preHandler", rateLimitMiddleware);

// Database plugin (depends on config)
fastify.register(databasePlugin);

// AI plugin (depends on config, provides AI service)
fastify.register(aiPlugin);

// Chat service plugin (depends on config, database)
fastify.register(chatServicePlugin);

// JWT plugin (depends on config, provides auth infrastructure)
fastify.register(jwtPlugin);

// Swagger plugin (depends on config, provides API documentation)
fastify.register(swaggerPlugin);

// Router plugin (depends on jwt, database, and chat services, registers all routes)
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
