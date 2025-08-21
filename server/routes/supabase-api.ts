import { RequestHandler } from 'express';
import { supabaseService } from '../services/supabase-service';
import { supabaseSyncService } from '../services/supabase-sync';
import { JobFilters, PaginationOptions, isSupabaseConfigured } from '../../shared/supabase';

// Get jobs with fast pagination and filtering
export const getSupabaseJobs: RequestHandler = async (req, res) => {
  try {
    const startTime = Date.now();
    console.log('🚀 Supabase jobs API called');

    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.log('⚠️ Supabase not configured, returning mock data for testing');

      // Create mock Supabase jobs for testing
      const clientId = req.query.client_id as string;
      const mockJobs = [
        {
          id: 'supabase-mock-1',
          servemanager_id: 123001,
          job_number: 'SB-001',
          client_company: clientId === '1454323' ? 'Kerr Civil Process' : 'Pronto Process',
          client_name: clientId === '1454323' ? 'Kelly Kerr' : 'Shawn Wells',
          recipient_name: 'John Smith',
          service_address: '123 Main St, Atlanta, GA 30309',
          status: 'in_progress',
          service_status: 'assigned',
          priority: 'high',
          server_name: 'Mike Johnson',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          amount: 125.00,
          raw_data: {},
          sync_status: 'synced',
          last_synced_at: new Date().toISOString()
        },
        {
          id: 'supabase-mock-2',
          servemanager_id: 123002,
          job_number: 'SB-002',
          client_company: clientId === '1454323' ? 'Kerr Civil Process' : 'Pronto Process',
          client_name: clientId === '1454323' ? 'Kelly Kerr' : 'Shawn Wells',
          recipient_name: 'Jane Doe',
          service_address: '456 Oak Ave, Marietta, GA 30062',
          status: 'pending',
          service_status: 'received',
          priority: 'medium',
          server_name: 'Sarah Wilson',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          amount: 95.00,
          raw_data: {},
          sync_status: 'synced',
          last_synced_at: new Date().toISOString()
        }
      ];

      // Filter by client_id if specified
      let filteredJobs = mockJobs;
      if (clientId) {
        console.log(`🎭 Returning ${filteredJobs.length} mock Supabase jobs for client ${clientId}`);
      }

      return res.json({
        jobs: filteredJobs,
        total: filteredJobs.length,
        page: 1,
        limit: 50,
        has_more: false,
        source: 'supabase-mock',
        duration_ms: Date.now() - startTime
      });
    }

    // Parse query parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100); // Max 100 per page
    const sort_by = req.query.sort_by as string || 'created_at';
    const sort_order = req.query.sort_order as 'asc' | 'desc' || 'desc';
    const search = req.query.search as string;

    // Parse filters
    const filters: JobFilters = {};
    
    if (req.query.status) {
      filters.status = Array.isArray(req.query.status) 
        ? req.query.status as string[] 
        : [req.query.status as string];
    }
    
    if (req.query.priority) {
      filters.priority = Array.isArray(req.query.priority) 
        ? req.query.priority as string[] 
        : [req.query.priority as string];
    }
    
    if (req.query.client) {
      filters.client = Array.isArray(req.query.client) 
        ? req.query.client as string[] 
        : [req.query.client as string];
    }
    
    if (req.query.server) {
      filters.server = Array.isArray(req.query.server) 
        ? req.query.server as string[] 
        : [req.query.server as string];
    }
    
    if (search) {
      filters.search = search;
    }
    
    if (req.query.date_from) {
      filters.date_from = req.query.date_from as string;
    }
    
    if (req.query.date_to) {
      filters.date_to = req.query.date_to as string;
    }

    const pagination: PaginationOptions = {
      page,
      limit,
      sort_by,
      sort_order
    };

    // Double-check Supabase config before calling service
    if (!isSupabaseConfigured()) {
      console.log('⚠️ Supabase check failed at service call, using mock data');
      return res.json({
        jobs: [],
        total: 0,
        page: 1,
        limit: 50,
        has_more: false,
        source: 'supabase-mock-fallback',
        duration_ms: Date.now() - startTime
      });
    }

    // Fetch from Supabase
    const result = await supabaseService.getJobs(filters, pagination);
    
    const duration = Date.now() - startTime;
    
    console.log(`⚡ Served ${result.jobs.length} jobs from Supabase in ${duration}ms`);
    
    res.json({
      ...result,
      source: 'supabase',
      duration_ms: duration,
      filters_applied: filters,
      last_sync: supabaseSyncService.getLastSyncTime(),
      sync_in_progress: supabaseSyncService.isSyncInProgress()
    });

  } catch (error) {
    console.error('❌ Supabase jobs API error:', error);
    res.status(500).json({
      error: 'Failed to fetch jobs from Supabase',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get single job by ID
export const getSupabaseJob: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const startTime = Date.now();

    // Try to get by UUID first, then by ServeManager ID
    let job = await supabaseService.getJobById(id);
    
    if (!job && !isNaN(parseInt(id))) {
      job = await supabaseService.getJobByServeManagerId(parseInt(id));
    }

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Get attempts for this job
    const attempts = await supabaseService.getAttemptsByJobId(job.id);

    const duration = Date.now() - startTime;
    
    console.log(`⚡ Served job ${id} from Supabase in ${duration}ms`);

    res.json({
      ...job,
      attempts,
      source: 'supabase',
      duration_ms: duration
    });

  } catch (error) {
    console.error('❌ Supabase job API error:', error);
    res.status(500).json({
      error: 'Failed to fetch job from Supabase',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get clients
export const getSupabaseClients: RequestHandler = async (req, res) => {
  try {
    const startTime = Date.now();
    
    const clients = await supabaseService.getClients();
    
    const duration = Date.now() - startTime;
    
    console.log(`⚡ Served ${clients.length} clients from Supabase in ${duration}ms`);
    
    res.json({
      clients,
      total: clients.length,
      source: 'supabase',
      duration_ms: duration
    });

  } catch (error) {
    console.error('❌ Supabase clients API error:', error);
    res.status(500).json({
      error: 'Failed to fetch clients from Supabase',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get servers
export const getSupabaseServers: RequestHandler = async (req, res) => {
  try {
    const startTime = Date.now();
    
    const servers = await supabaseService.getServers();
    
    const duration = Date.now() - startTime;
    
    console.log(`⚡ Served ${servers.length} servers from Supabase in ${duration}ms`);
    
    res.json({
      servers,
      total: servers.length,
      source: 'supabase',
      duration_ms: duration
    });

  } catch (error) {
    console.error('❌ Supabase servers API error:', error);
    res.status(500).json({
      error: 'Failed to fetch servers from Supabase',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Force sync from ServeManager
export const triggerSupabaseSync: RequestHandler = async (req, res) => {
  try {
    if (supabaseSyncService.isSyncInProgress()) {
      return res.status(409).json({
        error: 'Sync already in progress',
        message: 'Please wait for the current sync to complete'
      });
    }

    // Start sync in background
    supabaseSyncService.startInitialSync()
      .then(() => {
        console.log('🎉 Manual Supabase sync completed successfully');
      })
      .catch(error => {
        console.error('❌ Manual Supabase sync failed:', error);
      });

    res.json({
      message: 'Sync started successfully',
      sync_in_progress: true,
      last_sync: supabaseSyncService.getLastSyncTime()
    });

  } catch (error) {
    console.error('❌ Supabase sync trigger error:', error);
    res.status(500).json({
      error: 'Failed to start sync',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get sync status
export const getSupabaseSyncStatus: RequestHandler = async (req, res) => {
  try {
    res.json({
      sync_in_progress: supabaseSyncService.isSyncInProgress(),
      last_sync: supabaseSyncService.getLastSyncTime(),
      supabase_healthy: await supabaseService.healthCheck()
    });

  } catch (error) {
    console.error('❌ Supabase sync status error:', error);
    res.status(500).json({
      error: 'Failed to get sync status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Sync single job
export const syncSupabaseJob: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const serveManagerId = parseInt(id);
    
    if (isNaN(serveManagerId)) {
      return res.status(400).json({ error: 'Invalid job ID' });
    }

    await supabaseSyncService.syncSingleJob(serveManagerId);

    res.json({
      message: `Job ${serveManagerId} synced successfully`,
      job_id: serveManagerId
    });

  } catch (error) {
    console.error('❌ Supabase single job sync error:', error);
    res.status(500).json({
      error: 'Failed to sync job',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
