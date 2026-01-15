/**
 * BASE ROUTE TEMPLATE
 * 
 * Use this as a starting point for creating new route files.
 * This template demonstrates:
 * - Proper imports and type safety
 * - Middleware chain registration (optional)
 * - Schema definitions for documentation
 * - Error handling with AppError
 * - Consistent response patterns
 * 
 * USAGE:
 * 1. Copy this file and rename it (e.g., users.routes.ts)
 * 2. Update the route function name and export
 * 3. Add/remove middleware as needed
 * 4. Define your routes following the patterns below
 * 5. Register in src/routes/index.ts
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  registerMiddlewareChain,
  authMiddleware,
  clientDetectionMiddleware,
  loggingMiddleware,
  AppError,
} from "@middleware";
import { HTTP_STATUS } from "@config";

/**
 * Request type interfaces
 * Define your request param, query, and body types here
 */
interface ExampleParamsRequest {
  Params: {
    id: string;
  };
}

interface ExampleQueryRequest {
  Querystring: {
    limit?: number;
    offset?: number;
  };
}

interface ExampleBodyRequest {
  Body: {
    name: string;
    email: string;
  };
}

/**
 * Example Routes Plugin
 * 
 * Endpoints:
 *   GET  /examples           - List all examples (authenticated)
 *   GET  /examples/:id       - Get a specific example (authenticated)
 *   POST /examples           - Create a new example (authenticated)
 *   GET  /public/examples    - Public endpoint (no auth)
 */
export async function exampleRoutes(fastify: FastifyInstance): Promise<void> {
  // OPTION 1: Apply middleware chain to ALL routes in this plugin
  // Use for routes that all require the same middleware
  registerMiddlewareChain(fastify, [
    authMiddleware,
    clientDetectionMiddleware,
    loggingMiddleware,
  ]);

  /**
   * PATTERN 1: Simple GET endpoint with path parameters
   */
  fastify.get<ExampleParamsRequest>(
    "/:id",
    {
      schema: {
        description: "Get a specific example by ID",
        tags: ["examples"],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", description: "Example ID" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              createdAt: { type: "string" },
            },
          },
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
              message: { type: "string" },
              statusCode: { type: "number" },
            },
          },
        },
      },
    },
    async (req: FastifyRequest<ExampleParamsRequest>, reply: FastifyReply) => {
      const { id } = req.params;
      const userId = req.user!.sub; // Safe because authMiddleware is registered

      // Example: Fetch from service/repository
      // const example = await fastify.exampleService.getById(id, userId);
      
      // Example: Handle not found case
      const example = null as any; // Simulated - replace with actual service call
      if (!example) {
        throw AppError.notFound("Example", { 
          userId,
          errorCategory: "resource",
          metadata: { id },
        });
      }

      return {
        id: example.id,
        name: example.name,
        createdAt: example.createdAt.toISOString(),
      };
    }
  );

  /**
   * PATTERN 2: GET endpoint with query parameters
   */
  fastify.get<ExampleQueryRequest>(
    "/",
    {
      schema: {
        description: "List all examples with pagination",
        tags: ["examples"],
        querystring: {
          type: "object",
          properties: {
            limit: { type: "number", minimum: 1, maximum: 100, default: 20 },
            offset: { type: "number", minimum: 0, default: 0 },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                  },
                },
              },
              pagination: {
                type: "object",
                properties: {
                  limit: { type: "number" },
                  offset: { type: "number" },
                  total: { type: "number" },
                },
              },
            },
          },
        },
      },
    },
    async (req: FastifyRequest<ExampleQueryRequest>, reply: FastifyReply) => {
      const { limit = 20, offset = 0 } = req.query;
      const userId = req.user!.sub;

      // Example: Fetch from service with pagination
      // const result = await fastify.exampleService.list(userId, { limit, offset });

      return {
        data: [], // Your data here
        pagination: {
          limit,
          offset,
          total: 0,
        },
      };
    }
  );

  /**
   * PATTERN 3: POST endpoint with request body
   */
  fastify.post<ExampleBodyRequest>(
    "/",
    {
      schema: {
        description: "Create a new example",
        tags: ["examples"],
        body: {
          type: "object",
          required: ["name", "email"],
          properties: {
            name: { type: "string", minLength: 1, maxLength: 255 },
            email: { type: "string", format: "email" },
          },
        },
        response: {
          201: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              email: { type: "string" },
              createdAt: { type: "string" },
            },
          },
          400: {
            type: "object",
            properties: {
              error: { type: "string" },
              message: { type: "string" },
              statusCode: { type: "number" },
            },
          },
        },
      },
    },
    async (req: FastifyRequest<ExampleBodyRequest>, reply: FastifyReply) => {
      const { name, email } = req.body;
      const userId = req.user!.sub;

      // Example: Validation
      if (!email.includes("@")) {
        throw AppError.badRequest("Invalid email format", { 
          email,
          errorCategory: "validation",
        });
      }

      // Example: Create via service
      // const created = await fastify.exampleService.create({ name, email, userId });

      const created = {
        id: "example-id",
        name,
        email,
        createdAt: new Date(),
      };

      return reply.status(HTTP_STATUS.CREATED).send({
        id: created.id,
        name: created.name,
        email: created.email,
        createdAt: created.createdAt.toISOString(),
      });
    }
  );

  /**
   * PATTERN 4: Public endpoint (no authentication)
   * Register in a separate plugin instance or use nested registration
   */
  fastify.register(async (publicInstance) => {
    // OPTION 2: Apply different middleware chain for specific route groups
    // This example has NO auth middleware
    registerMiddlewareChain(publicInstance, [
      clientDetectionMiddleware,
      loggingMiddleware,
    ]);

    publicInstance.get(
      "/",
      {
        schema: {
          description: "Public endpoint - no authentication required",
          tags: ["examples", "public"],
          response: {
            200: {
              type: "object",
              properties: {
                message: { type: "string" },
              },
            },
          },
        },
      },
      async (req: FastifyRequest, reply: FastifyReply) => {
        return {
          message: "This is a public endpoint",
        };
      }
    );
  }, { prefix: "/public" });

  fastify.log.info("Example routes registered");
}

