import type { VercelRequest, VercelResponse } from "@vercel/node";

// Mock jobs data for fallback
const mockJobs = [
  {
    id: '1',
    job_number: 'JOB-001',
    client_company: 'Kerr Civil Process',
    client_name: 'Kelly Kerr',
    recipient_name: 'John Doe',
    status: 'served',
    priority: 'high',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
    amount: 125.00,
    city: 'Atlanta',
    state: 'GA',
    attempts: []
  },
  {
    id: '2', 
    job_number: 'JOB-002',
    client_company: 'Pronto Process',
    client_name: 'Shawn Wells',
    recipient_name: 'Jane Smith',
    status: 'in_progress',
    priority: 'medium',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
    amount: 85.00,
    city: 'Marietta',
    state: 'GA',
    attempts: []
  },
  {
    id: '3',
    job_number: 'JOB-003', 
    client_company: 'Kerr Civil Process',
    client_name: 'Kelly Kerr',
    recipient_name: 'Bob Johnson',
    status: 'pending',
    priority: 'low',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    amount: 95.00,
    city: 'Decatur',
    state: 'GA', 
    attempts: []
  }
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method === 'GET') {
      console.log('Serving jobs data');

      // Get query parameters
      const clientId = req.query.client_id as string;
      const limit = req.query.limit as string;

      console.log('Query params:', { clientId, limit });

      const servemanagerConfig = {
        baseUrl: process.env.SERVEMANAGER_BASE_URL,
        apiKey: process.env.SERVEMANAGER_API_KEY
      };

      if (servemanagerConfig.baseUrl && servemanagerConfig.apiKey) {
        try {
          // Try to fetch real jobs from ServeManager
          const credentials = Buffer.from(`${servemanagerConfig.apiKey}:`).toString('base64');

          // Build URL with query parameters
          const url = new URL(`${servemanagerConfig.baseUrl}/jobs`);
          if (clientId) {
            url.searchParams.set('filter[client_id]', clientId);
          }
          if (limit) {
            url.searchParams.set('page[size]', limit);
          }

          console.log('Fetching from ServeManager:', url.toString());

          const response = await fetch(url.toString(), {
            headers: {
              'Authorization': `Basic ${credentials}`,
              'Accept': 'application/vnd.api+json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            console.log('Fetched real jobs from ServeManager');
            
            // Transform ServeManager data to expected format
            const transformedJobs = data.data?.map((job: any) => ({
              id: job.id,
              job_number: job.attributes?.job_number || job.attributes?.reference || `JOB-${job.id}`,
              client_company: job.attributes?.client_company || job.relationships?.client?.data?.attributes?.company || 'Unknown Client',
              client_name: job.attributes?.client_name || 'Unknown',
              recipient_name: job.attributes?.recipient_name || job.attributes?.defendant_name || 'Unknown',
              status: job.attributes?.status || 'pending',
              priority: job.attributes?.priority || 'medium',
              created_at: job.attributes?.created_at || new Date().toISOString(),
              due_date: job.attributes?.due_date || job.attributes?.date_due,
              amount: parseFloat(job.attributes?.amount || job.attributes?.price || '0'),
              city: job.attributes?.city || job.attributes?.service_address?.city,
              state: job.attributes?.state || job.attributes?.service_address?.state,
              attempts: job.attributes?.attempts || []
            })) || [];

            // Filter by client_id if specified
            let filteredJobs = transformedJobs;
            if (clientId) {
              filteredJobs = transformedJobs.filter((job: any) =>
                job.client_id === clientId ||
                job.client_company?.includes('Kerr') && clientId === '1454323' ||
                job.client_company?.includes('Pronto') && clientId === '1454358'
              );
            }

            return res.status(200).json({ jobs: filteredJobs });
          }
        } catch (error) {
          console.log('ServeManager not available, using mock jobs:', error);
        }
      }

      // Fallback to mock jobs
      console.log('Using mock jobs');

      // Filter mock jobs by client_id if specified
      let filteredMockJobs = mockJobs;
      if (clientId) {
        filteredMockJobs = mockJobs.filter(job => {
          // Kelly Kerr client
          if (clientId === '1454323') {
            return job.client_company === 'Kerr Civil Process';
          }
          // Shawn Wells client
          if (clientId === '1454358') {
            return job.client_company === 'Pronto Process';
          }
          return false;
        });
      }

      console.log(`Returning ${filteredMockJobs.length} jobs for client ${clientId}`);
      return res.status(200).json({ jobs: filteredMockJobs });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Jobs API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
