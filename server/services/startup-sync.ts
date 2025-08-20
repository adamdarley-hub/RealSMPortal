import { cacheService } from "./cache-service";

let isInitialSyncRunning = false;
let initialSyncCompleted = false;

export async function performInitialSync() {
  if (isInitialSyncRunning || initialSyncCompleted) {
    console.log("⏭️ Initial sync already running or completed");
    return;
  }

  isInitialSyncRunning = true;

  try {
    console.log(
      "🚀 Serverless mode: No initial sync needed - data fetched on demand",
    );
    console.log("💡 All data is fetched directly from ServeManager API");

    initialSyncCompleted = true;
    isInitialSyncRunning = false;

    console.log("✅ Serverless initialization completed");
  } catch (error) {
    console.error("❌ Serverless initialization failed:", error);
    isInitialSyncRunning = false;
  }
}

export function getInitialSyncStatus() {
  return {
    isRunning: isInitialSyncRunning,
    isCompleted: initialSyncCompleted,
    mode: "serverless",
  };
}