/**
 * ERROR HANDLING PATTERNS
 * 
 * Use AppError for consistent error responses:
 * 
 * 1. Not Found (404):
 *    throw AppError.notFound("Resource", { id, userId });
 * 
 * 2. Bad Request (400):
 *    throw AppError.badRequest("Invalid input", { field: "email" });
 * 
 * 3. Unauthorized (401):
 *    throw AppError.unauthorized("Invalid token");
 * 
 * 4. Forbidden (403):
 *    throw AppError.forbidden("Access denied", { userId, resourceId });
 * 
 * 5. Conflict (409):
 *    throw AppError.conflict("Resource already exists", { email });
 * 
 * 6. Internal Error (500):
 *    throw AppError.internal("Something went wrong", { operation: "create" });
 * 
 * 7. Rate Limit (429):
 *    throw AppError.tooManyRequests("Too many requests");
 */

/**
 * MIDDLEWARE CHAIN PATTERNS
 * 
 * Common middleware combinations:
 * 
 * 1. Authenticated routes:
 *    [authMiddleware, clientDetectionMiddleware, loggingMiddleware]
 * 
 * 2. Public routes:
 *    [clientDetectionMiddleware, loggingMiddleware]
 * 
 * 3. Admin routes:
 *    [authMiddleware, adminCheckMiddleware, loggingMiddleware]
 * 
 * 4. No middleware (e.g., health checks):
 *    [] or don't call registerMiddlewareChain
 */

/**
 * REGISTRATION IN src/routes/index.ts
 * 
 * Add this to your main router:
 * 
 * import { exampleRoutes } from "./example.routes";
 * 
 * // Inside routerPluginCallback:
 * api.register(exampleRoutes, { prefix: "/examples" });
 * 
 * // Export for reuse:
 * export { exampleRoutes } from "./example.routes.js";
 */
