import type { VercelRequest, VercelResponse } from "@vercel/node";

// No mock data - all data comes from ServeManager

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
      console.log("📋 Serving jobs data");

      // Get query parameters
      const clientId = req.query.client_id as string;
      const limit = req.query.limit as string;
      const refresh = req.query.refresh as string;

      console.log("🔍 Query params:", { clientId, limit, refresh });

      const servemanagerConfig = {
        baseUrl: process.env.SERVEMANAGER_BASE_URL,
        apiKey: process.env.SERVEMANAGER_API_KEY,
      };

      console.log("🔧 ServeManager config available:", {
        hasBaseUrl: !!servemanagerConfig.baseUrl,
        hasApiKey: !!servemanagerConfig.apiKey,
        baseUrl: servemanagerConfig.baseUrl,
      });

      if (servemanagerConfig.baseUrl && servemanagerConfig.apiKey) {
        try {
          // Try to fetch real jobs from ServeManager
          const credentials = Buffer.from(
            `${servemanagerConfig.apiKey}:`,
          ).toString("base64");

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

          console.log("🌐 Fetching from ServeManager:", url.toString());

          const response = await fetch(url.toString(), {
            headers: {
              Authorization: `Basic ${credentials}`,
              Accept: "application/vnd.api+json",
              "Content-Type": "application/vnd.api+json",
            },
          });

          console.log("📡 ServeManager response status:", response.status);

          if (response.ok) {
            const data = await response.json();
            console.log(
              "✅ Fetched real jobs from ServeManager. Jobs count:",
              data.data?.length || 0,
            );

            if (data.data && data.data.length > 0) {
              console.log(
                "📄 Sample job data:",
                JSON.stringify(data.data[0], null, 2),
              );
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
                JSON.stringify(transformedJobs[0], null, 2),
              );
            }

            return res.status(200).json({
              jobs: transformedJobs,
              source: "servemanager",
              total: data.meta?.total || transformedJobs.length,
            });
          } else {
            const errorText = await response.text();
            console.log(
              "❌ ServeManager API error:",
              response.status,
              errorText,
            );
          }
        } catch (error) {
          console.log("⚠️ ServeManager not available, using mock jobs:", error);
        }
      }

      // If ServeManager is not configured or failed, return empty array
      console.log("❌ ServeManager not available or not configured");
      return res.status(200).json({
        jobs: [],
        source: "empty",
        total: 0,
        error: "ServeManager API not configured or not available",
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Jobs API error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
