import type { VercelRequest, VercelResponse } from "@vercel/node";

// Mock invoices data for fallback
const mockInvoices = [
  {
    id: '1',
    invoice_number: 'INV-001',
    client_company: 'Kerr Civil Process',
    client_name: 'Kelly Kerr',
    status: 'paid',
    subtotal: 125.00,
    total: 125.00,
    created_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    paid_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '2',
    invoice_number: 'INV-002', 
    client_company: 'Pronto Process',
    client_name: 'Shawn Wells',
    status: 'sent',
    subtotal: 85.00,
    total: 85.00,
    created_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    due_date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
    paid_date: null
  },
  {
    id: '3',
    invoice_number: 'INV-003',
    client_company: 'Kerr Civil Process', 
    client_name: 'Kelly Kerr',
    status: 'draft',
    subtotal: 95.00,
    total: 95.00,
    created_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    due_date: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString(),
    paid_date: null
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
          console.log('ServeManager not available, using mock invoices:', error);
        }
      }

      // Fallback to mock invoices
      console.log('Using mock invoices');
      return res.status(200).json(mockInvoices);
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
