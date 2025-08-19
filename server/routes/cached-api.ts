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

    // Optimize job objects for list view - remove heavy fields for better performance
    const optimizedJobs = jobs.map(job => ({
      id: job.id,
      uuid: job.uuid,
      job_number: job.job_number,
      generated_job_id: job.generated_job_id,
      reference: job.reference,
      status: job.status,
      job_status: job.job_status,
      priority: job.priority,
      created_at: job.created_at,
      updated_at: job.updated_at,
      due_date: job.due_date,
      client_id: job.client_id,
      client_name: job.client_name,
      client_company: job.client_company,
      recipient_name: job.recipient_name,
      defendant_name: job.defendant_name,
      server_id: job.server_id,
      server_name: job.server_name,
      amount: job.amount,
      price: job.price,
      total: job.total,
      service_type: job.service_type,
      description: job.description,
      attempt_count: job.attempt_count,
      case_number: job.case_number,
      plaintiff: job.plaintiff,
      // Include address fields for display
      service_address: job.service_address,
      defendant_address: job.defendant_address,
      address: job.address,
      addresses_attributes: job.addresses_attributes,
      raw_data: job.raw_data ? {
        addresses_attributes: job.raw_data.addresses_attributes,
        addresses: job.raw_data.addresses,
        service_address: job.raw_data.service_address,
        defendant_address: job.raw_data.defendant_address,
        address: job.raw_data.address
      } : undefined,
      // Exclude heavy fields like attempts, documents for list view (but keep raw_data.addresses)
      _cached: job._cached,
      _last_synced: job._last_synced
    }));

    const responseTime = Date.now() - startTime;

    console.log(`⚡ Served ${optimizedJobs.length}${isPaginated ? ` of ${allJobs.length}` : ''} jobs from cache (page ${pageNum}) in ${responseTime}ms`);

    // Add production caching headers with better performance
    res.set({
      'Cache-Control': 'public, max-age=120, stale-while-revalidate=60', // Cache for 2 minutes, allow stale for 1 minute
      'ETag': `jobs-${allJobs.length}-${Math.floor(Date.now() / 60000)}`, // ETag changes every minute
      'X-Response-Time': `${responseTime}ms`,
      'X-Cache-Status': isPaginated ? 'paginated' : 'full',
      'X-Cache-Optimized': 'true',
      'Content-Type': 'application/json; charset=utf-8'
    });

    res.json({
      jobs: optimizedJobs,
      total: allJobs.length,
      page: pageNum,
      limit: limitNum,
      showing: optimizedJobs.length,
      has_more: offset + limitNum < allJobs.length,
      cached: true,
      paginated: isPaginated,
      optimized: true,
      response_time_ms: responseTime,
      last_synced: optimizedJobs[0]?._last_synced || null
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
        // Process job data

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
