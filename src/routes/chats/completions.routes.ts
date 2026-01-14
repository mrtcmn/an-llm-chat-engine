import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  registerMiddlewareChain,
  authMiddleware,
  clientDetectionMiddleware,
  loggingMiddleware,
  routeSchemas,
} from "@middleware";

interface CreateCompletionRequest {
  Params: {
    chatId: string;
  };
  Body: {
    message: string;
  };
}

/**
 * Chat completions routes - POST /chats/:chatId/completion
 */
export async function completionsRoutes(fastify: FastifyInstance): Promise<void> {
  registerMiddlewareChain(fastify, [
    authMiddleware,
    clientDetectionMiddleware,
    loggingMiddleware,
  ]);

  fastify.post<CreateCompletionRequest>(
    "/:chatId/completion",
    {
      schema: routeSchemas.createCompletion,
    },
    async (req: FastifyRequest<CreateCompletionRequest>, reply: FastifyReply) => {
      const { chatId } = req.params;
      const { message } = req.body;
      const userId = req.user!.sub;

      return fastify.completionService.createCompletion(
        req,
        reply,
        chatId,
        message,
        userId,
      );
    },
  );

  fastify.log.info("Completion routes registered");
}
