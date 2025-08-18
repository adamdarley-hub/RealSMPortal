import { RequestHandler } from "express";

// Stripe configuration helper
async function getStripeConfig() {
  try {
    const { loadConfig } = await import('./config');
    const config = await loadConfig();
    
    if (!config.stripe || !config.stripe.enabled) {
      throw new Error('Stripe is not enabled in configuration');
    }
    
    if (!config.stripe.secretKey) {
      throw new Error('Stripe secret key not configured');
    }
    
    return config.stripe;
  } catch (error) {
    console.error('Error loading Stripe configuration:', error);
    throw error;
  }
}

// Initialize Stripe instance
async function getStripeInstance() {
  const config = await getStripeConfig();
  const { default: Stripe } = await import('stripe');
  
  return new Stripe(config.secretKey, {
    apiVersion: '2023-10-16',
  });
}

// Create payment intent for invoice payment
export const createPaymentIntent: RequestHandler = async (req, res) => {
  try {
    const { invoiceId, amount, currency = 'usd' } = req.body;
    
    if (!invoiceId || !amount) {
      return res.status(400).json({
        error: 'Missing required fields: invoiceId and amount'
      });
    }
    
    // Validate amount is positive
    if (amount <= 0) {
      return res.status(400).json({
        error: 'Amount must be greater than 0'
      });
    }
    
    const stripe = await getStripeInstance();
    
    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata: {
        invoiceId: invoiceId.toString(),
        source: 'client-portal'
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });
    
    console.log(`💳 Created payment intent for invoice ${invoiceId}: ${paymentIntent.id}`);
    
    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    });
    
  } catch (error) {
    console.error('Error creating payment intent:', error);
    
    if (error instanceof Error) {
      // Handle Stripe-specific errors
      const stripeError = error as any;
      if (stripeError.type) {
        return res.status(400).json({
          error: stripeError.message,
          type: stripeError.type
        });
      }
    }
    
    res.status(500).json({
      error: 'Failed to create payment intent'
    });
  }
};

// Confirm payment and update invoice status
export const confirmPayment: RequestHandler = async (req, res) => {
  try {
    const { paymentIntentId, invoiceId } = req.body;
    
    if (!paymentIntentId || !invoiceId) {
      return res.status(400).json({
        error: 'Missing required fields: paymentIntentId and invoiceId'
      });
    }
    
    const stripe = await getStripeInstance();
    
    // Retrieve payment intent to verify status
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        error: 'Payment has not succeeded',
        status: paymentIntent.status
      });
    }
    
    // Verify the payment matches the invoice
    if (paymentIntent.metadata.invoiceId !== invoiceId.toString()) {
      return res.status(400).json({
        error: 'Payment intent does not match invoice'
      });
    }
    
    console.log(`✅ Payment confirmed for invoice ${invoiceId}: ${paymentIntentId}`);
    
    // TODO: Update invoice status in ServeManager (would need ServeManager API endpoint)
    // For now, we'll just confirm the payment was successful
    
    res.json({
      success: true,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100, // Convert back to dollars
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      invoiceId: invoiceId
    });
    
  } catch (error) {
    console.error('Error confirming payment:', error);
    
    if (error instanceof Error) {
      const stripeError = error as any;
      if (stripeError.type) {
        return res.status(400).json({
          error: stripeError.message,
          type: stripeError.type
        });
      }
    }
    
    res.status(500).json({
      error: 'Failed to confirm payment'
    });
  }
};

// Update invoice status in ServeManager
async function updateInvoiceStatusInServeManager(invoiceId: string, status: 'paid' | 'failed'): Promise<void> {
  try {
    const { makeServeManagerRequest } = await import('./servemanager');

    console.log(`📝 Updating invoice ${invoiceId} status to "${status}" in ServeManager...`);

    // Update invoice status in ServeManager
    const updateData = {
      status: status === 'paid' ? 'paid' : 'issued' // ServeManager may use different status values
    };

    await makeServeManagerRequest(`/invoices/${invoiceId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });

    console.log(`✅ Successfully updated invoice ${invoiceId} status to "${status}" in ServeManager`);

  } catch (error) {
    console.error(`❌ Failed to update invoice ${invoiceId} status in ServeManager:`, error);
    // Don't throw error - we don't want to fail the webhook if this update fails
  }
}

// Handle Stripe webhooks for payment events
export const handleWebhook: RequestHandler = async (req, res) => {
  try {
    const config = await getStripeConfig();
    
    if (!config.webhookSecret) {
      console.warn('⚠️ Stripe webhook secret not configured, skipping signature verification');
    }
    
    const stripe = await getStripeInstance();
    const sig = req.headers['stripe-signature'] as string;
    
    let event;
    
    if (config.webhookSecret && sig) {
      try {
        // Verify webhook signature
        event = stripe.webhooks.constructEvent(req.body, sig, config.webhookSecret);
      } catch (err) {
        console.error('⚠️ Webhook signature verification failed:', err);
        return res.status(400).send(`Webhook Error: ${err}`);
      }
    } else {
      // For development without webhook secret
      event = req.body;
    }
    
    console.log(`🔔 Received Stripe webhook: ${event.type}`);
    
    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log(`💰 Payment succeeded: ${paymentIntent.id} for invoice ${paymentIntent.metadata.invoiceId}`);

        // Update invoice status in ServeManager
        if (paymentIntent.metadata.invoiceId) {
          await updateInvoiceStatusInServeManager(paymentIntent.metadata.invoiceId, 'paid');
        }

        // TODO: Send payment confirmation email
        break;
        
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        console.log(`❌ Payment failed: ${failedPayment.id} for invoice ${failedPayment.metadata.invoiceId}`);
        
        // TODO: Handle failed payment (notify user, etc.)
        break;
        
      default:
        console.log(`📋 Unhandled event type: ${event.type}`);
    }
    
    res.json({ received: true });
    
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({
      error: 'Webhook handler failed'
    });
  }
};

// Get Stripe publishable key for frontend
export const getPublishableKey: RequestHandler = async (req, res) => {
  try {
    const config = await getStripeConfig();
    
    if (!config.publishableKey) {
      return res.status(400).json({
        error: 'Stripe publishable key not configured'
      });
    }
    
    res.json({
      publishableKey: config.publishableKey,
      environment: config.environment
    });
    
  } catch (error) {
    console.error('Error getting publishable key:', error);
    res.status(500).json({
      error: 'Failed to get Stripe configuration'
    });
  }
};

// Get payment status for an invoice
export const getPaymentStatus: RequestHandler = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    if (!invoiceId) {
      return res.status(400).json({
        error: 'Invoice ID is required'
      });
    }
    
    const stripe = await getStripeInstance();
    
    // Search for payment intents related to this invoice
    const paymentIntents = await stripe.paymentIntents.list({
      limit: 10,
    });
    
    const relatedPayments = paymentIntents.data.filter(
      pi => pi.metadata.invoiceId === invoiceId.toString()
    );
    
    const payments = relatedPayments.map(pi => ({
      id: pi.id,
      amount: pi.amount / 100,
      currency: pi.currency,
      status: pi.status,
      created: pi.created,
      description: pi.description
    }));
    
    res.json({
      invoiceId,
      payments,
      totalPaid: payments
        .filter(p => p.status === 'succeeded')
        .reduce((sum, p) => sum + p.amount, 0)
    });
    
  } catch (error) {
    console.error('Error getting payment status:', error);
    res.status(500).json({
      error: 'Failed to get payment status'
    });
  }
};
