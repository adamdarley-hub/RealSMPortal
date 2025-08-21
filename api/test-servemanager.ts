import type { VercelRequest, VercelResponse } from "@vercel/node";

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

    if (req.method === "POST") {
      console.log("🧪 VERCEL TEST - ServeManager test endpoint called");
      
      const { baseUrl, apiKey } = req.body;
      
      if (!baseUrl || !apiKey) {
        return res.status(400).json({
          error: "Missing baseUrl or apiKey",
          success: false,
        });
      }

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

        const result = {
          success: accountResponse.ok,
          status: accountResponse.status,
          message: accountResponse.ok 
            ? "Connection successful" 
            : `Connection failed with status ${accountResponse.status}`,
        };

        console.log("📡 VERCEL TEST - Connection test result:", result);
        return res.status(200).json(result);
      } catch (error) {
        console.error("❌ VERCEL TEST - Connection test failed:", error);
        return res.status(200).json({
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("🚨 VERCEL TEST - Error:", error);
    return res.status(500).json({
      error: "Test endpoint failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
