import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    if (req.method === "POST") {
      const { baseUrl, apiKey } = req.body;

      if (!baseUrl || !apiKey) {
        return res.status(400).json({
          error: "Missing baseUrl or apiKey",
        });
      }

      try {
        // Test ServeManager connection
        const credentials = Buffer.from(`${apiKey}:`).toString("base64");

        const testUrl = `${baseUrl}/account`;
        console.log("Testing ServeManager connection to:", testUrl);

        const response = await fetch(testUrl, {
          headers: {
            Authorization: `Basic ${credentials}`,
            Accept: "application/vnd.api+json",
            "Content-Type": "application/vnd.api+json",
          },
        });

        console.log("ServeManager test response status:", response.status);

        if (response.ok) {
          const data = await response.json();
          console.log("ServeManager test successful");

          return res.status(200).json({
            success: true,
            message: "ServeManager API connection successful",
            account: data.data?.attributes?.name || "Connected",
          });
        } else {
          const errorText = await response.text();
          console.log("ServeManager test failed:", response.status, errorText);

          return res.status(response.status).json({
            error: `ServeManager API error: ${response.status} ${response.statusText}`,
            details: errorText,
          });
        }
      } catch (error) {
        console.error("ServeManager test error:", error);
        return res.status(500).json({
          error: "Failed to connect to ServeManager",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Test ServeManager API error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
