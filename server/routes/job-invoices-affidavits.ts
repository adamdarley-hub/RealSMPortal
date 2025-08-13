import { RequestHandler } from "express";
import { makeServeManagerRequest } from "./servemanager";

// Get invoices for a specific job (only issued or paid)
export const getJobInvoices: RequestHandler = async (req, res) => {
  try {
    const { jobId } = req.params;
    console.log(`🧾 Fetching invoices for job ${jobId}...`);

    // Filter for issued or paid invoices only (as requested)
    const filterParams = new URLSearchParams();
    filterParams.append('filter[invoice_status][]', 'issued');
    filterParams.append('filter[invoice_status][]', 'paid');
    filterParams.append('filter[invoice_status][]', 'Issued');
    filterParams.append('filter[invoice_status][]', 'Paid');
    filterParams.append('filter[invoice_status][]', 'sent');
    filterParams.append('filter[invoice_status][]', 'Sent');
    filterParams.append('per_page', '100');

    // Fetch all invoices with pagination
    let allInvoices: any[] = [];
    let page = 1;
    let hasMorePages = true;
    const maxPages = 10; // Reasonable limit for job-specific invoices

    while (hasMorePages && page <= maxPages) {
      const params = new URLSearchParams(filterParams);
      params.append('page', page.toString());

      const endpoint = `/invoices?${params.toString()}`;
      console.log(`Fetching invoices page ${page} for job ${jobId}`);

      try {
        const pageData = await makeServeManagerRequest(endpoint);

        let pageInvoices: any[] = [];
        if (pageData.data && Array.isArray(pageData.data)) {
          pageInvoices = pageData.data;
        } else if (pageData.invoices && Array.isArray(pageData.invoices)) {
          pageInvoices = pageData.invoices;
        } else if (Array.isArray(pageData)) {
          pageInvoices = pageData;
        }

        console.log(`Invoices page ${page}: Found ${pageInvoices.length} invoices`);

        if (pageInvoices.length > 0) {
          allInvoices.push(...pageInvoices);
          hasMorePages = pageInvoices.length === 100;
          page++;
        } else {
          hasMorePages = false;
        }
      } catch (pageError) {
        console.error(`Error fetching invoices page ${page}:`, pageError);
        hasMorePages = false;
      }
    }

    // Filter invoices that contain the specific job
    const jobInvoices = allInvoices.filter(invoice => {
      console.log(`🔍 Checking invoice ${invoice.id} for job ${jobId}:`, {
        invoiceJobId: invoice.job_id,
        invoiceJobIdType: typeof invoice.job_id,
        jobIdParam: jobId,
        jobIdParamType: typeof jobId,
        jobIdParamInt: parseInt(jobId),
        match: invoice.job_id === parseInt(jobId) || String(invoice.job_id) === String(jobId)
      });

      // ServeManager invoice structure - check job_id directly
      if (invoice.job_id) {
        return invoice.job_id === parseInt(jobId) ||
               String(invoice.job_id) === String(jobId);
      }

      // Check if this invoice contains the job in a jobs array
      if (invoice.jobs && Array.isArray(invoice.jobs)) {
        return invoice.jobs.some((job: any) =>
          job.id === parseInt(jobId) ||
          job.job_id === parseInt(jobId) ||
          job.job_number === jobId ||
          String(job.id) === String(jobId)
        );
      }

      // Alternative structure - job_ids array
      if (invoice.job_ids && Array.isArray(invoice.job_ids)) {
        return invoice.job_ids.includes(parseInt(jobId)) ||
               invoice.job_ids.includes(jobId);
      }

      return false;
    });

    console.log(`🧾 Found ${jobInvoices.length} invoices for job ${jobId}`);
    console.log('🧾 All invoices summary:', allInvoices.map(inv => ({ id: inv.id, status: inv.status, job_id: inv.job_id })));
    console.log('🧾 Filtered job invoices:', jobInvoices.map(inv => ({ id: inv.id, status: inv.status, job_id: inv.job_id })));

    res.json({
      invoices: jobInvoices,
      total: jobInvoices.length,
      job_id: jobId
    });

  } catch (error) {
    console.error(`Error fetching invoices for job ${req.params.jobId}:`, error);
    
    // Return mock data with matching structure
    const mockInvoices = [
      {
        id: "inv001",
        invoice_number: "INV-2024-001",
        status: "issued",
        total: 100.00,
        subtotal: 92.59,
        tax: 7.41,
        created_at: "2024-01-15T00:00:00Z",
        due_date: "2024-02-14T00:00:00Z",
        pdf_url: "https://example.com/invoice.pdf",
        jobs: [{ id: req.params.jobId, amount: 50.00 }]
      }
    ];

    res.json({
      invoices: mockInvoices,
      total: mockInvoices.length,
      job_id: req.params.jobId,
      mock: true
    });
  }
};

