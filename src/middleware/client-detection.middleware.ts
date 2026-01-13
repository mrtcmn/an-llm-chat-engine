import type { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from "fastify";

export type ClientType = "web" | "mobile" | "desktop" | "unknown";

/**
 * Parse User-Agent to determine client type
 */
function parseUserAgent(userAgent: string | undefined): ClientType {
  if (!userAgent) return "unknown";

  const ua = userAgent.toLowerCase();

  // Mobile detection
  if (
    ua.includes("mobile") ||
    ua.includes("android") ||
    ua.includes("iphone") ||
    ua.includes("ipad") ||
    ua.includes("ipod")
  ) {
    return "mobile";
  }

  // Desktop detection (Electron or similar)
  if (ua.includes("electron") || ua.includes("desktop")) {
    return "desktop";
  }

  // Default to web for browser user agents
  if (
    ua.includes("mozilla") ||
    ua.includes("chrome") ||
    ua.includes("safari") ||
    ua.includes("firefox") ||
    ua.includes("edge")
  ) {
    return "web";
  }

  return "unknown";
}

/**
 * Client detection middleware
 * Detects client type from X-Client-Type header or User-Agent
 * Attaches clientType to request for downstream use
 */
export function clientDetectionMiddleware(
  req: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction,
): void {
  // Prefer explicit header over User-Agent parsing
  const headerClientType = req.headers["x-client-type"] as string | undefined;

  let clientType: ClientType;

  if (headerClientType && isValidClientType(headerClientType)) {
    clientType = headerClientType as ClientType;
  } else {
    clientType = parseUserAgent(req.headers["user-agent"]);
  }

  // Attach to request for downstream middleware/handlers
  req.clientType = clientType;

  req.log.debug({ clientType }, "Client type detected");

  done();
}

function isValidClientType(type: string): type is ClientType {
  return ["web", "mobile", "desktop", "unknown"].includes(type);
}
