// Temporarily removing this endpoint to stay under Vercel's 12 function limit
export default function () {
  return { servers: [], total: 0 };
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

    console.log("👥 VERCEL DEBUG - Servers endpoint called:", {
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString(),
    });

    if (req.method === "GET") {
      // Check ServeManager configuration
      const servemanagerConfig = {
        baseUrl:
          process.env.SERVEMANAGER_BASE_URL ||
          global.tempApiConfig?.serveManager?.baseUrl,
        apiKey:
          process.env.SERVEMANAGER_API_KEY ||
          global.tempApiConfig?.serveManager?.apiKey,
      };

      console.log("🔧 VERCEL DEBUG - ServeManager config for servers:", {
        hasBaseUrl: !!servemanagerConfig.baseUrl,
        hasApiKey: !!servemanagerConfig.apiKey,
      });

      if (servemanagerConfig.baseUrl && servemanagerConfig.apiKey) {
        try {
          const credentials = Buffer.from(
            `${servemanagerConfig.apiKey}:`,
          ).toString("base64");

          console.log(
            "🌐 VERCEL DEBUG - Fetching servers from ServeManager...",
          );
          const response = await fetch(
            `${servemanagerConfig.baseUrl}/employees`,
            {
              headers: {
                Authorization: `Basic ${credentials}`,
                Accept: "application/vnd.api+json",
                "Content-Type": "application/vnd.api+json",
              },
            },
          );

          console.log("📡 VERCEL DEBUG - ServeManager servers response:", {
            status: response.status,
            ok: response.ok,
          });

          if (response.ok) {
            const data = await response.json();
            console.log("✅ VERCEL DEBUG - Servers data received:", {
              dataType: typeof data,
              hasData: !!data.data,
              serversCount: data.data?.length || 0,
            });

            // Transform ServeManager employee data to expected format
            const servers =
              data.data?.map((employee: any) => ({
                id: employee.id,
                name: `${employee.attributes?.first_name || ""} ${employee.attributes?.last_name || ""}`.trim(),
                email: employee.attributes?.email,
                phone: employee.attributes?.phone,
                license_number: employee.attributes?.license_number,
                permission: employee.attributes?.permission,
                active: !employee.attributes?.archived_at,
              })) || [];

            return res.status(200).json({
              servers,
              total: servers.length,
              source: "servemanager",
            });
          } else {
            console.log(
              "❌ VERCEL DEBUG - ServeManager servers API error:",
              response.status,
            );
          }
        } catch (error) {
          console.log(
            "⚠️ VERCEL DEBUG - ServeManager servers request failed:",
            error,
          );
        }
      }

      // Return empty array if ServeManager not available
      console.log("📭 VERCEL DEBUG - Returning empty servers array");
      return res.status(200).json({
        servers: [],
        total: 0,
        source: "empty",
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("🚨 VERCEL DEBUG - Servers endpoint error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
}
