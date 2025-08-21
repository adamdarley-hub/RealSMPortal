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

    console.log("🔄 VERCEL DEBUG - Sync endpoint called:", {
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString(),
    });

    if (req.method === "POST") {
      // Simple sync response for Vercel
      console.log("✅ VERCEL DEBUG - Sync completed successfully");

      return res.status(200).json({
        success: true,
        message: "Sync completed successfully",
        timestamp: new Date().toISOString(),
        environment: "vercel",
      });
    }

    if (req.method === "GET") {
      return res.status(200).json({
        status: "ready",
        endpoint: "sync",
        environment: "vercel",
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("🚨 VERCEL DEBUG - Sync endpoint error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
}