// Get affidavits for a specific job (only signed)
export const getJobAffidavits: RequestHandler = async (req, res) => {
  try {
    const { jobId } = req.params;
    console.log(`📜 Fetching affidavits for job ${jobId}...`);

    // Get the specific job to check for affidavits
    const jobResponse = await makeServeManagerRequest(`/jobs/${jobId}`);

    let jobData = null;
    if (jobResponse.data) {
      jobData = jobResponse.data;
    } else if (jobResponse.id) {
      jobData = jobResponse;
    }

    if (!jobData) {
      console.log(`❌ Job ${jobId} not found`);
      return res.json({
        affidavits: [],
        total: 0,
        job_id: jobId,
        error: 'Job not found'
      });
    }

    console.log(`📜 Job ${jobId} affidavit data:`, {
      affidavitCount: jobData.affidavit_count,
      hasDocuments: !!jobData.documents,
      documentsCount: jobData.documents?.length || 0,
      hasMiscAttachments: !!jobData.misc_attachments,
      miscAttachmentsCount: jobData.misc_attachments?.length || 0,
      documentTypes: jobData.documents?.map((d: any) => ({ id: d.id, type: d.upload_type, title: d.title })) || []
    });

    const jobAffidavits: any[] = [];

    // Check documents array for affidavits (ServeManager stores affidavits as documents)
    if (jobData.documents && Array.isArray(jobData.documents)) {
      const affidavitDocs = jobData.documents.filter((doc: any) =>
        doc.upload_type === 'affidavit' ||
        doc.type === 'affidavit' ||
        doc.title?.toLowerCase().includes('affidavit')
      );

      affidavitDocs.forEach((doc: any) => {
        const affidavit = {
          id: doc.id,
          job_id: jobId,
          signed_at: doc.updated_at || doc.created_at,
          created_at: doc.created_at,
          status: 'signed', // If it's in documents, assume it's signed
          signer: jobData.employee_process_server?.first_name + ' ' + jobData.employee_process_server?.last_name || 'Process Server',
          pdf_url: doc.upload?.links?.download_url || doc.download_url,
          title: doc.title || 'Affidavit of Service'
        };

        jobAffidavits.push(affidavit);
      });
    }

    // Also check misc_attachments for affidavit documents
    if (jobData.misc_attachments && Array.isArray(jobData.misc_attachments)) {
      const affidavitAttachments = jobData.misc_attachments.filter((attachment: any) =>
        (attachment.upload_type === 'affidavit' || attachment.type === 'affidavit') &&
        attachment.signed === true
      );

      affidavitAttachments.forEach((attachment: any) => {
        // Avoid duplicates
        if (!jobAffidavits.find(a => a.id === attachment.id)) {
          const affidavit = {
            id: attachment.id,
            job_id: jobId,
            signed_at: attachment.updated_at,
            created_at: attachment.created_at,
            status: 'signed',
            signer: jobData.employee_process_server?.first_name + ' ' + jobData.employee_process_server?.last_name || 'Process Server',
            pdf_url: attachment.upload?.links?.download_url || attachment.download_url,
            title: attachment.title || 'Affidavit of Service'
          };

          jobAffidavits.push(affidavit);
        }
      });
    }

    console.log(`📜 Found ${jobAffidavits.length} signed affidavits for job ${jobId}`);
    console.log(`📜 Affidavits summary:`, jobAffidavits.map(a => ({ id: a.id, title: a.title, hasPdfUrl: !!a.pdf_url })));

    res.json({
      affidavits: jobAffidavits,
      total: jobAffidavits.length,
      job_id: jobId
    });

  } catch (error) {
    console.error(`Error fetching affidavits for job ${req.params.jobId}:`, error);

    // Return empty array for failed requests
    res.json({
      affidavits: [],
      total: 0,
      job_id: req.params.jobId,
      error: 'Failed to fetch affidavits'
    });
  }
};

