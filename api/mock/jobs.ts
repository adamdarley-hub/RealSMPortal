import type { VercelRequest, VercelResponse } from "@vercel/node";

// Mock job data for demonstration and fallback purposes
const mockJobs = [
  {
    id: "demo-1",
    job_number: "DEMO-001",
    recipient_name: "John Smith",
    client_company: "Demo Law Firm",
    client_name: "Sarah Johnson",
    status: "pending",
    priority: "routine",
    created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    due_date: new Date(Date.now() + 604800000).toISOString(), // 1 week from now
    amount: 125.00,
    server_name: null,
    attempt_count: 0
  },
  {
    id: "demo-2", 
    job_number: "DEMO-002",
    recipient_name: "Jane Doe",
    client_company: "Demo Law Firm",
    client_name: "Sarah Johnson", 
    status: "assigned",
    priority: "rush",
    created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    due_date: new Date(Date.now() + 259200000).toISOString(), // 3 days from now
    amount: 175.00,
    server_name: "Mike Wilson",
    attempt_count: 1
  },
  {
    id: "demo-3",
    job_number: "DEMO-003", 
    recipient_name: "Robert Brown",
    client_company: "Demo Law Firm",
    client_name: "Sarah Johnson",
    status: "served",
    priority: "routine", 
    created_at: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
    due_date: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    amount: 100.00,
    server_name: "Lisa Davis",
    attempt_count: 2
  }
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    if (req.method === "GET") {
      console.log("📋 MOCK JOBS - Serving demo data");
      
      // Get query parameters
      const limit = parseInt(req.query.limit as string) || 50;
      const page = parseInt(req.query.page as string) || 1;
      
      // Simple pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedJobs = mockJobs.slice(startIndex, endIndex);
      
      return res.status(200).json({
        jobs: paginatedJobs,
        total: mockJobs.length,
        source: "mock",
        mock: true,
        page,
        limit,
        has_more: endIndex < mockJobs.length,
        message: "Demo data - ServeManager integration not available"
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Mock Jobs API error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
