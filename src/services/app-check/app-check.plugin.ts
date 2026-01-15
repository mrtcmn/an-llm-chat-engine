import type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import fp from "fastify-plugin";

export interface AppCheckInfo {
  verified: boolean;
  appId?: string;
  appName?: string;
  verifiedAt?: Date;
}

declare module "fastify" {
  interface FastifyRequest {
    appCheck: AppCheckInfo;
  }
}

/**
 * Firebase App Check Plugin
 * Globally attaches appCheck info to all requests via preHandler hook
 */
const appCheckPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.addHook(
    "onRequest",
    async (req: FastifyRequest, reply: FastifyReply) => {
      const appCheckToken =
        req.headers["x-firebase-appcheck"] || "mockly_passed_:)";

      // TODO: In production, verify with Firebase Admin SDK
      // const decodedToken = await getAppCheck().verifyToken(appCheckToken);

      if (appCheckToken) {
        req.appCheck = {
          verified: true,
          appId: "1:123456789:web:abc123def456",
          appName: "chat-web-app",
          verifiedAt: new Date(),
        };
      } else {
        req.appCheck = {
          verified: false,
        };
      }

      // In production: throw if verification fails
    }
  );

  fastify.log.info("[AppCheckPlugin] Firebase App Check initialized (mocked)");
};

export default fp(appCheckPlugin, {
  name: "app-check-plugin",
  fastify: "5.x",
});
