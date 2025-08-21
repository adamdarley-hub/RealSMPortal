import type { VercelRequest, VercelResponse } from "@vercel/node";

// Fallback endpoint that provides basic job data structure for SPA deployments
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    if (req.method === "GET") {
      console.log("📋 CACHED-JOBS - Fallback endpoint called");
      
      // Get query parameters
      const limit = parseInt(req.query.limit as string) || 50;
      const page = parseInt(req.query.page as string) || 1;
      
      console.log("🔍 Query params:", { limit, page });

      // Check if we have ServeManager config available
      const servemanagerConfig = {
        baseUrl: process.env.SERVEMANAGER_BASE_URL,
        apiKey: process.env.SERVEMANAGER_API_KEY,
      };

      if (servemanagerConfig.baseUrl && servemanagerConfig.apiKey) {
        // Try to fetch from ServeManager if configured
        try {
          const credentials = Buffer.from(`${servemanagerConfig.apiKey}:`).toString("base64");
          const url = new URL(`${servemanagerConfig.baseUrl}/jobs`);
          url.searchParams.set("page[number]", page.toString());
          url.searchParams.set("page[size]", Math.min(limit, 100).toString());

          const response = await fetch(url.toString(), {
            headers: {
              Authorization: `Basic ${credentials}`,
              Accept: "application/vnd.api+json",
              "Content-Type": "application/vnd.api+json",
            },
            // Add timeout for production stability
            signal: AbortSignal.timeout(15000) // 15 second timeout
          });

          if (response.ok) {
            const data = await response.json();
            
            // Transform ServeManager data to expected format
            const transformedJobs = (data.data || []).map((job: any) => ({
              id: job.id,
              job_number: job.servemanager_job_number || job.job_number || `JOB-${job.id}`,
              recipient_name: job.recipient_name || job.defendant_name || "Unknown Recipient",
              client_company: job.client_company?.name || "Unknown Client",
              client_name: job.client_contact ? 
                `${job.client_contact.first_name || ''} ${job.client_contact.last_name || ''}`.trim() : 
                "Unknown Contact",
              status: job.service_status || job.status || "pending",
              priority: job.rush ? "rush" : "routine",
              created_at: job.created_at || new Date().toISOString(),
              due_date: job.due_date,
              amount: parseFloat(job.amount || job.price || "0"),
              server_name: job.employee_process_server ? 
                `${job.employee_process_server.first_name || ''} ${job.employee_process_server.last_name || ''}`.trim() : 
                null,
              attempt_count: job.attempt_count || 0
            }));

            return res.status(200).json({
              jobs: transformedJobs,
              total: data.meta?.total || transformedJobs.length,
              source: "servemanager_cached",
              page,
              limit,
              has_more: transformedJobs.length === limit
            });
          }
        } catch (smError) {
          console.log("⚠️ ServeManager unavailable in cached-jobs:", smError);
          // Fall through to empty response
        }
      }

      // Return empty response for health checks or when no data available
      return res.status(200).json({
        jobs: [],
        total: 0,
        source: "empty_cached",
        page,
        limit,
        has_more: false,
        message: "No data available - ServeManager not configured or unavailable"
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Cached Jobs API error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
