import type { VercelRequest, VercelResponse } from "@vercel/node";

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

    console.log("🧪 VERCEL TEST - Config test endpoint called");

    // Check environment variables
    const envVars = {
      hasServeManagerBaseUrl: !!process.env.SERVEMANAGER_BASE_URL,
      hasServeManagerApiKey: !!process.env.SERVEMANAGER_API_KEY,
      serveManagerBaseUrl: process.env.SERVEMANAGER_BASE_URL || "NOT_SET",
      apiKeyLength: process.env.SERVEMANAGER_API_KEY?.length || 0,
    };

    // Check global config
    const globalConfig = {
      hasGlobalTempConfig: !!global.tempApiConfig,
      globalServeManager: global.tempApiConfig?.serveManager || null,
    };

    // Test ServeManager connection
    let connectionTest = null;
    const baseUrl =
      process.env.SERVEMANAGER_BASE_URL ||
      global.tempApiConfig?.serveManager?.baseUrl;
    const apiKey =
      process.env.SERVEMANAGER_API_KEY ||
      global.tempApiConfig?.serveManager?.apiKey;

    if (baseUrl && apiKey) {
      try {
        console.log("🔗 VERCEL TEST - Testing ServeManager connection...");
        const credentials = Buffer.from(`${apiKey}:`).toString("base64");

        // Test with account endpoint first
        const accountResponse = await fetch(`${baseUrl}/account`, {
          headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/json",
          },
        });

        connectionTest = {
          accountTest: {
            status: accountResponse.status,
            ok: accountResponse.ok,
          },
        };

        // If account works, test jobs endpoint
        if (accountResponse.ok) {
          const jobsResponse = await fetch(`${baseUrl}/jobs?per_page=1`, {
            headers: {
              Authorization: `Basic ${credentials}`,
              Accept: "application/vnd.api+json",
              "Content-Type": "application/vnd.api+json",
            },
          });

          connectionTest.jobsTest = {
            status: jobsResponse.status,
            ok: jobsResponse.ok,
            contentType: jobsResponse.headers.get("content-type"),
          };

          if (jobsResponse.ok) {
            const jobsData = await jobsResponse.json();
            connectionTest.jobsData = {
              hasData: !!jobsData.data,
              jobCount: jobsData.data?.length || 0,
              totalAvailable: jobsData.meta?.total || "unknown",
            };
          }
        }

        console.log("📡 VERCEL TEST - Connection test result:", connectionTest);
      } catch (error) {
        connectionTest = {
          error: error instanceof Error ? error.message : "Unknown error",
        };
        console.log("❌ VERCEL TEST - Connection test failed:", connectionTest);
      }
    }

    const result = {
      timestamp: new Date().toISOString(),
      environment: "vercel",
      request: {
        hostname: req.headers.host,
        url: req.url,
      },
      configuration: {
        environmentVariables: envVars,
        globalConfig: globalConfig,
      },
      serveManagerTest: connectionTest,
    };

    console.log("📋 VERCEL TEST - Full result:", result);

    return res.status(200).json(result);
  } catch (error) {
    console.error("🚨 VERCEL TEST - Error:", error);
    return res.status(500).json({
      error: "Test endpoint failed",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
}
