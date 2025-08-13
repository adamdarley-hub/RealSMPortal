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
      hasAffidavit: !!jobData.affidavit,
      affidavitCount: jobData.affidavit_count,
      affidavitData: jobData.affidavit
    });

    const jobAffidavits: any[] = [];

    // Check if job has affidavit data and if it's signed
    if (jobData.affidavit && jobData.affidavit_count > 0) {
      // ServeManager stores affidavit data directly in the job
      const affidavit = {
        id: jobData.affidavit.id || `aff_${jobId}`,
        job_id: jobId,
        signed_at: jobData.affidavit.signed_at,
        created_at: jobData.affidavit.created_at,
        status: jobData.affidavit.signed ? 'signed' : 'unsigned',
        signer: jobData.affidavit.signer || jobData.employee_process_server?.first_name + ' ' + jobData.employee_process_server?.last_name,
        pdf_url: jobData.affidavit.pdf_url || jobData.affidavit.download_url,
        notarized: jobData.affidavit.notarized,
        notary_signature: jobData.affidavit.notary_signature
      };

      // Only include signed affidavits
      if (affidavit.status === 'signed') {
        jobAffidavits.push(affidavit);
      }
    }

    // Alternative: Check if there are affidavit attachments
    if (jobData.misc_attachments && Array.isArray(jobData.misc_attachments)) {
      const affidavitAttachments = jobData.misc_attachments.filter((attachment: any) =>
        attachment.upload_type === 'affidavit' && attachment.signed === true
      );

      affidavitAttachments.forEach((attachment: any) => {
        const affidavit = {
          id: attachment.id,
          job_id: jobId,
          signed_at: attachment.updated_at,
          created_at: attachment.created_at,
          status: 'signed',
          signer: 'Process Server',
          pdf_url: attachment.upload?.links?.download_url || attachment.download_url,
          title: attachment.title || 'Affidavit of Service'
        };

        jobAffidavits.push(affidavit);
      });
    }

    console.log(`📜 Found ${jobAffidavits.length} signed affidavits for job ${jobId}`);

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

    // Use the ServeManager download URL directly
    const pdfUrl = `https://www.servemanager.com/api/v2/invoices/${invoiceId}/download`;

    console.log(`📥 Attempting to download invoice PDF from: ${pdfUrl}`);

    // Try to fetch the PDF directly
    const response = await fetch(pdfUrl);

    if (!response.ok) {
      console.error(`❌ Failed to download invoice PDF: ${response.status} ${response.statusText}`);
      return res.status(404).json({
        error: `Invoice PDF not available (${response.status} ${response.statusText})`
      });
    }

    // Set appropriate headers for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoiceId}.pdf"`);
    res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes

    // Stream the PDF
    response.body?.pipe(res);

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

    // Use the ServeManager download URL directly
    const pdfUrl = `https://www.servemanager.com/api/v2/invoices/${invoiceId}/download`;

    console.log(`📄 Attempting to fetch invoice PDF from: ${pdfUrl}`);

    // Try to fetch the PDF directly
    const response = await fetch(pdfUrl);

    if (!response.ok) {
      console.error(`❌ Failed to fetch invoice PDF: ${response.status} ${response.statusText}`);

      // Return a simple HTML error page instead of JSON for iframe display
      const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>Invoice Preview Error</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2>Invoice Preview Not Available</h2>
          <p>Invoice #${invoiceId} preview could not be loaded.</p>
          <p>Status: ${response.status} ${response.statusText}</p>
          <p>This may be because the invoice PDF is not yet generated or access is restricted.</p>
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html');
      return res.status(404).send(errorHtml);
    }

    // Set appropriate headers for inline viewing
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes

    // Stream the PDF
    response.body?.pipe(res);

  } catch (error) {
    console.error(`Error previewing invoice ${req.params.invoiceId}:`, error);

    // Return HTML error for iframe display
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

    // Mock response for now - in real implementation, would fetch from ServeManager
    res.status(404).json({ error: 'Affidavit download not implemented yet' });

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

    // Mock response for now - in real implementation, would fetch from ServeManager
    res.status(404).json({ error: 'Affidavit preview not implemented yet' });

  } catch (error) {
    console.error(`Error previewing affidavit ${req.params.affidavitId}:`, error);
    res.status(500).json({ error: 'Failed to preview affidavit' });
  }
};
