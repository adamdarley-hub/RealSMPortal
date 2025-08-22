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

// Mock court cases data for fallback
const mockCourtCases = [
  {
    id: "1",
    number: "2024-CV-001234",
    plaintiff: "Smith vs. Jones Construction LLC",
    defendant: "Jones Construction LLC",
    court: {
      name: "Superior Court of Fulton County",
      county: "Fulton",
      state: "GA",
    },
    filed_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    court_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "2",
    number: "2024-CV-005678",
    plaintiff: "Johnson v. Atlanta Properties Inc",
    defendant: "Atlanta Properties Inc",
    court: {
      name: "State Court of DeKalb County",
      county: "DeKalb",
      state: "GA",
    },
    filed_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    court_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "3",
    number: "2024-CV-009876",
    plaintiff: "Davis vs. Metro Services LLC",
    defendant: "Metro Services LLC",
    court: {
      name: "Magistrate Court of Cobb County",
      county: "Cobb",
      state: "GA",
    },
    filed_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    court_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

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
      console.log("Serving court cases data");

      const servemanagerConfig = getServeManagerConfig();

      if (
        servemanagerConfig.enabled &&
        servemanagerConfig.baseUrl &&
        servemanagerConfig.apiKey
      ) {
        try {
          // Try to fetch real court cases from ServeManager
          const credentials = Buffer.from(
            `${servemanagerConfig.apiKey}:`,
          ).toString("base64");
          const response = await fetch(
            `${servemanagerConfig.baseUrl}/court_cases`,
            {
              headers: {
                Authorization: `Basic ${credentials}`,
                Accept: "application/vnd.api+json",
              },
            },
          );

          if (response.ok) {
            const data = await response.json();
            console.log("Fetched real court cases from ServeManager");

            // Transform ServeManager data to expected format
            const transformedCases =
              data.data?.map((courtCase: any) => ({
                id: courtCase.id,
                number:
                  courtCase.attributes?.case_number ||
                  courtCase.attributes?.number ||
                  `CASE-${courtCase.id}`,
                plaintiff:
                  courtCase.attributes?.plaintiff || "Unknown Plaintiff",
                defendant:
                  courtCase.attributes?.defendant || "Unknown Defendant",
                court: {
                  name:
                    courtCase.attributes?.court_name ||
                    courtCase.attributes?.court?.name ||
                    "Unknown Court",
                  county:
                    courtCase.attributes?.county ||
                    courtCase.attributes?.court?.county,
                  state:
                    courtCase.attributes?.state ||
                    courtCase.attributes?.court?.state ||
                    "GA",
                },
                filed_date:
                  courtCase.attributes?.filed_date ||
                  courtCase.attributes?.created_at,
                court_date:
                  courtCase.attributes?.court_date ||
                  courtCase.attributes?.hearing_date,
                updated_at:
                  courtCase.attributes?.updated_at || new Date().toISOString(),
              })) || [];

            return res.status(200).json({ court_cases: transformedCases });
          }
        } catch (error) {
          console.log(
            "ServeManager not available, using mock court cases:",
            error,
          );
        }
      }

      // Fallback to mock court cases
      console.log("Using mock court cases");
      return res.status(200).json({ court_cases: mockCourtCases });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Court cases API error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
