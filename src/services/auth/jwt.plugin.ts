import fastifyJwt from "@fastify/jwt";
import fp from "fastify-plugin";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { JwtUserPayload } from "@middleware";



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

  fastify.log.info("JWT plugin registered");


  
}

export const jwtPlugin = fp(jwtPluginCallback, {
  name: "jwt-plugin",
  dependencies: ["config-plugin"],
});
