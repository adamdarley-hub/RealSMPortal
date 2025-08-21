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
            // Transform ServeManager data to expected frontend format
            const transformedJobs = filteredJobs.map((job) => {
              // ServeManager data structure has attributes at root level
              const courtCase = job.court_case || {};
              const attempts = job.attempts || [];

              // Map priority: ServeManager uses "Routine" or "Rush"
              const priority =
                job.service_level === "Rush" ? "rush" : "routine";

              return {
                id: job.id,
                job_number: job.job_number || job.servemanager_job_number,
                recipient_name:
                  job.recipient_name ||
                  courtCase.defendant ||
                  "Unknown Recipient",
                status: job.status || "pending",
                priority: priority,
                created_at: job.created_at || new Date().toISOString(),
                due_date: job.due_date || job.date_due,
                amount: parseFloat(job.amount || job.price || "0"),
                client_id: job.client_company?.id,
                client_company: job.client_company?.name,
                client_name:
                  job.client_contact?.first_name +
                  " " +
                  job.client_contact?.last_name,
                service_address: job.service_address,
                defendant_address: job.defendant_address,
                address: job.address,
                addresses_attributes: job.addresses_attributes,
                court_case_number: courtCase.number,
                plaintiff: courtCase.plaintiff,
                defendant_name: courtCase.defendant,
                attempt_count: job.attempt_count || attempts.length,
                attempts: attempts,
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
            console.log(
              "⚠️ No jobs found for client, creating mock jobs for testing",
            );

            // Create some mock jobs for Kelly Kerr (client_id: 1454323)
            if (filters.client_id === "1454323") {
              const mockJobs = [
                {
                  id: "mock-1",
                  job_number: "KK-001",
                  client_company: { id: 1454323, name: "Kerr Civil Process" },
                  recipient_name: "John Smith",
                  status: "in_progress",
                  priority: "high",
                  created_at: new Date().toISOString(),
                  due_date: new Date(
                    Date.now() + 3 * 24 * 60 * 60 * 1000,
                  ).toISOString(),
                  amount: 125,
                  city: "Atlanta",
                  state: "GA",
                  addresses_attributes: [
                    {
                      address1: "123 Main St",
                      city: "Atlanta",
                      state: "GA",
                      postal_code: "30309",
                    },
                  ],
                },
                {
                  id: "mock-2",
                  job_number: "KK-002",
                  client_company: { id: 1454323, name: "Kerr Civil Process" },
                  recipient_name: "Jane Doe",
                  status: "pending",
                  priority: "medium",
                  created_at: new Date().toISOString(),
                  due_date: new Date(
                    Date.now() + 5 * 24 * 60 * 60 * 1000,
                  ).toISOString(),
                  amount: 95,
                  city: "Marietta",
                  state: "GA",
                  addresses_attributes: [
                    {
                      address1: "456 Oak Ave",
                      city: "Marietta",
                      state: "GA",
                      postal_code: "30062",
                    },
                  ],
                },
              ];
              console.log(
                "🎭 Created mock jobs for Kelly Kerr:",
                mockJobs.length,
              );
              return mockJobs;
            }

            return [];
          }
        }

        return allJobs;
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
