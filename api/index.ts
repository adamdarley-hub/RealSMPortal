import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServer } from "../server";

// Cache the Express app to avoid recreating it on every request
let app: any = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!app) {
      app = await createServer();
    }

    // Forward the request to the Express app
    return app(req, res);
  } catch (error) {
    console.error("API handler error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
