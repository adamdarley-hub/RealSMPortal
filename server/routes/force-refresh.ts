import { RequestHandler } from "express";
import { cacheService } from "../services/cache-service";

// Force a complete refresh - in serverless mode, this just confirms data is fetched fresh
export const forceRefresh: RequestHandler = async (req, res) => {
  try {
    const startTime = Date.now();
    console.log(
      "🔄 Force refresh requested - fetching fresh data from ServeManager...",
    );

    console.log("🚀 Starting fresh data fetch from ServeManager...");

    // In serverless mode, we don't need to clear cache - just fetch fresh data
    const results = await cacheService.syncAllData();

    const totalTime = Date.now() - startTime;

    console.log(`✅ Force refresh completed in ${totalTime}ms`);

    res.json({
      success: true,
      message: "Fresh data fetched successfully from ServeManager",
      results,
      duration_ms: totalTime,
      mode: "serverless",
    });
  } catch (error) {
    console.error("❌ Force refresh failed:", error);
    res.status(500).json({
      success: false,
      error: "Force refresh failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
