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

    // Set a timeout for the sync operation
    const syncPromise = cacheService.syncAllData();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Sync timeout after 30 seconds')), 30000);
    });

    const result = await Promise.race([syncPromise, timeoutPromise]);

    res.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Manual sync failed:', error);

    // Don't let sync errors crash the server
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    res.status(200).json({
      success: false,
      error: 'Sync failed',
      message: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
};
