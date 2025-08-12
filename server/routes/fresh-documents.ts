import { RequestHandler } from 'express';
import { makeServeManagerRequest } from './servemanager';

// Get fresh document URL and serve content for preview
export const getDocumentPreview: RequestHandler = async (req, res) => {
  try {
    const { jobId, documentId } = req.params;
    
    console.log(`📄 Fetching fresh document preview for job ${jobId}, document ${documentId}`);

    // Fetch fresh job data from ServeManager to get current document URLs
    const jobData = await makeServeManagerRequest(`/jobs/${jobId}`);
    
    console.log('📄 Job data structure debug:', {
      hasJobData: !!jobData,
      hasData: !!jobData?.data,
      hasDocumentsToBeServed: !!jobData?.data?.documents_to_be_served,
      jobDataKeys: jobData ? Object.keys(jobData) : [],
      dataKeys: jobData?.data ? Object.keys(jobData.data) : [],
      documentsCount: jobData?.data?.documents_to_be_served?.length || 0,
      allPossibleDocumentFields: {
        'data.documents_to_be_served': jobData?.data?.documents_to_be_served,
        'documents_to_be_served': jobData?.documents_to_be_served,
        'documents': jobData?.data?.documents,
        'attachments': jobData?.data?.attachments,
        'files': jobData?.data?.files
      }
    });
    
    let documents = jobData?.data?.documents_to_be_served || 
                   jobData?.documents_to_be_served ||
                   jobData?.data?.documents ||
                   jobData?.data?.attachments ||
                   jobData?.data?.files ||
                   [];
    
    if (!documents || documents.length === 0) {
      console.error('❌ No documents found in job data:', jobData);
      return res.status(404).json({ 
        error: 'Job or documents not found',
        debug: {
          jobId,
          hasJobData: !!jobData,
          jobStructure: jobData ? Object.keys(jobData) : 'No job data'
        }
      });
    }

    // Find the specific document
    const document = documents.find(
      (doc: any) => doc.id.toString() === documentId.toString()
    );
    
    console.log('📄 Document search result:', {
      searchingForId: documentId,
      availableDocuments: documents.map(d => ({ id: d.id, title: d.title || d.name })),
      foundDocument: !!document
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Comprehensive document URL detection with debugging
    console.log('📄 Document structure debug:', {
      documentId: document.id,
      documentTitle: document.title,
      documentKeys: Object.keys(document),
      hasUpload: !!document.upload,
      uploadKeys: document.upload ? Object.keys(document.upload) : [],
      hasUploadLinks: !!document.upload?.links,
      uploadLinksKeys: document.upload?.links ? Object.keys(document.upload.links) : [],
      fullDocument: document
    });

    // Try multiple possible URL locations
    const downloadUrl = 
      document.upload?.links?.download_url ||
      document.upload?.download_url ||
      document.download_url ||
      document.links?.download_url ||
      document.url ||
      document.file_url ||
      document.links?.view ||
      document.links?.preview ||
      document.preview_url;
    
    console.log('📄 URL detection result:', {
      foundUrl: downloadUrl,
      allPossibleUrls: {
        'upload.links.download_url': document.upload?.links?.download_url,
        'upload.download_url': document.upload?.download_url,
        'download_url': document.download_url,
        'links.download_url': document.links?.download_url,
        'url': document.url,
        'file_url': document.file_url,
        'links.view': document.links?.view,
        'links.preview': document.links?.preview,
        'preview_url': document.preview_url
      }
    });
    
    if (!downloadUrl) {
      console.error('❌ No valid URL found for document', document);
      return res.status(404).json({ 
        error: 'Document URL not available',
        debug: {
          documentId: document.id,
          availableFields: Object.keys(document),
          uploadStructure: document.upload || 'No upload field'
        }
      });
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

    // Get document content as buffer and send it
    const documentBuffer = await documentResponse.arrayBuffer();
    const buffer = Buffer.from(documentBuffer);
    res.send(buffer);

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
    
    let documents = jobData?.data?.documents_to_be_served || 
                   jobData?.documents_to_be_served ||
                   jobData?.data?.documents ||
                   jobData?.data?.attachments ||
                   jobData?.data?.files ||
                   [];
    
    if (!documents || documents.length === 0) {
      return res.status(404).json({ error: 'Job or documents not found' });
    }

    // Find the specific document
    const document = documents.find(
      (doc: any) => doc.id.toString() === documentId.toString()
    );

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Get the fresh download URL with comprehensive detection
    const downloadUrl = 
      document.upload?.links?.download_url ||
      document.upload?.download_url ||
      document.download_url ||
      document.links?.download_url ||
      document.url ||
      document.file_url ||
      document.links?.view ||
      document.links?.preview ||
      document.preview_url;
    
    console.log('💾 Download URL detection:', {
      documentId: document.id,
      foundUrl: downloadUrl,
      documentStructure: Object.keys(document)
    });
    
    if (!downloadUrl) {
      console.error('❌ No valid download URL found for document', document);
      return res.status(404).json({ 
        error: 'Document URL not available',
        debug: {
          documentId: document.id,
          availableFields: Object.keys(document)
        }
      });
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

    // Get document content as buffer and send it
    const documentBuffer = await documentResponse.arrayBuffer();
    const buffer = Buffer.from(documentBuffer);
    res.send(buffer);

  } catch (error) {
    console.error('❌ Document download error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch document download',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
