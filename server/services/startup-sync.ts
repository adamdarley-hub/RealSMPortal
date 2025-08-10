import { cacheService } from './cache-service';
import { getDatabaseStats } from '../db/database';

let isInitialSyncRunning = false;
let initialSyncCompleted = false;

export async function performInitialSync() {
  if (isInitialSyncRunning || initialSyncCompleted) {
    console.log('⏭️ Initial sync already running or completed');
    return;
  }
  
  isInitialSyncRunning = true;
  
  try {
    console.log('🚀 Starting initial data sync on server startup...');
    
    // Check if we have any data already
    const stats = getDatabaseStats();
    const totalRecords = stats.reduce((sum: number, stat: any) => sum + stat.count, 0);
    
    if (totalRecords > 0) {
      console.log(`📊 Found ${totalRecords} existing records in cache, skipping initial sync`);
      console.log('💡 Use POST /api/sync to manually refresh data');
      initialSyncCompleted = true;
      isInitialSyncRunning = false;
      return;
    }
    
    console.log('📦 No cached data found, performing initial sync...');
    
    // Perform initial sync
    const results = await cacheService.syncAllData();
    
    console.log('🎉 Initial sync completed successfully:', results);
    
    // Log final stats
    const finalStats = getDatabaseStats();
    console.log('📊 Final database stats:', finalStats);
    
    initialSyncCompleted = true;
    
  } catch (error) {
    console.error('❌ Initial sync failed:', error);
    console.log('💡 Server will continue with empty cache. Use POST /api/sync to retry.');
  } finally {
    isInitialSyncRunning = false;
  }
}

export function getInitialSyncStatus() {
  return {
    running: isInitialSyncRunning,
    completed: initialSyncCompleted
  };
}

// Auto-trigger initial sync with delay to allow server to fully start
setTimeout(() => {
  performInitialSync();
}, 2000); // 2 second delay
