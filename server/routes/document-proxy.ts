import { RequestHandler } from 'express';
import fetch from 'node-fetch';

// Proxy endpoint to serve documents with fresh URLs and proper headers
export const getDocumentProxy: RequestHandler = async (req, res) => {
  try {
    const { jobId, documentId, type = 'document' } = req.params;
    const { download = 'false' } = req.query;
    
    console.log('📄 Document proxy request:', { jobId, documentId, type, download });

    // For now, we'll need to get the fresh URL from the job data
    // In a full implementation, you'd call the ServeManager API to get fresh URLs
    
    // Get job from cache to find the document
    const { cacheService } = await import('../services/cache-service');
    const job = await cacheService.getJobFromCache(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    let documentUrl: string | null = null;

    // Find the document in the job data
    if (type === 'document' && job.raw_data?.documents_to_be_served) {
      const document = job.raw_data.documents_to_be_served.find(
        (doc: any) => doc.id.toString() === documentId
      );
      documentUrl = document?.upload?.links?.download_url;
    } else if (type === 'attachment' && job.raw_data?.misc_attachments) {
      const attachment = job.raw_data.misc_attachments.find(
        (att: any) => att.id.toString() === documentId
      );
      documentUrl = attachment?.upload?.links?.download_url;
    }

    if (!documentUrl) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Fetch the document from S3/ServeManager
    const documentResponse = await fetch(documentUrl);
    
    if (!documentResponse.ok) {
      if (documentResponse.status === 403) {
        return res.status(410).json({ 
          error: 'Document URL expired',
          message: 'Please refresh the page to get updated document links'
        });
      }
      throw new Error(`Failed to fetch document: ${documentResponse.status}`);
    }

    // Set appropriate headers
    const contentType = documentResponse.headers.get('content-type') || 'application/pdf';
    const contentLength = documentResponse.headers.get('content-length');
    
    res.setHeader('Content-Type', contentType);
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Set Content-Disposition based on download parameter
    if (download === 'true') {
      res.setHeader('Content-Disposition', 'attachment');
    } else {
      res.setHeader('Content-Disposition', 'inline');
    }

    // Pipe the document content to the response
    documentResponse.body?.pipe(res);

  } catch (error) {
    console.error('❌ Document proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to proxy document',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Proxy endpoint for attempt photos
export const getAttemptPhotoProxy: RequestHandler = async (req, res) => {
  try {
    const { jobId, attemptId, photoId } = req.params;
    const { download = 'false' } = req.query;

    console.log('📸 Photo proxy request:', { jobId, attemptId, photoId, download });

    // Get job from cache
    const { cacheService } = await import('../services/cache-service');
    const job = await cacheService.getJobFromCache(jobId);

    console.log('📸 Job lookup result:', {
      jobFound: !!job,
      jobId: job?.id,
      hasAttempts: !!job?.attempts,
      attemptsCount: job?.attempts?.length || 0
    });

    if (!job || !job.attempts) {
      console.log('❌ Job or attempts not found:', { job: !!job, attempts: job?.attempts?.length });
      return res.status(404).json({ error: 'Job or attempts not found' });
    }

    // Find the photo in the attempt
    const attempt = job.attempts.find((att: any) => att.id?.toString() === attemptId);

    console.log('📸 Attempt lookup:', {
      searchingForAttemptId: attemptId,
      availableAttemptIds: job.attempts.map((a: any) => a.id),
      attemptFound: !!attempt,
      attemptHasMiscAttachments: !!attempt?.misc_attachments,
      attemptHasAttachments: !!attempt?.attachments,
      miscAttachmentsCount: attempt?.misc_attachments?.length || 0,
      attachmentsCount: attempt?.attachments?.length || 0
    });

    if (!attempt) {
      console.log('❌ Attempt not found');
      return res.status(404).json({ error: 'Attempt not found' });
    }

    // Check both misc_attachments and attachments fields
    const attachments = attempt.misc_attachments || attempt.attachments || [];

    if (attachments.length === 0) {
      console.log('❌ No attachments found in attempt');
      return res.status(404).json({ error: 'No attachments found in attempt' });
    }

    const photo = attachments.find((photo: any) => photo.id?.toString() === photoId);

    console.log('📸 Photo lookup:', {
      searchingForPhotoId: photoId,
      availablePhotoIds: attachments.map((a: any) => ({ id: a.id, title: a.title })),
      photoFound: !!photo,
      photoHasUpload: !!photo?.upload,
      photoHasLinks: !!photo?.upload?.links,
      photoHasDownloadUrl: !!photo?.upload?.links?.download_url,
      photoDownloadUrl: photo?.upload?.links?.download_url,
      photoStructure: photo ? Object.keys(photo) : 'N/A'
    });

    if (!photo) {
      console.log('❌ Photo not found in attachments');
      return res.status(404).json({ error: 'Photo not found' });
    }

    const downloadUrl = photo.upload?.links?.download_url || photo.download_url || photo.url;
    if (!downloadUrl) {
      console.log('❌ No download URL found for photo');
      return res.status(404).json({ error: 'Photo download URL not found' });
    }

    // Fetch the photo
    const photoResponse = await fetch(photo.upload.links.download_url);
    
    if (!photoResponse.ok) {
      if (photoResponse.status === 403) {
        return res.status(410).json({ 
          error: 'Photo URL expired',
          message: 'Please refresh the page to get updated photo links'
        });
      }
      throw new Error(`Failed to fetch photo: ${photoResponse.status}`);
    }

    // Set headers
    const contentType = photoResponse.headers.get('content-type') || 'image/jpeg';
    const contentLength = photoResponse.headers.get('content-length');
    
    res.setHeader('Content-Type', contentType);
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    if (download === 'true') {
      res.setHeader('Content-Disposition', `attachment; filename="${photo.title || 'photo.jpg'}"`);
    } else {
      res.setHeader('Content-Disposition', 'inline');
    }

    // Pipe the photo content
    photoResponse.body?.pipe(res);

  } catch (error) {
    console.error('❌ Photo proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to proxy photo',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
