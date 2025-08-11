import { RequestHandler } from 'express';
import fetch from 'node-fetch';

// Generic proxy endpoint to handle any URL with proper headers
export const genericProxy: RequestHandler = async (req, res) => {
  try {
    const { url, preview = 'false' } = req.query;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    console.log('🔗 Generic proxy request:', { url: url.substring(0, 100) + '...', preview });

    // Decode the URL
    const decodedUrl = decodeURIComponent(url);
    
    // Fetch the content
    const response = await fetch(decodedUrl);

    if (!response.ok) {
      console.log(`❌ Proxy fetch failed: ${response.status} ${response.statusText}`);

      // Handle various S3 error responses for expired/invalid URLs
      if (response.status === 403 || response.status === 400 || response.status === 404) {
        const errorHtml = `
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2>Document Temporarily Unavailable</h2>
              <p>The document URL has expired. Please refresh the page to reload the document.</p>
              <button onclick="window.parent.location.reload()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Refresh Page
              </button>
              <br><br>
              <small style="color: #666;">Error: ${response.status} ${response.statusText}</small>
            </body>
          </html>
        `;
        res.setHeader('Content-Type', 'text/html');
        return res.status(410).send(errorHtml);
      }
      throw new Error(`Failed to fetch resource: ${response.status}`);
    }

    // Set appropriate headers
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentLength = response.headers.get('content-length');
    
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

    // Add CORS headers if needed
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Pipe the content to the response
    response.body?.pipe(res);

  } catch (error) {
    console.error('❌ Generic proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to proxy resource',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
