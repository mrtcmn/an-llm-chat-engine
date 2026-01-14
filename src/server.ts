import Fastify from "fastify";
import { randomUUID } from "crypto";
import { configPlugin } from "@config";
import { loggerPlugin } from "@services/logger";
import { databasePlugin } from "@services/database";
import { aiPlugin } from "@services/ai";
import { chatServicePlugin } from "@services/chat";
import { jwtPlugin } from "@services/auth";
import { swaggerPlugin } from "@services/docs";
import { routerPlugin } from "@routes";
import { REQUEST } from "@config/constants";

const isDevelopment = process.env.NODE_ENV === "development";

const fastify = Fastify({
  genReqId: (req) => {
    // Use incoming x-request-id header if provided, otherwise generate UUID
    return (req.headers[REQUEST.REQUEST_ID_HEADER] as string) || `${process.env.APP_NAME}_${randomUUID()}`;
  },

  disableRequestLogging: true, // Disable default request logging - we'll use custom onResponse hook

});

// Register plugins in dependency order
// 1. Config plugin (all other plugins depend on it)
fastify.register(configPlugin);

// 2. Logger plugin (depends on config, provides structured logging)
fastify.register(loggerPlugin);

// 3. Database plugin (depends on config)
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

// Add custom response logging hook - log at appropriate level based on status code
fastify.addHook('onResponse', async (req, reply) => {
  const responseTime = reply.elapsedTime;
  const statusCode = reply.statusCode;

  const logData = {
    method: req.method,
    url: req.url,
    statusCode,
    responseTime,
  };

  // Log at appropriate level based on status code
  if (statusCode >= 500) {
    req.logger.error('Request completed with server error', undefined, logData);
  } else if (statusCode >= 400) {
    req.logger.warn('Request completed with client error', logData);
  } else {
    req.logger.info('Request completed successfully', logData);
  }
});

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
