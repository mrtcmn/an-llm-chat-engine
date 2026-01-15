import { configPlugin } from "@config";
import { REQUEST } from "@config/constants";
import { rateLimitMiddleware, requestContextMiddleware } from "@middleware";
import { routerPlugin } from "@routes";
import { aiPlugin } from "@services/ai";
import { appCheckPlugin } from "@services/app-check";
import { jwtPlugin } from "@services/auth";
import { chatServicePlugin } from "@services/chat";
import { databasePlugin } from "@services/database";
import { swaggerPlugin } from "@services/docs";
import { loggerPlugin } from "@services/logger";
import { randomUUID } from "crypto";
import Fastify from "fastify";

const fastify = Fastify({
  genReqId: (req) => {
    // Use incoming x-request-id header if provided, otherwise generate UUID
    return (
      (req.headers[REQUEST.REQUEST_ID_HEADER] as string) ||
      `${process.env.APP_NAME}_${randomUUID()}`
    );
  },
  requestTimeout: REQUEST.DEFAULT_TIMEOUT,
  bodyLimit: REQUEST.MAX_PAYLOAD_SIZE,
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

fastify.register(databasePlugin);
fastify.register(aiPlugin);
fastify.register(chatServicePlugin);
fastify.register(jwtPlugin);
fastify.register(swaggerPlugin);
fastify.register(routerPlugin);

const start = async () => {
  try {
    const port = Number.parseInt(process.env.PORT || "3000", 10);
    await fastify.listen({ port, host: "0.0.0.0" });
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