// Proxy invoice PDF download
export const downloadJobInvoice: RequestHandler = async (req, res) => {
  try {
    const { jobId, invoiceId } = req.params;
    console.log(`📥 Downloading invoice ${invoiceId} for job ${jobId}...`);

    // Get fresh job data from ServeManager to find the invoice PDF URL
    const jobResponse = await makeServeManagerRequest(`/jobs/${jobId}`);
    const jobData = jobResponse.data || jobResponse;

    if (!jobData) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Check if this job has the requested invoice
    if (!jobData.invoice || jobData.invoice.id.toString() !== invoiceId.toString()) {
      return res.status(404).json({ error: 'Invoice not associated with this job' });
    }

    const pdfUrl = jobData.invoice.pdf_download_url;
    if (!pdfUrl) {
      return res.status(404).json({ error: 'Invoice PDF not available' });
    }

    console.log(`📥 Downloading invoice PDF from: ${pdfUrl}`);

    // Fetch the PDF using authenticated request (same as makeServeManagerRequest)
    const { getServeManagerConfig } = await import('./servemanager');
    const config = await getServeManagerConfig();
    const credentials = Buffer.from(`${config.apiKey}:`).toString('base64');

    const pdfResponse = await fetch(pdfUrl, {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    });

    if (!pdfResponse.ok) {
      console.error(`❌ Failed to download invoice PDF: ${pdfResponse.status} ${pdfResponse.statusText}`);
      return res.status(404).json({
        error: `Invoice PDF not available (${pdfResponse.status} ${pdfResponse.statusText})`
      });
    }

    // Set appropriate headers for download
    const contentType = pdfResponse.headers.get('content-type') || 'application/pdf';
    const contentLength = pdfResponse.headers.get('content-length');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoiceId}.pdf"`);
    res.setHeader('Cache-Control', 'public, max-age=300');

    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Stream the PDF
    pdfResponse.body?.pipe(res);

  } catch (error) {
    console.error(`Error downloading invoice ${req.params.invoiceId}:`, error);
    res.status(500).json({ error: 'Failed to download invoice' });
  }
};

