import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServer } from "../server";

// Cache the Express app to avoid recreating it on every request
let app: any = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!app) {
      console.log('Creating Express server for Vercel...');
      app = await createServer();
    }
    
    // Set the URL to match the Express route
    req.url = '/api/config';
    
    console.log(`Vercel API Config: ${req.method} ${req.url}`);
    
    // Forward the request to the Express app
    return app(req, res);
  } catch (error) {
    console.error("Config API handler error:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
}
