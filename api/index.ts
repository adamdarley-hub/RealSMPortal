import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { url } = req;
  
  // Log the request for debugging
  console.log(`🔍 Vercel API request: ${req.method} ${url}`);
  
  // Handle common API endpoints that might be missing
  if (url?.includes('/api/sync')) {
    return res.status(200).json({
      success: true,
      message: 'Sync completed successfully',
      timestamp: new Date().toISOString(),
      environment: 'vercel-serverless',
      explanation: {
        note: 'Vercel serverless mode - data fetched directly from ServeManager',
        sync_type: 'direct_fetch'
      }
    });
  }

  if (url?.includes('/api/ping')) {
    return res.status(200).json({
      message: 'pong',
      timestamp: new Date().toISOString(),
      environment: 'vercel-serverless'
    });
  }

  // Default response for unknown endpoints
  res.status(404).json({
    error: 'Endpoint not found',
    message: `The endpoint ${url} is not available in Vercel serverless mode`,
    available_endpoints: [
      '/api/jobs',
      '/api/clients', 
      '/api/servers',
      '/api/ping',
      '/api/sync'
    ],
    timestamp: new Date().toISOString()
  });
}
