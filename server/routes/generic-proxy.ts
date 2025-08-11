import { RequestHandler } from 'express';
import fetch from 'node-fetch';

// Generic proxy endpoint that can handle any S3 URL
const genericProxy: RequestHandler = async (req, res) => {
  try {
    const { url } = req.query;
    const { preview = 'false' } = req.query;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    // Decode the URL
    const decodedUrl = decodeURIComponent(url);
    console.log('�� Proxying URL:', decodedUrl.substring(0, 100) + '...');

    // Fetch the content from the original URL
    const response = await fetch(decodedUrl);
    
    if (!response.ok) {
      if (response.status === 403) {
        return res.status(410).json({ 
          error: 'URL expired',
          message: 'The document link has expired. Please refresh the page to get updated links.'
        });
      }
      throw new Error(`Failed to fetch content: ${response.status} ${response.statusText}`);
    }

    // Get content type from original response
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentLength = response.headers.get('content-length');
    
    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    
    // Set Content-Disposition based on preview parameter
    if (preview === 'true') {
      res.setHeader('Content-Disposition', 'inline');
    } else {
      res.setHeader('Content-Disposition', 'attachment');
    }

    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Pipe the content
    response.body?.pipe(res);
    
  } catch (error) {
    console.error('❌ Generic proxy error:', error);
    res.status(500).json({ 
      error: 'Proxy failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Export for Node.js
module.exports = { genericProxy };
