import type { VercelRequest, VercelResponse } from "@vercel/node";

// Simple config storage for serverless environment
let tempConfig: any = {};

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
            tempConfig.serveManager?.baseUrl ||
            "",
          apiKey: process.env.SERVEMANAGER_API_KEY
            ? "***" + process.env.SERVEMANAGER_API_KEY.slice(-4)
            : tempConfig.serveManager?.apiKey
              ? "***" + tempConfig.serveManager.apiKey.slice(-4)
              : "",
          enabled: Boolean(
            process.env.SERVEMANAGER_BASE_URL ||
              tempConfig.serveManager?.enabled,
          ),
          testEndpoint: "/account",
        },
        stripe: {
          publishableKey:
            process.env.STRIPE_PUBLISHABLE_KEY ||
            tempConfig.stripe?.publishableKey ||
            "",
          secretKey: process.env.STRIPE_SECRET_KEY
            ? "***" + process.env.STRIPE_SECRET_KEY.slice(-4)
            : tempConfig.stripe?.secretKey
              ? "***" + tempConfig.stripe.secretKey.slice(-4)
              : "",
          webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
            ? "***" + process.env.STRIPE_WEBHOOK_SECRET.slice(-4)
            : tempConfig.stripe?.webhookSecret
              ? "***" + tempConfig.stripe.webhookSecret.slice(-4)
              : "",
          enabled: Boolean(
            process.env.STRIPE_SECRET_KEY || tempConfig.stripe?.enabled,
          ),
          environment:
            (process.env.STRIPE_ENVIRONMENT as "test" | "live") ||
            tempConfig.stripe?.environment ||
            "test",
        },
        radar: {
          publishableKey:
            process.env.RADAR_PUBLISHABLE_KEY ||
            tempConfig.radar?.publishableKey ||
            "",
          secretKey: process.env.RADAR_SECRET_KEY
            ? "***" + process.env.RADAR_SECRET_KEY.slice(-4)
            : tempConfig.radar?.secretKey
              ? "***" + tempConfig.radar.secretKey.slice(-4)
              : "",
          enabled: Boolean(
            process.env.RADAR_SECRET_KEY || tempConfig.radar?.enabled,
          ),
          environment:
            (process.env.RADAR_ENVIRONMENT as "test" | "live") ||
            tempConfig.radar?.environment ||
            "test",
        },
      };

      return res.status(200).json(config);
    }

    if (req.method === "POST") {
      console.log("Saving config in serverless environment...");

      // Store config temporarily (will be lost on function restart)
      tempConfig = req.body;

      console.log(
        "Config saved temporarily. For persistent storage, set these environment variables in Vercel:",
      );
      if (req.body.serveManager?.enabled) {
        console.log("SERVEMANAGER_BASE_URL=" + req.body.serveManager.baseUrl);
        console.log("SERVEMANAGER_API_KEY=your_api_key");
      }
      if (req.body.stripe?.enabled) {
        console.log("STRIPE_PUBLISHABLE_KEY=" + req.body.stripe.publishableKey);
        console.log("STRIPE_SECRET_KEY=your_stripe_secret");
        console.log("STRIPE_WEBHOOK_SECRET=your_webhook_secret");
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
