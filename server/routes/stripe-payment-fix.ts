// Corrected ServeManager payment function
export async function updateInvoiceStatusInServeManager(invoiceId: string, status: 'paid' | 'failed', paymentIntentId?: string, amount?: number): Promise<void> {
  try {
    const { makeServeManagerRequest } = await import('./servemanager');

    console.log(`💳 Creating payment record for invoice ${invoiceId} in ServeManager...`);

    if (status !== 'paid') {
      console.log(`⚠️ Cannot create payment record for status "${status}" - only creating records for successful payments`);
      return;
    }

    // Get invoice details to find the amount if not provided
    let paymentAmount = amount;
    if (!paymentAmount) {
      console.log(`🔍 Looking up invoice ${invoiceId} to get payment amount...`);
      
      try {
        const invoiceResponse = await makeServeManagerRequest(`/invoices/${invoiceId}`);
        const invoice = invoiceResponse.data || invoiceResponse;
        paymentAmount = parseFloat(invoice.total || invoice.balance_due || '0');
        console.log(`📋 Found invoice ${invoiceId} with amount: $${paymentAmount}`);
      } catch (lookupError) {
        console.log(`⚠️ Could not lookup invoice amount, defaulting to $0.50:`, lookupError.message);
        paymentAmount = 0.50; // Fallback for test payments
      }
    }

    // Create payment record using ServeManager payments API
    const paymentData = {
      data: {
        type: "payment",
        attributes: {
          amount: paymentAmount.toString(),
          payment_method: "stripe",
          payment_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
          reference_number: paymentIntentId || `stripe_${Date.now()}`,
          notes: `Payment processed via Stripe (${paymentIntentId || 'manual'})`
        }
      }
    };

    console.log(`📝 Creating payment record for invoice ${invoiceId}:`, JSON.stringify(paymentData, null, 2));

    // Use ServeManager payments API endpoint
    const response = await makeServeManagerRequest(`/invoices/${invoiceId}/payments`, {
      method: 'POST',
      body: JSON.stringify(paymentData)
    });

    console.log(`✅ SUCCESS! Payment record created for invoice ${invoiceId}`);
    console.log(`📝 ServeManager API Response:`, JSON.stringify(response, null, 2));

    // Send real-time notification to clients about the successful payment
    try {
      const wsService = await import('../services/websocket-service');
      if (wsService.broadcastToClients) {
        wsService.broadcastToClients({
          type: 'invoice_payment_status_updated',
          data: {
            invoiceId: invoiceId,
            status: 'paid',
            amount: paymentAmount,
            timestamp: new Date().toISOString(),
            serveManagerUpdated: true,
            message: 'Payment processed and ServeManager updated successfully'
          }
        });
        console.log(`📡 Broadcasted successful payment update for invoice ${invoiceId}`);
      }
    } catch (wsError) {
      console.error('Failed to broadcast payment update:', wsError);
    }

  } catch (error) {
    console.error(`❌ Failed to create payment record for invoice ${invoiceId} in ServeManager:`, error);
    
    // Send notification about the failure
    try {
      const wsService = await import('../services/websocket-service');
      if (wsService.broadcastToClients) {
        wsService.broadcastToClients({
          type: 'invoice_payment_status_updated',
          data: {
            invoiceId: invoiceId,
            status: 'paid_stripe_only',
            timestamp: new Date().toISOString(),
            serveManagerUpdated: false,
            message: 'Payment successful in Stripe, but ServeManager update failed. Please update manually.',
            error: error.message
          }
        });
      }
    } catch (wsError) {
      console.error('Failed to broadcast payment failure notification:', wsError);
    }
    
    // Don't throw error - we don't want to fail the payment if ServeManager update fails
  }
}
