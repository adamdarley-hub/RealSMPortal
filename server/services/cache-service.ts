// Import the ServeManager request function
import {
  makeServeManagerRequest,
  getServeManagerConfig,
} from "../routes/servemanager";

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
    console.log(
      "Serverless mode: Fetching jobs directly from ServeManager (no cache)",
    );
    console.log("🔍 Filters received:", filters);

    try {
      // Fetch directly from ServeManager API
      const queryParams: any = {
        page: 1,
        per_page: 100,
      };

      // Convert filters to ServeManager format
      if (filters.client_id) {
        queryParams["filter[client_id]"] = filters.client_id;
      }
      if (filters.status) {
        queryParams["filter[status]"] = filters.status;
      }
      if (filters.priority) {
        queryParams["filter[priority]"] = filters.priority;
      }

      console.log("🌐 ServeManager query params:", queryParams);

      // Build URL with query parameters
      let endpoint = "/jobs";
      if (Object.keys(queryParams).length > 0) {
        const params = new URLSearchParams();
        Object.entries(queryParams).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });
        endpoint += `?${params.toString()}`;
      }

      console.log(`🔍 Final endpoint: ${endpoint}`);

      const response = await makeServeManagerRequest(endpoint, {
        method: "GET",
      });

      if (response && response.data) {
        const jobs = Array.isArray(response.data)
          ? response.data
          : [response.data];
        console.log(`📋 ServeManager returned ${jobs.length} jobs`);

        // Check if we have client_id filter and log sample client_ids from jobs
      if (filters.client_id) {
        const sampleJobs = jobs.slice(0, 3).map((job) => ({
          id: job.id,
          client_id: job.client_id || job.attributes?.client_id,
          client_company: job.client_company || job.attributes?.client_company,
          client_company_id: job.client_company?.id || job.attributes?.client_company?.id,
        }));
        console.log(`🔍 Looking for client_id: ${filters.client_id}`);
        console.log("📊 Sample jobs with client info:", sampleJobs);

        // Filter jobs by client_company.id since that's where ServeManager stores the client ID
        const filteredJobs = jobs.filter((job) => {
          const clientCompanyId = String(job.client_company?.id || job.attributes?.client_company?.id || '');
          return clientCompanyId === String(filters.client_id);
        });

        console.log(`✅ Found ${filteredJobs.length} jobs for client_id ${filters.client_id}`);
        if (filteredJobs.length > 0) {
          console.log("📋 Sample filtered job:", {
            id: filteredJobs[0].id,
            client_company_id: filteredJobs[0].client_company?.id,
            client_company_name: filteredJobs[0].client_company?.name
          });
        }

        return filteredJobs;
      }

        return jobs;
      }

      return [];
    } catch (error) {
      console.error("Error fetching jobs from ServeManager:", error);
      return [];
    }
  }

  async getJobFromCache(jobId: string): Promise<any | null> {
    console.log(
      "Serverless mode: Fetching job directly from ServeManager (no cache)",
    );
    try {
      const response = await makeServeManagerRequest(`/jobs/${jobId}`, {
        method: "GET",
      });

      return response?.data || null;
    } catch (error) {
      console.error("Error fetching job from ServeManager:", error);
      return null;
    }
  }

  async syncJobsFromServeManager(): Promise<SyncResult> {
    console.log("Serverless mode: No sync needed - data fetched directly");
    return {
      success: true,
      recordsSynced: 0,
      totalRecords: 0,
      duration: 0,
      error: "No sync needed in serverless mode",
    };
  }

  async getClientsFromCache(): Promise<any[]> {
    console.log(
      "Serverless mode: Fetching clients directly from ServeManager (no cache)",
    );
    try {
      const response = await makeServeManagerRequest("/companies", {
        method: "GET",
        query: {
          page: 1,
          per_page: 100,
        },
      });

      if (response && response.data) {
        return Array.isArray(response.data) ? response.data : [response.data];
      }

      return [];
    } catch (error) {
      console.error("Error fetching clients from ServeManager:", error);
      return [];
    }
  }

  async syncClientsFromServeManager(): Promise<SyncResult> {
    console.log("Serverless mode: No sync needed - data fetched directly");
    return {
      success: true,
      recordsSynced: 0,
      totalRecords: 0,
      duration: 0,
      error: "No sync needed in serverless mode",
    };
  }

  async updateSyncLog(tableName: string, data: any) {
    console.log("Serverless mode: No sync log needed");
    return;
  }

  async getSyncStatus(): Promise<any[]> {
    console.log("Serverless mode: No sync status available");
    return [];
  }

  async syncAllData(): Promise<any> {
    console.log("Serverless mode: No sync needed - data fetched directly");
    return {
      jobs: { success: true, error: "No sync needed in serverless mode" },
      clients: { success: true, error: "No sync needed in serverless mode" },
      servers: { success: true, error: "No sync needed in serverless mode" },
    };
  }

  async getServersFromCache(): Promise<any[]> {
    console.log(
      "Serverless mode: Fetching servers directly from ServeManager (no cache)",
    );
    try {
      const response = await makeServeManagerRequest("/users", {
        method: "GET",
        query: {
          page: 1,
          per_page: 100,
        },
      });

      if (response && response.data) {
        return Array.isArray(response.data) ? response.data : [response.data];
      }

      return [];
    } catch (error) {
      console.error("Error fetching servers from ServeManager:", error);
      return [];
    }
  }

  async syncServersFromServeManager(): Promise<SyncResult> {
    console.log("Serverless mode: No sync needed - data fetched directly");
    return {
      success: true,
      recordsSynced: 0,
      totalRecords: 0,
      duration: 0,
      error: "No sync needed in serverless mode",
    };
  }

  async updateSingleJob(jobId: string, freshJobData: any): Promise<void> {
    console.log("Serverless mode: No local job update needed");
    return;
  }
}

export const cacheService = new CacheService();
