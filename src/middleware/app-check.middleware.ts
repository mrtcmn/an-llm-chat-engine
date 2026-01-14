import type { FastifyRequest, FastifyReply } from "fastify";

/**
 * Firebase App Check verification middleware (mocked for now)
 * In production: verify Firebase App Check token from X-Firebase-AppCheck header
 */
export async function appCheckMiddleware(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const appCheckToken = req.headers["x-firebase-appcheck"] as string | undefined;

  // TODO: In production, verify token with Firebase Admin SDK
  // const decodedToken = await getAppCheck().verifyToken(appCheckToken);

  if (appCheckToken) {
    req.logger.debug("App Check: token present (mocked verification)", { hasToken: true });
  } else {
    req.logger.debug("App Check: no token (mocked - passing)", { hasToken: false });
  }

  // Currently mocked - always passes
  // In production, throw error if verification fails
}
