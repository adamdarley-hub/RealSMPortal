import type { VercelRequest, VercelResponse } from "@vercel/node";

// No mock data - all invoices should come from ServeManager

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
      console.log('Serving invoices data');
      
      const servemanagerConfig = {
        baseUrl: process.env.SERVEMANAGER_BASE_URL,
        apiKey: process.env.SERVEMANAGER_API_KEY
      };

      if (servemanagerConfig.baseUrl && servemanagerConfig.apiKey) {
        try {
          // Try to fetch real invoices from ServeManager
          const credentials = Buffer.from(`${servemanagerConfig.apiKey}:`).toString('base64');
          const response = await fetch(`${servemanagerConfig.baseUrl}/invoices`, {
            headers: {
              'Authorization': `Basic ${credentials}`,
              'Accept': 'application/vnd.api+json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            console.log('Fetched real invoices from ServeManager');
            
            // Transform ServeManager data to expected format
            const transformedInvoices = data.data?.map((invoice: any) => ({
              id: invoice.id,
              invoice_number: invoice.attributes?.invoice_number || `INV-${invoice.id}`,
              client_company: invoice.attributes?.client_company || 'Unknown Client',
              client_name: invoice.attributes?.client_name || 'Unknown',
              status: invoice.attributes?.status || 'draft',
              subtotal: parseFloat(invoice.attributes?.subtotal || '0'),
              total: parseFloat(invoice.attributes?.total || '0'),
              created_date: invoice.attributes?.created_date || new Date().toISOString(),
              due_date: invoice.attributes?.due_date,
              paid_date: invoice.attributes?.paid_date
            })) || [];

            return res.status(200).json(transformedInvoices);
          }
        } catch (error) {
          console.log('ServeManager not available');
        }
      }

      // No mock data - return empty array
      console.log('ServeManager not configured or available');
      return res.status(200).json([]);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Invoices API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
