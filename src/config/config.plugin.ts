import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { ConfigService } from "./config.service";

declare module "fastify" {
  interface FastifyInstance {
    config: ConfigService;
  }
}

const configPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Initialize ConfigService singleton
  const config = ConfigService.getInstance();

  // Decorate Fastify instance with config
  fastify.decorate("config", config);

  fastify.log.info("[ConfigPlugin] Configuration loaded");
};

export default fp(configPlugin, {
  name: "config-plugin",
  fastify: "5.x",
});
