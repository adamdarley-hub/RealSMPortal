import { RequestHandler } from 'express';
import { makeServeManagerRequest } from './servemanager';

// Get fresh document URL and serve content for preview
export const getDocumentPreview: RequestHandler = async (req, res) => {
  try {
    const { jobId, documentId } = req.params;
    
    console.log(`📄 Fetching fresh document preview for job ${jobId}, document ${documentId}`);

    // Fetch fresh job data from ServeManager to get current document URLs
    const jobData = await makeServeManagerRequest(`/jobs/${jobId}`);
    
    if (!jobData?.data?.documents_to_be_served) {
      return res.status(404).json({ error: 'Job or documents not found' });
    }

    // Find the specific document
    const document = jobData.data.documents_to_be_served.find(
      (doc: any) => doc.id.toString() === documentId.toString()
    );

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Get the fresh download URL
    const downloadUrl = document.upload?.links?.download_url;
    
    if (!downloadUrl) {
      return res.status(404).json({ error: 'Document URL not available' });
    }

    console.log(`📄 Found fresh URL for document ${documentId}, fetching content...`);

    // Fetch the document content from S3
    const documentResponse = await fetch(downloadUrl);
    
    if (!documentResponse.ok) {
      console.log(`❌ Failed to fetch document: ${documentResponse.status} ${documentResponse.statusText}`);
      
      if (documentResponse.status === 403) {
        return res.status(410).json({ 
          error: 'Document URL expired even after refresh',
          message: 'Unable to access document at this time'
        });
      }
      
      throw new Error(`Failed to fetch document: ${documentResponse.status}`);
    }

    // Set appropriate headers for inline viewing
    const contentType = documentResponse.headers.get('content-type') || 'application/pdf';
    const contentLength = documentResponse.headers.get('content-length');
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline');
    
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Stream the document content
    if (documentResponse.body) {
      (documentResponse.body as any).pipe(res);
    } else {
      throw new Error('No response body available');
    }

  } catch (error) {
    console.error('❌ Document preview error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch document preview',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get fresh document URL and serve content for download
export const getDocumentDownload: RequestHandler = async (req, res) => {
  try {
    const { jobId, documentId } = req.params;
    
    console.log(`💾 Fetching fresh document download for job ${jobId}, document ${documentId}`);

    // Fetch fresh job data from ServeManager
    const jobData = await makeServeManagerRequest(`/jobs/${jobId}`);
    
    if (!jobData?.data?.documents_to_be_served) {
      return res.status(404).json({ error: 'Job or documents not found' });
    }

    // Find the specific document
    const document = jobData.data.documents_to_be_served.find(
      (doc: any) => doc.id.toString() === documentId.toString()
    );

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Get the fresh download URL
    const downloadUrl = document.upload?.links?.download_url;
    
    if (!downloadUrl) {
      return res.status(404).json({ error: 'Document URL not available' });
    }

    // Fetch the document content
    const documentResponse = await fetch(downloadUrl);
    
    if (!documentResponse.ok) {
      if (documentResponse.status === 403) {
        return res.status(410).json({ 
          error: 'Document URL expired',
          message: 'Unable to download document at this time'
        });
      }
      throw new Error(`Failed to fetch document: ${documentResponse.status}`);
    }

    // Set appropriate headers for download
    const contentType = documentResponse.headers.get('content-type') || 'application/pdf';
    const contentLength = documentResponse.headers.get('content-length');
    const filename = document.title || document.file_name || `document-${documentId}.pdf`;
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Stream the document content
    if (documentResponse.body) {
      (documentResponse.body as any).pipe(res);
    } else {
      throw new Error('No response body available');
    }

  } catch (error) {
    console.error('❌ Document download error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch document download',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
