import type { VercelRequest, VercelResponse } from "@vercel/node";

// Extend global for temporary config storage in serverless environments
declare global {
  var tempApiConfig: any | undefined;
}

// Initialize global config if not exists
if (!global.tempApiConfig) {
  global.tempApiConfig = {};
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    if (req.method === "GET") {
      // Return current config (with masked sensitive values)
      const config = {
        serveManager: {
          baseUrl:
            process.env.SERVEMANAGER_BASE_URL ||
            global.tempApiConfig?.serveManager?.baseUrl ||
            "",
          apiKey: process.env.SERVEMANAGER_API_KEY
            ? "***" + process.env.SERVEMANAGER_API_KEY.slice(-4)
            : global.tempApiConfig?.serveManager?.apiKey
              ? "***" + global.tempApiConfig.serveManager.apiKey.slice(-4)
              : "",
          enabled: Boolean(
            process.env.SERVEMANAGER_BASE_URL ||
              global.tempApiConfig?.serveManager?.enabled,
          ),
          testEndpoint: "/account",
        },
        stripe: {
          publishableKey:
            process.env.STRIPE_PUBLISHABLE_KEY ||
            global.tempApiConfig?.stripe?.publishableKey ||
            "",
          secretKey: process.env.STRIPE_SECRET_KEY
            ? "***" + process.env.STRIPE_SECRET_KEY.slice(-4)
            : global.tempApiConfig?.stripe?.secretKey
              ? "***" + global.tempApiConfig.stripe.secretKey.slice(-4)
              : "",
          webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
            ? "***" + process.env.STRIPE_WEBHOOK_SECRET.slice(-4)
            : global.tempApiConfig?.stripe?.webhookSecret
              ? "***" + global.tempApiConfig.stripe.webhookSecret.slice(-4)
              : "",
          enabled: Boolean(
            process.env.STRIPE_SECRET_KEY || global.tempApiConfig?.stripe?.enabled,
          ),
          environment:
            (process.env.STRIPE_ENVIRONMENT as "test" | "live") ||
            global.tempApiConfig?.stripe?.environment ||
            "test",
        },
        radar: {
          publishableKey:
            process.env.RADAR_PUBLISHABLE_KEY ||
            global.tempApiConfig?.radar?.publishableKey ||
            "",
          secretKey: process.env.RADAR_SECRET_KEY
            ? "***" + process.env.RADAR_SECRET_KEY.slice(-4)
            : global.tempApiConfig?.radar?.secretKey
              ? "***" + global.tempApiConfig.radar.secretKey.slice(-4)
              : "",
          enabled: Boolean(
            process.env.RADAR_SECRET_KEY || global.tempApiConfig?.radar?.enabled,
          ),
          environment:
            (process.env.RADAR_ENVIRONMENT as "test" | "live") ||
            global.tempApiConfig?.radar?.environment ||
            "test",
        },
      };

      return res.status(200).json(config);
    }

    if (req.method === "POST") {
      console.log("Saving config in serverless environment...");

      const newConfig = req.body;
      console.log("Received config:", JSON.stringify(newConfig, null, 2));

      // Don't update masked keys - keep the real values from environment
      const configToStore = { ...newConfig };

      // If ServeManager API key is masked, keep the environment value
      if (configToStore.serveManager?.apiKey?.startsWith("***")) {
        if (
          tempConfig.serveManager?.apiKey &&
          !tempConfig.serveManager.apiKey.startsWith("***")
        ) {
          configToStore.serveManager.apiKey = tempConfig.serveManager.apiKey;
        }
        // Don't store masked keys
        delete configToStore.serveManager.apiKey;
      }

      // Similar for other masked fields
      if (configToStore.stripe?.secretKey?.startsWith("***")) {
        delete configToStore.stripe.secretKey;
      }
      if (configToStore.stripe?.webhookSecret?.startsWith("***")) {
        delete configToStore.stripe.webhookSecret;
      }
      if (configToStore.radar?.secretKey?.startsWith("***")) {
        delete configToStore.radar.secretKey;
      }

      // Store config temporarily (will be lost on function restart)
      tempConfig = { ...tempConfig, ...configToStore };

      console.log(
        "Config saved temporarily. For persistent storage, set these environment variables in Vercel:",
      );
      if (newConfig.serveManager?.enabled) {
        console.log("SERVEMANAGER_BASE_URL=" + newConfig.serveManager.baseUrl);
        if (
          newConfig.serveManager.apiKey &&
          !newConfig.serveManager.apiKey.startsWith("***")
        ) {
          console.log("SERVEMANAGER_API_KEY=" + newConfig.serveManager.apiKey);
        }
      }
      if (newConfig.stripe?.enabled) {
        console.log(
          "STRIPE_PUBLISHABLE_KEY=" + newConfig.stripe.publishableKey,
        );
        if (
          newConfig.stripe.secretKey &&
          !newConfig.stripe.secretKey.startsWith("***")
        ) {
          console.log("STRIPE_SECRET_KEY=" + newConfig.stripe.secretKey);
        }
      }

      return res.status(200).json({
        message:
          "Configuration saved successfully for this session. Set environment variables in Vercel for persistence.",
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Config API error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
