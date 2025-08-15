import { supabaseService } from './supabase-service';
import { makeServeManagerRequest } from '../routes/servemanager';
import { Job, Client, Server } from '../../shared/servemanager';

export class SupabaseSyncService {
  private isSyncing = false;
  private lastSyncTime: Date | null = null;

  async startInitialSync(): Promise<void> {
    if (this.isSyncing) {
      console.log('⚠️ Sync already in progress, skipping...');
      return;
    }

    console.log('⚠️ Supabase sync temporarily disabled to fix performance issues');
    return;

    console.log('🚀 Starting initial Supabase sync...');
    this.isSyncing = true;

    try {
      // Check Supabase health
      const isHealthy = await supabaseService.healthCheck();
      if (!isHealthy) {
        throw new Error('Supabase is not available');
      }

      console.log('✅ Supabase connection verified');

      // Sync in parallel for speed
      const [jobsResult, clientsResult, serversResult] = await Promise.allSettled([
        this.syncJobs(),
        this.syncClients(),
        this.syncServers()
      ]);

      // Log results
      console.log('🎉 Initial Supabase sync completed:', {
        jobs: jobsResult.status === 'fulfilled' ? jobsResult.value : `Failed: ${jobsResult.reason}`,
        clients: clientsResult.status === 'fulfilled' ? clientsResult.value : `Failed: ${clientsResult.reason}`,
        servers: serversResult.status === 'fulfilled' ? serversResult.value : `Failed: ${serversResult.reason}`
      });

      this.lastSyncTime = new Date();

    } catch (error) {
      console.error('❌ Initial Supabase sync failed:', error);
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  async syncJobs(): Promise<{ synced: number; total: number; duration: number }> {
    const startTime = Date.now();
    console.log('🔄 Syncing jobs to Supabase...');

    try {
      // Fetch all jobs from ServeManager
      const response = await makeServeManagerRequest('/jobs?per_page=100&page=1');
      let allJobs: Job[] = [];
      let currentPage = 1;
      let totalPages = 1;

      // Handle pagination
      do {
        if (currentPage > 1) {
          const pageResponse = await makeServeManagerRequest(`/jobs?per_page=100&page=${currentPage}`);
          allJobs.push(...(pageResponse?.data || []));
        } else {
          allJobs.push(...(response?.data || []));
          totalPages = response?.pagination?.total_pages || 1;
        }
        currentPage++;
      } while (currentPage <= totalPages && currentPage <= 10); // Limit to 10 pages (1000 jobs) for initial sync

      console.log(`📥 Fetched ${allJobs.length} jobs from ServeManager`);

      // Batch upsert to Supabase
      let syncedCount = 0;
      const batchSize = 50;

      for (let i = 0; i < allJobs.length; i += batchSize) {
        const batch = allJobs.slice(i, i + batchSize);
        const promises = batch.map(job => {
          try {
            const supabaseJob = supabaseService.serveManagerJobToSupabase(job);
            return supabaseService.upsertJob(supabaseJob);
          } catch (error) {
            console.error(`Failed to sync job ${job.id}:`, error);
            return null;
          }
        });

        const results = await Promise.allSettled(promises);
        syncedCount += results.filter(r => r.status === 'fulfilled' && r.value).length;

        // Log progress
        console.log(`📊 Synced ${Math.min(i + batchSize, allJobs.length)}/${allJobs.length} jobs to Supabase`);
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Jobs sync completed: ${syncedCount}/${allJobs.length} synced in ${duration}ms`);

      return { synced: syncedCount, total: allJobs.length, duration };

    } catch (error) {
      console.error('❌ Jobs sync failed:', error);
      throw error;
    }
  }

  async syncClients(): Promise<{ synced: number; total: number; duration: number }> {
    const startTime = Date.now();
    console.log('🔄 Syncing clients to Supabase...');

    try {
      // Fetch all clients from ServeManager
      const response = await makeServeManagerRequest('/companies?per_page=100');
      const allClients: Client[] = response?.data || [];

      console.log(`📥 Fetched ${allClients.length} clients from ServeManager`);

      // Batch upsert to Supabase
      let syncedCount = 0;
      const promises = allClients.map(async client => {
        try {
          const supabaseClient = supabaseService.serveManagerClientToSupabase(client);
          await supabaseService.upsertClient(supabaseClient);
          return true;
        } catch (error) {
          console.error(`Failed to sync client ${client.id}:`, error);
          return false;
        }
      });

      const results = await Promise.allSettled(promises);
      syncedCount = results.filter(r => r.status === 'fulfilled' && r.value).length;

      const duration = Date.now() - startTime;
      console.log(`✅ Clients sync completed: ${syncedCount}/${allClients.length} synced in ${duration}ms`);

      return { synced: syncedCount, total: allClients.length, duration };

    } catch (error) {
      console.error('❌ Clients sync failed:', error);
      throw error;
    }
  }

  async syncServers(): Promise<{ synced: number; total: number; duration: number }> {
    const startTime = Date.now();
    console.log('🔄 Syncing servers to Supabase...');

    try {
      // Try both employee and process_server endpoints
      let allServers: Server[] = [];

      try {
        const employeeResponse = await makeServeManagerRequest('/employees?per_page=100');
        allServers.push(...(employeeResponse?.data || []));
      } catch (error) {
        console.log('📝 Employee endpoint not accessible, trying process_servers...');
      }

      try {
        const serverResponse = await makeServeManagerRequest('/process_servers?per_page=100');
        allServers.push(...(serverResponse?.data || []));
      } catch (error) {
        console.log('📝 Process servers endpoint not accessible');
      }

      if (allServers.length === 0) {
        console.log('⚠️ No servers found, using mock data');
        allServers = [{
          id: '1',
          name: 'Default Server',
          email: null,
          phone: null
        }];
      }

      console.log(`📥 Fetched ${allServers.length} servers from ServeManager`);

      // Batch upsert to Supabase
      let syncedCount = 0;
      const promises = allServers.map(async server => {
        try {
          const supabaseServer = supabaseService.serveManagerServerToSupabase(server);
          await supabaseService.upsertServer(supabaseServer);
          return true;
        } catch (error) {
          console.error(`Failed to sync server ${server.id}:`, error);
          return false;
        }
      });

      const results = await Promise.allSettled(promises);
      syncedCount = results.filter(r => r.status === 'fulfilled' && r.value).length;

      const duration = Date.now() - startTime;
      console.log(`✅ Servers sync completed: ${syncedCount}/${allServers.length} synced in ${duration}ms`);

      return { synced: syncedCount, total: allServers.length, duration };

    } catch (error) {
      console.error('❌ Servers sync failed:', error);
      throw error;
    }
  }

  async syncSingleJob(serveManagerId: number): Promise<void> {
    try {
      console.log(`🔄 Syncing single job ${serveManagerId} to Supabase...`);

      // Fetch job from ServeManager
      const jobData = await makeServeManagerRequest(`/jobs/${serveManagerId}`);
      const job = jobData?.data || jobData;

      if (!job) {
        throw new Error(`Job ${serveManagerId} not found in ServeManager`);
      }

      // Convert and upsert to Supabase
      const supabaseJob = supabaseService.serveManagerJobToSupabase(job);
      await supabaseService.upsertJob(supabaseJob);

      console.log(`✅ Successfully synced job ${serveManagerId} to Supabase`);

    } catch (error) {
      console.error(`❌ Failed to sync single job ${serveManagerId}:`, error);
      throw error;
    }
  }

  // Background sync every 5 minutes (TEMPORARILY DISABLED)
  startBackgroundSync(): void {
    const SYNC_INTERVAL = 15 * 60 * 1000; // 15 minutes for production stability
    console.log('⏰ Background Supabase sync enabled: every 15 minutes');

    setInterval(async () => {
      if (this.isSyncing) {
        console.log('⚠️ Background sync skipped - already syncing');
        return;
      }

      try {
        console.log('🔄 Starting background sync to Supabase...');
        await this.startInitialSync();
        console.log('✅ Background sync completed');
      } catch (error) {
        console.error('❌ Background sync failed:', error);
        // Continue running - don't crash on sync failures
      }
    }, SYNC_INTERVAL);
  }

  getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }

  isSyncInProgress(): boolean {
    return this.isSyncing;
  }
}

// Singleton instance
export const supabaseSyncService = new SupabaseSyncService();
