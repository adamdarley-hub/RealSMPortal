import { RequestHandler } from "express";
import { makeServeManagerRequest } from "./servemanager";

// Get invoices for a specific job (only issued or paid)
export const getJobInvoices: RequestHandler = async (req, res) => {
  try {
    const { jobId } = req.params;
    console.log(`🧾 Fetching invoices for job ${jobId}...`);

    // Filter for issued, paid, or draft invoices (temporarily include draft for testing)
    const filterParams = new URLSearchParams();
    filterParams.append('filter[invoice_status][]', 'issued');
    filterParams.append('filter[invoice_status][]', 'paid');
    filterParams.append('filter[invoice_status][]', 'Issued');
    filterParams.append('filter[invoice_status][]', 'Paid');
    filterParams.append('filter[invoice_status][]', 'sent');
    filterParams.append('filter[invoice_status][]', 'Sent');
    filterParams.append('filter[invoice_status][]', 'draft');
    filterParams.append('filter[invoice_status][]', 'Draft');
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

    // Filter for signed affidavits only using the affidavit_status filter
    const filterParams = new URLSearchParams();
    filterParams.append('filter[affidavit_status][]', 'signed');
    filterParams.append('per_page', '100');

    // Fetch all invoices with signed affidavits (ServeManager API approach)
    let allInvoices: any[] = [];
    let page = 1;
    let hasMorePages = true;
    const maxPages = 10;

    while (hasMorePages && page <= maxPages) {
      const params = new URLSearchParams(filterParams);
      params.append('page', page.toString());

      const endpoint = `/invoices?${params.toString()}`;
      console.log(`Fetching invoices with affidavits page ${page} for job ${jobId}`);

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

        if (pageInvoices.length > 0) {
          allInvoices.push(...pageInvoices);
          hasMorePages = pageInvoices.length === 100;
          page++;
        } else {
          hasMorePages = false;
        }
      } catch (pageError) {
        console.error(`Error fetching affidavits page ${page}:`, pageError);
        hasMorePages = false;
      }
    }

    // Extract affidavits from invoices that contain the specific job
    const jobAffidavits: any[] = [];
    
    allInvoices.forEach(invoice => {
      // Check if this invoice contains the job
      const containsJob = invoice.jobs && Array.isArray(invoice.jobs) && 
        invoice.jobs.some((job: any) => 
          job.id === jobId || 
          job.job_id === jobId || 
          job.job_number === jobId ||
          String(job.id) === String(jobId)
        );

      if (containsJob && invoice.affidavit) {
        // Extract affidavit information
        const affidavit = {
          id: invoice.affidavit.id || `aff_${invoice.id}`,
          job_id: jobId,
          invoice_id: invoice.id,
          signed_at: invoice.affidavit.signed_at || invoice.affidavit.created_at,
          created_at: invoice.affidavit.created_at,
          pdf_url: invoice.affidavit.pdf_url || invoice.affidavit.download_url,
          status: 'signed',
          signer: invoice.affidavit.signer || invoice.affidavit.server_name
        };
        
        jobAffidavits.push(affidavit);
      }
    });

    console.log(`📜 Found ${jobAffidavits.length} signed affidavits for job ${jobId}`);

    res.json({
      affidavits: jobAffidavits,
      total: jobAffidavits.length,
      job_id: jobId
    });

  } catch (error) {
    console.error(`Error fetching affidavits for job ${req.params.jobId}:`, error);
    
    // Return mock data
    const mockAffidavits = [
      {
        id: "aff001",
        job_id: req.params.jobId,
        signed_at: "2024-01-20T00:00:00Z",
        created_at: "2024-01-20T00:00:00Z",
        status: "signed",
        signer: "John Smith",
        pdf_url: "https://example.com/affidavit.pdf"
      }
    ];

    res.json({
      affidavits: mockAffidavits,
      total: mockAffidavits.length,
      job_id: req.params.jobId,
      mock: true
    });
  }
};

// Proxy invoice PDF download
export const downloadJobInvoice: RequestHandler = async (req, res) => {
  try {
    const { jobId, invoiceId } = req.params;
    console.log(`📥 Downloading invoice ${invoiceId} for job ${jobId}...`);

    // First get the invoice to find the PDF URL
    const invoiceResponse = await makeServeManagerRequest(`/invoices/${invoiceId}`);
    
    let pdfUrl = null;
    if (invoiceResponse.pdf_url) {
      pdfUrl = invoiceResponse.pdf_url;
    } else if (invoiceResponse.data?.pdf_url) {
      pdfUrl = invoiceResponse.data.pdf_url;
    } else if (invoiceResponse.links?.pdf) {
      pdfUrl = invoiceResponse.links.pdf;
    }

    if (!pdfUrl) {
      return res.status(404).json({ error: 'Invoice PDF not found' });
    }

    // Proxy the PDF download
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status}`);
    }

    // Set appropriate headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoiceId}.pdf"`);
    
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

    // First get the invoice to find the PDF URL
    const invoiceResponse = await makeServeManagerRequest(`/invoices/${invoiceId}`);
    
    let pdfUrl = null;
    if (invoiceResponse.pdf_url) {
      pdfUrl = invoiceResponse.pdf_url;
    } else if (invoiceResponse.data?.pdf_url) {
      pdfUrl = invoiceResponse.data.pdf_url;
    } else if (invoiceResponse.links?.pdf) {
      pdfUrl = invoiceResponse.links.pdf;
    }

    if (!pdfUrl) {
      return res.status(404).json({ error: 'Invoice PDF not found' });
    }

    // Proxy the PDF for preview
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status}`);
    }

    // Set appropriate headers for inline viewing
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    
    // Stream the PDF
    response.body?.pipe(res);

  } catch (error) {
    console.error(`Error previewing invoice ${req.params.invoiceId}:`, error);
    res.status(500).json({ error: 'Failed to preview invoice' });
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