// Proxy invoice PDF preview
export const previewJobInvoice: RequestHandler = async (req, res) => {
  try {
    const { jobId, invoiceId } = req.params;
    console.log(`👁️ Previewing invoice ${invoiceId} for job ${jobId}...`);

    // Get fresh job data from ServeManager to find the invoice PDF URL
    const jobResponse = await makeServeManagerRequest(`/jobs/${jobId}`);
    const jobData = jobResponse.data || jobResponse;

    if (!jobData) {
      const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>Invoice Preview Error</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2>Job Not Found</h2>
          <p>Job #${jobId} could not be found.</p>
        </body>
        </html>
      `;
      res.setHeader('Content-Type', 'text/html');
      return res.status(404).send(errorHtml);
    }

    console.log(`📄 Job invoice data:`, {
      hasInvoice: !!jobData.invoice,
      invoiceId: jobData.invoice?.id,
      invoiceStatus: jobData.invoice?.status,
      hasPdfUrl: !!jobData.invoice?.pdf_download_url
    });

    // Check if this job has the requested invoice
    if (!jobData.invoice || jobData.invoice.id.toString() !== invoiceId.toString()) {
      const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>Invoice Preview Error</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2>Invoice Not Found</h2>
          <p>Invoice #${invoiceId} is not associated with this job.</p>
        </body>
        </html>
      `;
      res.setHeader('Content-Type', 'text/html');
      return res.status(404).send(errorHtml);
    }

    const pdfUrl = jobData.invoice.pdf_download_url;
    if (!pdfUrl) {
      const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>Invoice Preview Error</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2>Invoice PDF Not Available</h2>
          <p>Invoice #${invoiceId} PDF is not yet generated.</p>
          <p>Status: ${jobData.invoice.status}</p>
        </body>
        </html>
      `;
      res.setHeader('Content-Type', 'text/html');
      return res.status(404).send(errorHtml);
    }

    console.log(`📄 Fetching invoice PDF from: ${pdfUrl}`);
    console.log(`📄 PDF URL structure: ${pdfUrl.substring(0, 100)}...`);

    // Try fetching the PDF URL directly first (might already include auth tokens)
    const pdfResponse = await fetch(pdfUrl);

    if (!pdfResponse.ok) {
      console.error(`❌ Failed to fetch invoice PDF: ${pdfResponse.status} ${pdfResponse.statusText}`);

      const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>Invoice Preview Error</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2>Invoice Preview Error</h2>
          <p>Invoice #${invoiceId} could not be loaded.</p>
          <p>Status: ${pdfResponse.status} ${pdfResponse.statusText}</p>
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html');
      return res.status(404).send(errorHtml);
    }

    // Set appropriate headers for inline viewing
    const contentType = pdfResponse.headers.get('content-type') || 'application/pdf';
    const contentLength = pdfResponse.headers.get('content-length');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'public, max-age=300');

    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Stream the PDF
    pdfResponse.body?.pipe(res);

  } catch (error) {
    console.error(`Error previewing invoice ${req.params.invoiceId}:`, error);

    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head><title>Invoice Preview Error</title></head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h2>Invoice Preview Error</h2>
        <p>Unable to load invoice #${req.params.invoiceId}.</p>
        <p>Please try again or download the invoice directly.</p>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.status(500).send(errorHtml);
  }
};

// Proxy affidavit PDF download
export const downloadJobAffidavit: RequestHandler = async (req, res) => {
  try {
    const { jobId, affidavitId } = req.params;
    console.log(`📥 Downloading affidavit ${affidavitId} for job ${jobId}...`);

    // Get fresh job data from ServeManager to find affidavit details
    const jobResponse = await makeServeManagerRequest(`/jobs/${jobId}`);
    const jobData = jobResponse.data || jobResponse;

    if (!jobData) {
      return res.status(404).json({ error: 'Job not found' });
    }

    let affidavitUrl = null;
    let affidavitTitle = 'affidavit';

    // Check documents array for affidavit
    if (jobData.documents && Array.isArray(jobData.documents)) {
      const affidavitDoc = jobData.documents.find((doc: any) =>
        doc.id === parseInt(affidavitId) &&
        (doc.upload_type === 'affidavit' || doc.type === 'affidavit' || doc.title?.toLowerCase().includes('affidavit'))
      );

      if (affidavitDoc) {
        affidavitUrl = affidavitDoc.upload?.links?.download_url || affidavitDoc.download_url;
        affidavitTitle = affidavitDoc.title || 'affidavit';
      }
    }

    // Check misc_attachments for affidavit documents
    if (!affidavitUrl && jobData.misc_attachments && Array.isArray(jobData.misc_attachments)) {
      const affidavitAttachment = jobData.misc_attachments.find((att: any) =>
        att.id === parseInt(affidavitId) &&
        (att.upload_type === 'affidavit' || att.type === 'affidavit') &&
        att.signed === true
      );

      if (affidavitAttachment) {
        affidavitUrl = affidavitAttachment.upload?.links?.download_url || affidavitAttachment.download_url;
        affidavitTitle = affidavitAttachment.title || 'affidavit';
      }
    }

    if (!affidavitUrl) {
      return res.status(404).json({ error: 'Affidavit PDF not found' });
    }

    console.log(`📥 Downloading affidavit from: ${affidavitUrl}`);

    // Fetch the PDF using authenticated request (same as makeServeManagerRequest)
    const { getServeManagerConfig } = await import('./servemanager');
    const config = await getServeManagerConfig();
    const credentials = Buffer.from(`${config.apiKey}:`).toString('base64');

    const pdfResponse = await fetch(affidavitUrl, {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    });
    if (!pdfResponse.ok) {
      throw new Error(`Failed to fetch affidavit PDF: ${pdfResponse.status}`);
    }

    // Set appropriate headers for download
    const contentType = pdfResponse.headers.get('content-type') || 'application/pdf';
    const contentLength = pdfResponse.headers.get('content-length');
    const filename = `${affidavitTitle.replace(/[^a-zA-Z0-9]/g, '_')}-${affidavitId}.pdf`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'public, max-age=300');

    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Stream the PDF
    pdfResponse.body?.pipe(res);

  } catch (error) {
    console.error(`Error downloading affidavit ${req.params.affidavitId}:`, error);
    res.status(500).json({ error: 'Failed to download affidavit' });
  }
};

// Proxy affidavit PDF preview
export const previewJobAffidavit: RequestHandler = async (req, res) => {
  try {
    const { jobId, affidavitId } = req.params;
    console.log(`👁️ Previewing affidavit ${affidavitId} for job ${jobId}...`);

    // Get fresh job data from ServeManager to find affidavit details
    const jobResponse = await makeServeManagerRequest(`/jobs/${jobId}`);
    const jobData = jobResponse.data || jobResponse;

    if (!jobData) {
      const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>Affidavit Preview Error</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2>Job Not Found</h2>
          <p>Job #${jobId} could not be found.</p>
        </body>
        </html>
      `;
      res.setHeader('Content-Type', 'text/html');
      return res.status(404).send(errorHtml);
    }

    console.log(`📜 Job affidavit data:`, {
      affidavitCount: jobData.affidavit_count,
      hasDocuments: !!jobData.documents,
      documentsCount: jobData.documents?.length || 0,
      hasMiscAttachments: !!jobData.misc_attachments,
      miscAttachmentsCount: jobData.misc_attachments?.length || 0
    });

    let affidavitUrl = null;
    let affidavitTitle = 'Affidavit of Service';

    // Check documents array for affidavit (ServeManager stores affidavits as documents)
    if (jobData.documents && Array.isArray(jobData.documents)) {
      const affidavitDoc = jobData.documents.find((doc: any) =>
        doc.id === parseInt(affidavitId) &&
        (doc.upload_type === 'affidavit' || doc.type === 'affidavit' || doc.title?.toLowerCase().includes('affidavit'))
      );

      if (affidavitDoc) {
        affidavitUrl = affidavitDoc.upload?.links?.download_url || affidavitDoc.download_url;
        affidavitTitle = affidavitDoc.title || 'Affidavit of Service';
        console.log(`📜 Found affidavit in documents:`, { id: affidavitDoc.id, title: affidavitDoc.title, hasUrl: !!affidavitUrl });
      }
    }

    // Check misc_attachments for affidavit documents
    if (!affidavitUrl && jobData.misc_attachments && Array.isArray(jobData.misc_attachments)) {
      const affidavitAttachment = jobData.misc_attachments.find((att: any) =>
        att.id === parseInt(affidavitId) &&
        (att.upload_type === 'affidavit' || att.type === 'affidavit') &&
        att.signed === true
      );

      if (affidavitAttachment) {
        affidavitUrl = affidavitAttachment.upload?.links?.download_url || affidavitAttachment.download_url;
        affidavitTitle = affidavitAttachment.title || 'Affidavit of Service';
        console.log(`📜 Found affidavit in misc_attachments:`, { id: affidavitAttachment.id, title: affidavitAttachment.title, hasUrl: !!affidavitUrl });
      }
    }

    if (!affidavitUrl) {
      const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>Affidavit Preview Error</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2>Affidavit Preview Not Available</h2>
          <p>Affidavit #${affidavitId} preview could not be loaded.</p>
          <p>This may be because the affidavit is not yet signed or PDF is not available.</p>
          <p>Affidavit count: ${jobData.affidavit_count || 0}</p>
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html');
      return res.status(404).send(errorHtml);
    }

    console.log(`👁️ Fetching affidavit PDF from: ${affidavitUrl}`);

    // Fetch the PDF using authenticated request (same as makeServeManagerRequest)
    const { getServeManagerConfig } = await import('./servemanager');
    const config = await getServeManagerConfig();
    const credentials = Buffer.from(`${config.apiKey}:`).toString('base64');

    const pdfResponse = await fetch(affidavitUrl, {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    });
    if (!pdfResponse.ok) {
      const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>Affidavit Preview Error</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2>Affidavit Preview Error</h2>
          <p>Unable to load affidavit #${affidavitId}.</p>
          <p>Status: ${pdfResponse.status} ${pdfResponse.statusText}</p>
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html');
      return res.status(404).send(errorHtml);
    }

    // Set appropriate headers for inline viewing
    const contentType = pdfResponse.headers.get('content-type') || 'application/pdf';
    const contentLength = pdfResponse.headers.get('content-length');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'public, max-age=300');

    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Stream the PDF
    pdfResponse.body?.pipe(res);

  } catch (error) {
    console.error(`Error previewing affidavit ${req.params.affidavitId}:`, error);

    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head><title>Affidavit Preview Error</title></head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h2>Affidavit Preview Error</h2>
        <p>Unable to load affidavit #${req.params.affidavitId}.</p>
        <p>Please try again or download the affidavit directly.</p>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.status(500).send(errorHtml);
  }
};
