import type { FastifyRequest, FastifyReply } from "fastify";
import { UAParser } from "ua-parser-js";

export type ClientType = "web" | "mobile" | "desktop" | "unknown";

declare module "fastify" {
  interface FastifyRequest {
    clientType: ClientType;
  }
}

function parseUserAgent(userAgent: string | undefined): ClientType {
  if (!userAgent) return "unknown";

  try {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    const device = result.device;
    const browser = result.browser;
    const os = result.os;
    const ua = userAgent.toLowerCase();

    if (ua.includes("electron")) {
      return "desktop";
    }

    if (ua.includes("desktop")) {
      if (os.name && ["Windows", "Mac OS", "Linux", "Ubuntu", "Debian", "Fedora"].includes(os.name)) {
        return "desktop";
      }
      return "desktop";
    }

    if (device.type && ["mobile", "tablet", "wearable"].includes(device.type)) {
      return "mobile";
    }

    if (os.name && ["Android", "iOS", "Windows Phone", "BlackBerry", "webOS"].includes(os.name)) {
      return "mobile";
    }

    if (
      ua.includes("android") ||
      ua.includes("iphone") ||
      ua.includes("ipad") ||
      ua.includes("ipod") ||
      (ua.includes("mobile") && !ua.includes("mobile safari"))
    ) {
      return "mobile";
    }

    if (browser.name) {
      const webBrowsers = [
        "Chrome", "Firefox", "Safari", "Edge", "Opera", "IE", 
        "Chromium", "Brave", "Vivaldi", "Arc", "Samsung Browser", "Mobile Safari"
      ];
      
      if (webBrowsers.some(b => browser.name?.includes(b))) {
        return "web";
      }
    }

    if (os.name && ["Windows", "Mac OS", "Linux", "Ubuntu", "Debian", "Fedora", "Chrome OS"].includes(os.name)) {
      return "web";
    }

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
  } catch (error) {
    return "unknown";
  }
}

export async function clientDetectionMiddleware(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    const headerClientType = req.headers["x-client-type"] as string | undefined;

    let clientType: ClientType;

    if (headerClientType && isValidClientType(headerClientType)) {
      clientType = headerClientType as ClientType;
    } else {
      clientType = parseUserAgent(req.headers["user-agent"]);
    }

    req.clientType = clientType;

    req.logger.debug("[Middleware] ClientDetection: client type detected", { clientType });
  } catch (error) {
    req.logger.info("[Middleware] ClientDetection: failed to detect client type, using unknown", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    req.clientType = "unknown";
  }
}

function isValidClientType(type: string): type is ClientType {
  return ["web", "mobile", "desktop", "unknown"].includes(type);
}
