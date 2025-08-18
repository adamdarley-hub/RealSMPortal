/**
 * Clean ServeManager payment integration using proper JSON:API format
 * Based on ServeManager API documentation: https://www.servemanager.com/api#endpoints-invoices
 */

export async function updateInvoiceStatusInServeManager(invoiceId: number, status: string, paymentAmount?: number) {
  console.log(`📝 Starting ServeManager integration for invoice ${invoiceId} with status "${status}"...`);
  
  if (status !== 'paid') {
    throw new Error('Only "paid" status updates are supported');
  }

  const { makeServeManagerRequest } = await import('./servemanager');

  try {
    // Use default test amount if not provided
    const amount = paymentAmount || 0.50;
    
    console.log(`📝 Step 1: Creating payment record for invoice ${invoiceId} with amount: $${amount}`);

    // Step 1: Create payment record using proper JSON:API format
    const paymentData = {
      data: {
        type: "payments",
        attributes: {
          amount: amount,
          applied_on: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
          description: "Payment processed via Stripe integration"
        },
        relationships: {
          invoice: {
            data: {
              type: "invoices", 
              id: invoiceId.toString()
            }
          }
        }
      }
    };

    console.log(`📝 Payment payload:`, JSON.stringify(paymentData, null, 2));

    // Create payment using ServeManager API
    const paymentResponse = await makeServeManagerRequest(`/invoices/${invoiceId}/payments`, {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });

    console.log(`✅ Payment record created successfully`);
    console.log(`📝 Payment API response:`, JSON.stringify(paymentResponse, null, 2));

    // Step 2: Update invoice status to "paid" using proper API endpoint
    console.log(`📝 Step 2: Updating invoice ${invoiceId} status to "paid"...`);

    const invoiceUpdateData = {
      data: {
        type: "invoices",
        id: invoiceId.toString(),
        attributes: {
          status: "paid"
        }
      }
    };

    console.log(`📝 Invoice update payload:`, JSON.stringify(invoiceUpdateData, null, 2));

    const statusResponse = await makeServeManagerRequest(`/invoices/${invoiceId}`, {
      method: 'PATCH',
      body: JSON.stringify(invoiceUpdateData),
    });

    console.log(`✅ Invoice status updated successfully to "paid"`);
    console.log(`📝 Status API response:`, JSON.stringify(statusResponse, null, 2));

    return {
      success: true,
      paymentCreated: true,
      statusUpdated: true,
      paymentResponse,
      statusResponse
    };

  } catch (error) {
    console.error(`❌ ServeManager integration failed for invoice ${invoiceId}:`, error);
    
    // Log detailed error information
    if (error instanceof Error) {
      console.error(`❌ Error message:`, error.message);
      console.error(`❌ Error stack:`, error.stack);
    }
    
    throw error;
  }
}
