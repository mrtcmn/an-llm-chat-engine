import { AUTH } from "@config";
import fastifyJwt from "@fastify/jwt";
import type { JwtUserPayload } from "@middleware";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtUserPayload;
    user: JwtUserPayload;
  }
}

/**
 * JWT Plugin
 * Registers @fastify/jwt and decorates request with user and clientType
 * Must be registered before routes that use auth middleware
 */
async function jwtPluginCallback(fastify: FastifyInstance): Promise<void> {
  const jwtSecret = fastify.config.get("JWT_SECRET");

  // Register @fastify/jwt
  await fastify.register(fastifyJwt, {
    secret: jwtSecret,
    sign: {
      expiresIn: AUTH.ACCESS_TOKEN_EXPIRY, // Token expires in 7 days
    },
  });

  fastify.log.info("JWT plugin registered");
}

export const jwtPlugin = fp(jwtPluginCallback, {
  name: "jwt-plugin",
  dependencies: ["config-plugin"],
});
