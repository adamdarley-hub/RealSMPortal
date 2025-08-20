import { RequestHandler } from "express";
import { db } from "../db/database";
import { jobs, clients, servers } from "../db/schema";
import { cacheService } from "../services/cache-service";

// Force a complete refresh - clear cache and resync everything
export const forceRefresh: RequestHandler = async (req, res) => {
  try {
    if (!db) {
      console.log("Database not available, skipping force refresh");
      return res.json({
        success: true,
        message: "Database not available - running without cache",
        results: {},
        duration_ms: 0,
      });
    }

    const startTime = Date.now();
    console.log("🔄 Force refresh requested - clearing cache and resyncing...");

    // Clear all cached data
    console.log("🗑️ Clearing cached jobs...");
    await db.delete(jobs).run();

    console.log("🗑️ Clearing cached clients...");
    await db.delete(clients).run();

    console.log("🗑️ Clearing cached servers...");
    await db.delete(servers).run();

    console.log("🚀 Starting fresh sync from ServeManager...");

    // Trigger fresh sync of all data
    const results = await cacheService.syncAllData();

    const totalTime = Date.now() - startTime;

    console.log(`✅ Force refresh completed in ${totalTime}ms`);

    res.json({
      success: true,
      message: "Cache cleared and data refreshed successfully",
      results,
      duration_ms: totalTime,
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
