// Import the ServeManager request function
import { makeServeManagerRequest, getServeManagerConfig } from '../routes/servemanager';

interface SyncResult {
  success: boolean;
  recordsSynced: number;
  totalRecords: number;
  duration: number;
  error?: string;
}

export class CacheService {
  
  // In serverless mode, we don't cache locally - everything is fetched directly from ServeManager
  
  async getJobsFromCache(filters: any = {}): Promise<any[]> {
    console.log('Serverless mode: Fetching jobs directly from ServeManager (no cache)');
    try {
      // Fetch directly from ServeManager API
      const response = await makeServeManagerRequest('/jobs', {
        method: 'GET',
        query: {
          page: 1,
          per_page: 100,
          ...filters
        }
      });
      
      if (response && response.data) {
        return Array.isArray(response.data) ? response.data : [response.data];
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching jobs from ServeManager:', error);
      return [];
    }
  }

  async getJobFromCache(jobId: string): Promise<any | null> {
    console.log('Serverless mode: Fetching job directly from ServeManager (no cache)');
    try {
      const response = await makeServeManagerRequest(`/jobs/${jobId}`, {
        method: 'GET'
      });
      
      return response?.data || null;
    } catch (error) {
      console.error('Error fetching job from ServeManager:', error);
      return null;
    }
  }

  async syncJobsFromServeManager(): Promise<SyncResult> {
    console.log('Serverless mode: No sync needed - data fetched directly');
    return {
      success: true,
      recordsSynced: 0,
      totalRecords: 0,
      duration: 0,
      error: 'No sync needed in serverless mode'
    };
  }

  async getClientsFromCache(): Promise<any[]> {
    console.log('Serverless mode: Fetching clients directly from ServeManager (no cache)');
    try {
      const response = await makeServeManagerRequest('/companies', {
        method: 'GET',
        query: {
          page: 1,
          per_page: 100
        }
      });
      
      if (response && response.data) {
        return Array.isArray(response.data) ? response.data : [response.data];
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching clients from ServeManager:', error);
      return [];
    }
  }

  async syncClientsFromServeManager(): Promise<SyncResult> {
    console.log('Serverless mode: No sync needed - data fetched directly');
    return {
      success: true,
      recordsSynced: 0,
      totalRecords: 0,
      duration: 0,
      error: 'No sync needed in serverless mode'
    };
  }

  async updateSyncLog(tableName: string, data: any) {
    console.log('Serverless mode: No sync log needed');
    return;
  }

  async getSyncStatus(): Promise<any[]> {
    console.log('Serverless mode: No sync status available');
    return [];
  }

  async syncAllData(): Promise<any> {
    console.log('Serverless mode: No sync needed - data fetched directly');
    return {
      jobs: { success: true, error: 'No sync needed in serverless mode' },
      clients: { success: true, error: 'No sync needed in serverless mode' },
      servers: { success: true, error: 'No sync needed in serverless mode' }
    };
  }

  async getServersFromCache(): Promise<any[]> {
    console.log('Serverless mode: Fetching servers directly from ServeManager (no cache)');
    try {
      const response = await makeServeManagerRequest('/users', {
        method: 'GET',
        query: {
          page: 1,
          per_page: 100
        }
      });
      
      if (response && response.data) {
        return Array.isArray(response.data) ? response.data : [response.data];
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching servers from ServeManager:', error);
      return [];
    }
  }

  async syncServersFromServeManager(): Promise<SyncResult> {
    console.log('Serverless mode: No sync needed - data fetched directly');
    return {
      success: true,
      recordsSynced: 0,
      totalRecords: 0,
      duration: 0,
      error: 'No sync needed in serverless mode'
    };
  }

  async updateSingleJob(jobId: string, freshJobData: any): Promise<void> {
    console.log('Serverless mode: No local job update needed');
    return;
  }
}

export const cacheService = new CacheService();
