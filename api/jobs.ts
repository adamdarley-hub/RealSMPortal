import type { VercelRequest, VercelResponse } from "@vercel/node";

// Simple config getter to avoid import issues
function getServeManagerConfig() {
  // Environment variables take priority
  const envBaseUrl = process.env.SERVEMANAGER_BASE_URL;
  const envApiKey = process.env.SERVEMANAGER_API_KEY;

  if (envBaseUrl && envApiKey) {
    return {
      baseUrl: envBaseUrl,
      apiKey: envApiKey,
      enabled: true,
    };
  }

  // Fall back to global memory
  const globalConfig = global.tempApiConfig?.serveManager;
  if (globalConfig?.baseUrl && globalConfig?.apiKey) {
    return {
      baseUrl: globalConfig.baseUrl,
      apiKey: globalConfig.apiKey,
      enabled: globalConfig.enabled || false,
    };
  }

  // HARDCODED FALLBACK FOR TESTING
  return {
    baseUrl: "https://www.servemanager.com/api",
    apiKey: "mGcmzLfOxLXa5wCJfhbXgQ",
    enabled: true,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    if (req.method === "GET") {
      console.log("📋 VERCEL JOBS - Serving jobs data");
      console.log("🌍 VERCEL JOBS - Environment:", {
        hostname: req.headers.host,
        timestamp: new Date().toISOString(),
        userAgent: req.headers["user-agent"]?.substring(0, 50),
      });

      // Get query parameters
      const clientId = req.query.client_id as string;
      const limit = req.query.limit as string;
      const refresh = req.query.refresh as string;

      console.log("🔍 VERCEL JOBS - Query params:", {
        clientId,
        limit,
        refresh,
      });

      // Get ServeManager configuration
      const servemanagerConfig = getServeManagerConfig();

      console.log("🔧 VERCEL DEBUG - ServeManager config check:", {
        hasBaseUrl: !!servemanagerConfig.baseUrl,
        hasApiKey: !!servemanagerConfig.apiKey,
        enabled: servemanagerConfig.enabled,
        baseUrl: servemanagerConfig.baseUrl,
        apiKeyLength: servemanagerConfig.apiKey?.length || 0,
      });

      if (
        servemanagerConfig.enabled &&
        servemanagerConfig.baseUrl &&
        servemanagerConfig.apiKey
      ) {
        console.log(
          "✅ VERCEL DEBUG - ServeManager credentials available, attempting API call",
        );
        try {
          // Try to fetch real jobs from ServeManager
          const credentials = Buffer.from(
            `${servemanagerConfig.apiKey}:`,
          ).toString("base64");

          console.log("🔑 VERCEL DEBUG - Generated credentials for API call");

          // Build URL with query parameters - ServeManager uses JSON:API format
          const url = new URL(`${servemanagerConfig.baseUrl}/jobs`);

          // Add pagination
          url.searchParams.set("page[number]", "1");
          url.searchParams.set("page[size]", limit || "100");

          // Add client filter if specified
          if (clientId) {
            url.searchParams.set("filter[client_id]", clientId);
          }

          // Add includes for related data
          url.searchParams.set("include", "client,service_attempts,addresses");

          console.log("🌐 VERCEL DEBUG - Making ServeManager request:", {
            url: url.toString(),
            method: "GET",
            hasCredentials: !!credentials,
            timestamp: new Date().toISOString(),
          });

          const response = await fetch(url.toString(), {
            headers: {
              Authorization: `Basic ${credentials}`,
              Accept: "application/vnd.api+json",
              "Content-Type": "application/vnd.api+json",
            },
          });

          console.log("📡 VERCEL DEBUG - ServeManager response:", {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            contentType: response.headers.get("content-type"),
            timestamp: new Date().toISOString(),
          });

          if (response.ok) {
            const data = await response.json();
            console.log(
              "✅ Fetched real jobs from ServeManager. Jobs count:",
              data.data?.length || 0,
            );

            // LOG THE FULL RAW RESPONSE STRUCTURE
            console.log("🔍 FULL RAW SERVEMANAGER RESPONSE:");
            console.log("📋 Response structure:", {
              hasData: !!data.data,
              dataLength: data.data?.length || 0,
              hasMeta: !!data.meta,
              hasIncluded: !!data.included,
              includedLength: data.included?.length || 0,
              metaKeys: data.meta ? Object.keys(data.meta) : [],
            });

            if (data.data && data.data.length > 0) {
              console.log("📄 FIRST JOB RAW DATA:");
              console.log(JSON.stringify(data.data[0], null, 2));

              if (data.included && data.included.length > 0) {
                console.log("📎 FIRST INCLUDED ITEM:");
                console.log(JSON.stringify(data.included[0], null, 2));
              }
            }

            // Transform ServeManager data to expected format
            const transformedJobs =
              data.data?.map((job: any) => {
                const attributes = job.attributes || {};
                const relationships = job.relationships || {};

                // Get client info from included data or relationships
                const clientData = data.included?.find(
                  (item: any) =>
                    item.type === "client" &&
                    item.id === relationships.client?.data?.id,
                );

                return {
                  id: job.id,
                  job_number:
                    attributes.job_number ||
                    attributes.reference ||
                    `JOB-${job.id}`,
                  client_company:
                    clientData?.attributes?.company ||
                    attributes.client_company ||
                    "Unknown Client",
                  client_name:
                    clientData?.attributes?.name ||
                    attributes.client_name ||
                    "Unknown",
                  client_id: relationships.client?.data?.id || null,
                  recipient_name:
                    attributes.recipient_name ||
                    attributes.defendant_name ||
                    "Unknown Recipient",
                  status: attributes.status || "pending",
                  priority: attributes.priority || "medium",
                  created_at: attributes.created_at || new Date().toISOString(),
                  due_date: attributes.due_date || attributes.date_due,
                  amount: parseFloat(
                    attributes.amount || attributes.price || "0",
                  ),
                  city:
                    attributes.city ||
                    attributes.service_address?.city ||
                    "Unknown",
                  state:
                    attributes.state ||
                    attributes.service_address?.state ||
                    "Unknown",
                  zip: attributes.zip || attributes.service_address?.zip,
                  address:
                    attributes.address || attributes.service_address?.address,
                  attempts: attributes.service_attempts || [],
                  documents: attributes.documents || [],
                  notes: attributes.notes,
                };
              }) || [];

            console.log("🔄 Transformed jobs count:", transformedJobs.length);

            if (transformedJobs.length > 0) {
              console.log(
                "📋 Sample transformed job:",
                JSON.stringify(transformedJobs[0], null, 2).substring(0, 300),
              );
            }

            return res.status(200).json({
              jobs: transformedJobs,
              source: "servemanager",
              total: data.meta?.total || transformedJobs.length,
            });
          } else {
            const errorText = await response.text();
            console.log("❌ VERCEL JOBS - ServeManager API error:", {
              status: response.status,
              statusText: response.statusText,
              errorText: errorText.substring(0, 200),
              url: url.toString(),
            });
          }
        } catch (error) {
          console.log("⚠️ VERCEL JOBS - ServeManager request failed:", {
            error: error instanceof Error ? error.message : "Unknown error",
            errorType:
              error instanceof Error ? error.constructor.name : "Unknown",
            baseUrl: servemanagerConfig.baseUrl,
            hasApiKey: !!servemanagerConfig.apiKey,
          });
        }
      } else {
        console.log("❌ VERCEL DEBUG - ServeManager not configured:", {
          enabled: servemanagerConfig.enabled,
          hasBaseUrl: !!servemanagerConfig.baseUrl,
          hasApiKey: !!servemanagerConfig.apiKey,
          envVarsSet: {
            hasEnvBaseUrl: !!process.env.SERVEMANAGER_BASE_URL,
            hasEnvApiKey: !!process.env.SERVEMANAGER_API_KEY,
          },
        });
      }

      // If ServeManager is not configured or failed, return empty array
      console.log(
        "🔧 VERCEL DEBUG - Final fallback - returning empty jobs array",
      );

      return res.status(200).json({
        jobs: [],
        source: "empty",
        total: 0,
        page: 1,
        limit: parseInt(limit as string) || 100,
        has_more: false,
        message:
          "ServeManager API not configured or not available. Please configure API credentials in Settings.",
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("❌ VERCEL JOBS - Unhandled error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
      message: "Jobs API encountered an error. Please try again.",
    });
  }
}
