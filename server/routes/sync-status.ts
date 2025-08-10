import { RequestHandler } from "express";
import { backgroundSync } from "../services/background-sync";
import { CacheService } from "../services/cache-service";

const cacheService = new CacheService();

export const getSyncStatus: RequestHandler = async (req, res) => {
  try {
    const backgroundStatus = backgroundSync.getStatus();
    const syncLogs = await cacheService.getSyncStatus();

    res.json({
      background: backgroundStatus,
      lastSync: syncLogs,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(500).json({ 
      error: 'Failed to get sync status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const triggerManualSync: RequestHandler = async (req, res) => {
  try {
    console.log('🔄 Manual sync triggered via API');
    const result = await cacheService.syncAllData();
    
    res.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Manual sync failed:', error);
    res.status(500).json({
      success: false,
      error: 'Sync failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
