import fastifyJwt from "@fastify/jwt";
import fp from "fastify-plugin";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { JwtUserPayload } from "@middleware";
import type { ClientType } from "@middleware";

/**
 * Extend Fastify types to include our custom decorators
 */
declare module "fastify" {
  interface FastifyRequest {
    clientType: ClientType;
  }
}

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
      expiresIn: "7d", // Token expires in 7 days
    },
  });

  // Decorate request with clientType (set by client detection middleware)
  // Note: user is already decorated by @fastify/jwt
  fastify.decorateRequest("clientType", "unknown");

  fastify.log.info("JWT plugin registered");


  
}

export const jwtPlugin = fp(jwtPluginCallback, {
  name: "jwt-plugin",
  dependencies: ["config-plugin"],
});
