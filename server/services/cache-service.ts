// Import the ServeManager request function
import {
  makeServeManagerRequest,
  getServeManagerConfig,
  getServers,
} from "../routes/servemanager";
import { mapJobFromServeManager } from "../utils/servemanager-mapper";

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
      // Fetch ALL pages of jobs from ServeManager API
      const baseQueryParams: any = {
        per_page: 100, // Max per page
      };

      // Convert filters to ServeManager format
      if (filters.client_id) {
        // ServeManager uses filter[client_company_id] not filter[client_id]
        baseQueryParams["filter[client_company_id]"] = filters.client_id;
      }
      if (filters.status) {
        baseQueryParams["filter[status]"] = filters.status;
      }
      if (filters.priority) {
        baseQueryParams["filter[priority]"] = filters.priority;
      }

      console.log("🌐 ServeManager base query params:", baseQueryParams);

      // Fetch all pages
      let allJobs: any[] = [];
      let currentPage = 1;
      let hasMorePages = true;

      while (hasMorePages) {
        const queryParams = { ...baseQueryParams, page: currentPage };

        // Build URL with query parameters
        let endpoint = "/jobs";
        const params = new URLSearchParams();
        Object.entries(queryParams).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });
        endpoint += `?${params.toString()}`;

        console.log(`🔍 Fetching page ${currentPage}: ${endpoint}`);

        const response = await makeServeManagerRequest(endpoint, {
          method: "GET",
        });

        if (response && response.data) {
          const jobs = Array.isArray(response.data)
            ? response.data
            : [response.data];

          console.log(`📋 Page ${currentPage}: ${jobs.length} jobs`);
          allJobs.push(...jobs);

          // Check if there are more pages
          // ServeManager typically returns fewer than per_page when reaching the end
          if (jobs.length < 100) {
            hasMorePages = false;
            console.log(`🏁 Reached end of pages at page ${currentPage}`);
          } else {
            currentPage++;
            // Safety limit to prevent infinite loops
            if (currentPage > 50) {
              console.log(`⚠️ Reached safety limit of 50 pages`);
              hasMorePages = false;
            }
          }
        } else {
          hasMorePages = false;
          console.log(`❌ No data in response for page ${currentPage}`);
        }
      }

      if (allJobs.length > 0) {
        console.log(
          `📋 ServeManager returned ${allJobs.length} total jobs across ${currentPage} pages`,
        );

        // Check if we have client_id filter and log sample client_ids from jobs
        if (filters.client_id) {
          const sampleJobs = allJobs.slice(0, 3).map((job) => ({
            id: job.id,
            client_id: job.client_id || job.attributes?.client_id,
            client_company:
              job.client_company || job.attributes?.client_company,
            client_company_id:
              job.client_company?.id || job.attributes?.client_company?.id,
          }));
          console.log(`🔍 Looking for client_id: ${filters.client_id}`);
          console.log("📊 Sample jobs with client info:", sampleJobs);

          // Filter jobs by client_company.id since that's where ServeManager stores the client ID
          const filteredJobs = allJobs.filter((job) => {
            const clientCompanyId = String(
              job.client_company?.id ||
                job.attributes?.client_company?.id ||
                "",
            );
            return clientCompanyId === String(filters.client_id);
          });

          console.log(
            `✅ Found ${filteredJobs.length} jobs for client_id ${filters.client_id}`,
          );
          if (filteredJobs.length > 0) {
            console.log(
              "🔄 STARTING TRANSFORMATION - This should appear in logs",
            );
            console.log(
              "🔍 Sample raw job data:",
              JSON.stringify(filteredJobs[0], null, 2),
            );
            // Transform ServeManager data using proper mapper
            const transformedJobs = filteredJobs.map((job) => {
              const mappedJob = mapJobFromServeManager(job);

              // Convert to frontend format
              return {
                id: mappedJob.id,
                job_number:
                  mappedJob.job_number || mappedJob.servemanager_job_number,
                recipient_name: mappedJob.recipient_name || "Unknown Recipient",
                status: mappedJob.status || "pending",
                priority: mappedJob.priority || "routine",
                created_at: mappedJob.created_at || new Date().toISOString(),
                due_date: mappedJob.due_date,
                amount: parseFloat(String(mappedJob.amount || "0")),
                client_id: mappedJob.client_id,
                client_company: mappedJob.client_company,
                client_name: mappedJob.client_name,
                service_address: mappedJob.service_address,
                defendant_address: mappedJob.defendant_address,
                address: mappedJob.address,
                addresses_attributes: mappedJob.addresses_attributes,
                court_case_number: mappedJob.court_case_number,
                plaintiff: mappedJob.plaintiff,
                defendant_name:
                  mappedJob.defendant_name || mappedJob.recipient_name,
                attempt_count: mappedJob.attempt_count || 0,
                attempts: mappedJob.attempts || [],
                // Keep raw data for debugging
                raw_data: job,
              };
            });

            console.log("📋 Sample transformed job:", {
              id: transformedJobs[0].id,
              job_number: transformedJobs[0].job_number,
              recipient_name: transformedJobs[0].recipient_name,
              status: transformedJobs[0].status,
              client_company: transformedJobs[0].client_company,
            });

            return transformedJobs;
          } else {
            console.log("⚠️ No jobs found for client in ServeManager");
            return [];
          }
        }

        // Transform ALL jobs when no client filter is applied
        console.log("🔄 TRANSFORMING ALL JOBS - No client filter applied");
        console.log(`📊 Total jobs to transform: ${allJobs.length}`);

        if (allJobs.length > 0) {
          console.log(
            "🔍 Sample raw job data:",
            JSON.stringify(allJobs[0], null, 2),
          );

          const transformedJobs = allJobs.map((job) => {
            const mappedJob = mapJobFromServeManager(job);

            // Convert to frontend format
            return {
              id: mappedJob.id,
              job_number:
                mappedJob.job_number || mappedJob.servemanager_job_number,
              recipient_name: mappedJob.recipient_name || "Unknown Recipient",
              status: mappedJob.status || "pending",
              priority: mappedJob.priority || "routine",
              created_at: mappedJob.created_at || new Date().toISOString(),
              due_date: mappedJob.due_date,
              amount: parseFloat(String(mappedJob.amount || "0")),
              client_id: mappedJob.client_id,
              client_company: mappedJob.client_company,
              client_name: mappedJob.client_name,
              service_address: mappedJob.service_address,
              defendant_address: mappedJob.defendant_address,
              address: mappedJob.address,
              addresses_attributes: mappedJob.addresses_attributes,
              court_case_number: mappedJob.court_case_number,
              plaintiff: mappedJob.plaintiff,
              defendant_name:
                mappedJob.defendant_name || mappedJob.recipient_name,
              attempt_count: mappedJob.attempt_count || 0,
              attempts: mappedJob.attempts || [],
              // Keep raw data for debugging
              raw_data: job,
            };
          });

          console.log("📋 Sample transformed job:", {
            id: transformedJobs[0].id,
            job_number: transformedJobs[0].job_number,
            recipient_name: transformedJobs[0].recipient_name,
            status: transformedJobs[0].status,
            client_company: transformedJobs[0].client_company,
          });

          return transformedJobs;
        }

        return [];
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
      const response = await getServers();

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
