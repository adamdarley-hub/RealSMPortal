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
      date_to,
      limit,
      page
    } = req.query;

    // Build filters
    const filters: any = {};
    if (status && status !== 'all') filters.status = status;
    if (priority && priority !== 'all') filters.priority = priority;
    if (client_id && client_id !== 'all') filters.client_id = client_id;
    if (server_id && server_id !== 'all') filters.server_id = server_id;
    if (date_from) filters.date_from = date_from;
    if (date_to) filters.date_to = date_to;

    let allJobs = await cacheService.getJobsFromCache(filters);

    // Apply pagination for performance
    const limitNum = parseInt(limit as string) || 50;
    const pageNum = parseInt(page as string) || 1;
    const offset = (pageNum - 1) * limitNum;

    let jobs = allJobs;
    let isPaginated = false;

    if (limitNum && limitNum < allJobs.length) {
      jobs = allJobs.slice(offset, offset + limitNum);
      isPaginated = true;
    }

    const responseTime = Date.now() - startTime;

    console.log(`⚡ Served ${jobs.length}${isPaginated ? ` of ${allJobs.length}` : ''} jobs from cache (page ${pageNum}) in ${responseTime}ms`);

    // Add production caching headers
    res.set({
      'Cache-Control': 'public, max-age=60', // Cache for 1 minute
      'ETag': `jobs-${allJobs.length}-${Date.now()}`,
      'X-Response-Time': `${responseTime}ms`
    });

    res.json({
      jobs,
      total: allJobs.length,
      page: pageNum,
      limit: limitNum,
      showing: jobs.length,
      has_more: offset + limitNum < allJobs.length,
      cached: true,
      paginated: isPaginated,
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
    
    // Add production caching headers
    res.set({
      'Cache-Control': 'public, max-age=300', // Cache for 5 minutes (clients change less frequently)
      'ETag': `clients-${clients.length}`,
      'X-Response-Time': `${responseTime}ms`
    });

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

    const servers = await cacheService.getServersFromCache();
    const responseTime = Date.now() - startTime;

    console.log(`⚡ Served ${servers.length} servers from cache in ${responseTime}ms`);

    // Add production caching headers
    res.set({
      'Cache-Control': 'public, max-age=600', // Cache for 10 minutes (servers change rarely)
      'ETag': `servers-${servers.length}`,
      'X-Response-Time': `${responseTime}ms`
    });

    res.json({
      servers,
      total: servers.length,
      cached: true,
      response_time_ms: responseTime,
      last_synced: servers[0]?._last_synced || null
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
    const { refresh } = req.query;
    const startTime = Date.now();

    // Look up job from cache

    if (!id) {
      res.status(400).json({
        error: 'Job ID is required',
        message: 'Please provide a valid job ID'
      });
      return;
    }

    // If refresh is requested, fetch fresh data from ServeManager
    if (refresh === 'true') {
      console.log(`🔄 Refresh requested for job ${id}, fetching fresh data...`);
      try {
        const { makeServeManagerRequest } = await import('./servemanager');
        const freshData = await makeServeManagerRequest(`/jobs/${id}`);

        // Unwrap the data if it's wrapped in a data property
        const actualJobData = freshData.data || freshData;

        // Debug logging for job 20483264 fresh data
        if (id === '20483264') {
          console.log(`🔍 FRESH DEBUG Job 20483264 - Raw structure:`, Object.keys(freshData));
          console.log(`🔍 FRESH DEBUG Job 20483264 - Unwrapped structure:`, Object.keys(actualJobData));
          console.log(`🔍 FRESH DEBUG Job 20483264 - Attempts type:`, typeof actualJobData.attempts);
          console.log(`🔍 FRESH DEBUG Job 20483264 - Attempts:`, actualJobData.attempts);
          console.log(`🔍 FRESH DEBUG Job 20483264 - Attempt count:`, actualJobData.attempts?.length || 0);
        }

        // Return fresh data with same structure as cached data
        const responseTime = Date.now() - startTime;
        console.log(`🔄 Served fresh job ${id} from ServeManager in ${responseTime}ms`);

        res.json({
          ...actualJobData,
          cached: false,
          response_time_ms: responseTime,
          _last_synced: new Date().toISOString()
        });
        return;
      } catch (error) {
        console.error(`❌ Failed to refresh job ${id}:`, error);
        // Fall back to cache if refresh fails
      }
    }

    const job = await cacheService.getJobFromCache(id);
    const responseTime = Date.now() - startTime;

    if (!job) {
      console.log(`❌ Job ${id} not found in cache`);
      res.status(404).json({
        error: 'Job not found',
        message: `Job with ID ${id} was not found in the cache`
      });
      return;
    }

    // Debug logging for job 20483264
    if (id === '20483264') {
      const attempts = job.attempts || [];
      console.log(`🔍 DEBUG Job 20483264 - Attempt count: ${attempts.length}`);
      console.log(`🔍 DEBUG Job 20483264 - Last updated: ${job.updated_at}`);
      if (attempts.length > 0) {
        console.log(`🔍 DEBUG Job 20483264 - Latest attempt:`, attempts[attempts.length - 1]?.attempted_at);
      }
    }

    console.log(`⚡ Served job ${id} from cache in ${responseTime}ms`);

    res.json({
      ...job,
      cached: true,
      response_time_ms: responseTime,
      _last_synced: job.last_synced
    });

  } catch (error) {
    console.error('Error getting job from cache:', error);
    res.status(500).json({
      error: 'Failed to get job from cache',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
