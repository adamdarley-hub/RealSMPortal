import { RequestHandler } from "express";
import { cacheService } from "../services/cache-service";
import { getDatabaseStats } from "../db/database";
import { getInitialSyncStatus } from "../services/startup-sync";

// Get jobs from cache (instant response)
export const getCachedJobs: RequestHandler = async (req, res) => {
  try {
    const startTime = Date.now();
    console.log('📋 Serving jobs from local cache...');
    
    const { 
      status, 
      priority, 
      client_id, 
      server_id, 
      date_from, 
      date_to 
    } = req.query;
    
    // Build filters
    const filters: any = {};
    if (status && status !== 'all') filters.status = status;
    if (priority && priority !== 'all') filters.priority = priority;
    if (client_id && client_id !== 'all') filters.client_id = client_id;
    if (server_id && server_id !== 'all') filters.server_id = server_id;
    if (date_from) filters.date_from = date_from;
    if (date_to) filters.date_to = date_to;
    
    const jobs = await cacheService.getJobsFromCache(filters);
    const responseTime = Date.now() - startTime;
    
    console.log(`⚡ Served ${jobs.length} jobs from cache in ${responseTime}ms`);
    
    res.json({
      jobs,
      total: jobs.length,
      cached: true,
      response_time_ms: responseTime,
      last_synced: jobs[0]?._last_synced || null
    });
    
  } catch (error) {
    console.error('Error serving cached jobs:', error);
    res.status(500).json({ 
      error: 'Failed to get jobs from cache',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get clients from cache (instant response)
export const getCachedClients: RequestHandler = async (req, res) => {
  try {
    const startTime = Date.now();
    console.log('👥 Serving clients from local cache...');
    
    const clients = await cacheService.getClientsFromCache();
    const responseTime = Date.now() - startTime;
    
    console.log(`⚡ Served ${clients.length} clients from cache in ${responseTime}ms`);
    
    res.json({
      clients,
      total: clients.length,
      cached: true,
      response_time_ms: responseTime,
      last_synced: clients[0]?._last_synced || null
    });
    
  } catch (error) {
    console.error('Error serving cached clients:', error);
    res.status(500).json({ 
      error: 'Failed to get clients from cache',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get servers from cache (instant response)
export const getCachedServers: RequestHandler = async (req, res) => {
  try {
    const startTime = Date.now();
    console.log('👨‍💼 Serving servers from local cache...');
    
    // For now, return empty array since we'll sync servers next
    const servers: any[] = [];
    const responseTime = Date.now() - startTime;
    
    console.log(`⚡ Served ${servers.length} servers from cache in ${responseTime}ms`);
    
    res.json({
      servers,
      total: servers.length,
      cached: true,
      response_time_ms: responseTime
    });
    
  } catch (error) {
    console.error('Error serving cached servers:', error);
    res.status(500).json({ 
      error: 'Failed to get servers from cache',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Trigger manual sync
export const triggerSync: RequestHandler = async (req, res) => {
  try {
    console.log('🔄 Manual sync triggered...');
    const results = await cacheService.syncAllData();
    
    res.json({
      message: 'Sync completed',
      results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error triggering sync:', error);
    res.status(500).json({ 
      error: 'Failed to trigger sync',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get sync status
export const getSyncStatus: RequestHandler = async (req, res) => {
  try {
    const syncStatus = await cacheService.getSyncStatus();
    const dbStats = getDatabaseStats();
    const initialSyncStatus = getInitialSyncStatus();

    res.json({
      initial_sync: initialSyncStatus,
      sync_status: syncStatus,
      database_stats: dbStats,
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

// Get single job from cache
export const getCachedJob: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    
    // For now, return error - we'll implement single job lookup later
    res.status(404).json({
      error: 'Single job lookup not implemented yet',
      message: 'Use the jobs list endpoint instead'
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to get job from cache',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
