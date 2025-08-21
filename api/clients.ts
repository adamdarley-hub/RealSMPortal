import type { VercelRequest, VercelResponse } from "@vercel/node";

// Mock clients data - in production this would come from ServeManager or database
const mockClients = [
  {
    id: '1454323',
    name: 'Kelly Kerr',
    email: 'kelly@kerrcivilprocess.com', 
    company: 'Kerr Civil Process',
    phone: '(555) 123-4567',
    address: '123 Main St',
    city: 'Atlanta',
    state: 'GA',
    zip: '30309'
  },
  {
    id: '1454358',
    name: 'Shawn Wells',
    email: 'office@prontoprocess.com',
    company: 'Pronto Process',
    phone: '(555) 987-6543',
    address: '456 Oak Ave',
    city: 'Atlanta', 
    state: 'GA',
    zip: '30305'
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
      console.log('Serving clients data for authentication lookup');
      
      // In production, this would fetch from ServeManager API
      // For now, return mock clients for authentication to work
      const servemanagerConfig = {
        baseUrl: process.env.SERVEMANAGER_BASE_URL,
        apiKey: process.env.SERVEMANAGER_API_KEY
      };

      if (servemanagerConfig.baseUrl && servemanagerConfig.apiKey) {
        try {
          // Try to fetch real clients from ServeManager
          const credentials = Buffer.from(`${servemanagerConfig.apiKey}:`).toString('base64');
          const response = await fetch(`${servemanagerConfig.baseUrl}/companies`, {
            headers: {
              'Authorization': `Basic ${credentials}`,
              'Accept': 'application/vnd.api+json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            console.log('Fetched real clients from ServeManager');
            return res.status(200).json(data);
          }
        } catch (error) {
          console.log('ServeManager not available, using mock clients');
        }
      }

      // Fallback to mock clients
      console.log('Using mock clients for authentication');
      return res.status(200).json({ data: mockClients });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Clients API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
