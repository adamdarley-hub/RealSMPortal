import { CacheService } from './cache-service';

class BackgroundSyncService {
  private intervalId: NodeJS.Timeout | null = null;
  private cacheService: CacheService;
  private syncInterval: number = 5 * 60 * 1000; // 5 minutes default
  private isRunning: boolean = false;

  constructor() {
    this.cacheService = new CacheService();
  }

  start(intervalMinutes: number = 5) {
    if (this.isRunning) {
      console.log('⚠️ Background sync already running');
      return;
    }

    this.syncInterval = intervalMinutes * 60 * 1000;
    this.isRunning = true;

    console.log(`🚀 Starting background sync: every ${intervalMinutes} minutes`);

    // Initial sync
    this.performSync();

    // Set up recurring sync
    this.intervalId = setInterval(() => {
      this.performSync();
    }, this.syncInterval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('⏹️ Background sync stopped');
  }

  private async performSync() {
    try {
      console.log('🔄 Background sync starting...');
      const startTime = Date.now();
      
      const result = await this.cacheService.syncAllData();
      
      const duration = Date.now() - startTime;
      console.log(`✅ Background sync completed in ${duration}ms:`, {
        jobs: result.jobs?.recordsSynced || 0,
        clients: result.clients?.recordsSynced || 0
      });

    } catch (error) {
      console.error('❌ Background sync failed:', error);
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalMinutes: this.syncInterval / (60 * 1000),
      nextSync: this.intervalId ? new Date(Date.now() + this.syncInterval) : null
    };
  }
}

// Create singleton instance
export const backgroundSync = new BackgroundSyncService();

// Auto-start background sync optimized for production
const BACKGROUND_SYNC_INTERVAL = parseInt(process.env.BACKGROUND_SYNC_MINUTES || '15'); // Default 15 minutes for production
if (process.env.NODE_ENV !== 'test') {
  // Start background sync automatically after server is ready
  setTimeout(() => {
    backgroundSync.start(BACKGROUND_SYNC_INTERVAL);
  }, 30000); // Wait 30 seconds for server to stabilize
}
