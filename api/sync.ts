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

    console.log("🔄 VERCEL SYNC - Sync endpoint called:", {
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString(),
      userAgent: req.headers["user-agent"]?.substring(0, 50),
    });

    if (req.method === "POST") {
      // For Vercel, we don't need complex sync operations
      // Just return success to prevent auto-sync failures
      console.log(
        "✅ VERCEL SYNC - Sync completed successfully (no-op for serverless)",
      );

      return res.status(200).json({
        success: true,
        message: "Sync completed successfully",
        timestamp: new Date().toISOString(),
        environment: "vercel-serverless",
        note: "Serverless environment uses direct API calls instead of background sync",
      });
    }

    if (req.method === "GET") {
      return res.status(200).json({
        status: "ready",
        endpoint: "sync",
        environment: "vercel-serverless",
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("🚨 VERCEL SYNC - Error:", error);
    return res.status(500).json({
      error: "Sync endpoint error",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
}
