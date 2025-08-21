// Temporarily removing this endpoint to stay under Vercel's 12 function limit
// Will consolidate into another endpoint
export default function() {
  return { message: "Debug endpoint temporarily disabled to reduce function count" };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    if (req.method === "GET") {
      console.log("🧪 VERCEL DEBUG TEST - API test endpoint called");

      // Check environment variables
      const envCheck = {
        hasServeManagerBaseUrl: !!process.env.SERVEMANAGER_BASE_URL,
        hasServeManagerApiKey: !!process.env.SERVEMANAGER_API_KEY,
        serveManagerBaseUrl: process.env.SERVEMANAGER_BASE_URL || "NOT_SET",
        apiKeyLength: process.env.SERVEMANAGER_API_KEY?.length || 0,
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
      };

      console.log("🔍 VERCEL DEBUG - Environment variables:", envCheck);

      // Check global config
      const globalCheck = {
        hasGlobalTempConfig: !!global.tempApiConfig,
        globalConfigKeys: global.tempApiConfig
          ? Object.keys(global.tempApiConfig)
          : [],
        globalServeManager: global.tempApiConfig?.serveManager || null,
      };

      console.log("🌍 VERCEL DEBUG - Global config:", globalCheck);

      // Test ServeManager connection if available
      let serveManagerTest = null;
      const baseUrl =
        process.env.SERVEMANAGER_BASE_URL ||
        global.tempApiConfig?.serveManager?.baseUrl;
      const apiKey =
        process.env.SERVEMANAGER_API_KEY ||
        global.tempApiConfig?.serveManager?.apiKey;

      if (baseUrl && apiKey) {
        try {
          console.log("🔗 VERCEL DEBUG - Testing ServeManager connection...");
          const credentials = Buffer.from(`${apiKey}:`).toString("base64");

          const testResponse = await fetch(`${baseUrl}/account`, {
            headers: {
              Authorization: `Basic ${credentials}`,
              "Content-Type": "application/json",
            },
          });

          serveManagerTest = {
            status: testResponse.status,
            statusText: testResponse.statusText,
            ok: testResponse.ok,
            contentType: testResponse.headers.get("content-type"),
          };

          console.log(
            "📡 VERCEL DEBUG - ServeManager test result:",
            serveManagerTest,
          );
        } catch (error) {
          serveManagerTest = {
            error: error instanceof Error ? error.message : "Unknown error",
          };
          console.log(
            "❌ VERCEL DEBUG - ServeManager test failed:",
            serveManagerTest,
          );
        }
      } else {
        console.log("⚠️ VERCEL DEBUG - ServeManager credentials not available");
      }

      const debugInfo = {
        timestamp: new Date().toISOString(),
        environment: envCheck,
        globalConfig: globalCheck,
        serveManagerTest,
        request: {
          hostname: req.headers.host,
          userAgent: req.headers["user-agent"],
          method: req.method,
          url: req.url,
        },
      };

      return res.status(200).json(debugInfo);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("🚨 VERCEL DEBUG - Test endpoint error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
}
