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

// Create or get existing Stripe customer
async function getOrCreateStripeCustomer(userInfo: { email: string; name: string; clientId?: string }) {
  const stripe = await getStripeInstance();
  
  // Search for existing customer by email
  const existingCustomers = await stripe.customers.list({
    email: userInfo.email,
    limit: 1
  });
  
  if (existingCustomers.data.length > 0) {
    console.log(`💳 Found existing Stripe customer: ${existingCustomers.data[0].id}`);
    return existingCustomers.data[0];
  }
  
  // Create new customer
  const customer = await stripe.customers.create({
    email: userInfo.email,
    name: userInfo.name,
    metadata: {
      client_id: userInfo.clientId || '',
      source: 'client-portal'
    }
  });
  
  console.log(`💳 Created new Stripe customer: ${customer.id}`);
  return customer;
}

// Create payment intent for invoice payment
export const createPaymentIntent: RequestHandler = async (req, res) => {
  try {
    const { invoiceId, amount, currency = 'usd', userInfo, useExistingPaymentMethod, paymentMethodId } = req.body;

    console.log('💳 Payment intent request body:', {
      invoiceId,
      amount,
      currency,
      useExistingPaymentMethod,
      paymentMethodId,
      userInfo: userInfo ? { email: userInfo.email, name: userInfo.name } : null
    });

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
    let customerId: string | undefined;
    
    // Get or create customer if user info is provided
    if (userInfo && userInfo.email) {
      const customer = await getOrCreateStripeCustomer(userInfo);
      customerId = customer.id;
    }
    
    let paymentIntentData: any;

    // Use existing payment method if specified
    if (useExistingPaymentMethod && paymentMethodId && customerId) {
      console.log(`💳 Using existing payment method ${paymentMethodId} for customer ${customerId}`);

      // For existing payment methods, create payment intent with manual confirmation
      paymentIntentData = {
        amount: Math.round(amount * 100),
        currency: currency.toLowerCase(),
        customer: customerId,
        payment_method: paymentMethodId,
        confirmation_method: 'manual',
        confirm: true,
        return_url: `${req.headers.origin || 'https://localhost:5173'}/client/invoices?payment=success`,
        metadata: {
          invoiceId: invoiceId.toString(),
          source: 'client-portal'
        }
      };
    } else {
      console.log(`💳 Creating payment intent for new payment method`);

      // For new payment methods, create payment intent with automatic payment methods
      paymentIntentData = {
        amount: Math.round(amount * 100),
        currency: currency.toLowerCase(),
        metadata: {
          invoiceId: invoiceId.toString(),
          source: 'client-portal'
        },
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never'
        }
      };

      // Add customer if available
      if (customerId) {
        paymentIntentData.customer = customerId;
      }
    }
    
    console.log('💳 Final payment intent data:', JSON.stringify(paymentIntentData, null, 2));

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);
    
    console.log(`💳 Created payment intent for invoice ${invoiceId}: ${paymentIntent.id}`);
    
    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      customerId,
      requiresAction: paymentIntent.status === 'requires_action'
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

// Create setup intent for saving payment methods
export const createSetupIntent: RequestHandler = async (req, res) => {
  try {
    const { userInfo } = req.body;

    if (!userInfo || !userInfo.email) {
      return res.status(400).json({
        error: 'User information is required to save payment methods'
      });
    }

    let stripe;
    try {
      stripe = await getStripeInstance();
    } catch (configError) {
      console.error('Stripe configuration error:', configError);
      return res.status(503).json({
        error: 'Stripe is not configured. Please configure Stripe in the admin settings.',
        code: 'STRIPE_NOT_CONFIGURED'
      });
    }
    
    // Get or create customer
    const customer = await getOrCreateStripeCustomer(userInfo);
    
    // Create setup intent
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ['card'],
      usage: 'off_session',
      metadata: {
        source: 'client-portal'
      }
    });
    
    console.log(`💳 Created setup intent for customer ${customer.id}: ${setupIntent.id}`);
    
    res.json({
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
      customerId: customer.id
    });
    
  } catch (error) {
    console.error('Error creating setup intent:', error);
    
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
      error: 'Failed to create setup intent'
    });
  }
};

// Get customer's saved payment methods
export const getCustomerPaymentMethods: RequestHandler = async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!customerId) {
      return res.status(400).json({
        error: 'Customer ID is required'
      });
    }

    let stripe;
    try {
      stripe = await getStripeInstance();
    } catch (configError) {
      console.error('Stripe configuration error:', configError);
      return res.status(503).json({
        error: 'Stripe is not configured. Please configure Stripe in the admin settings.',
        code: 'STRIPE_NOT_CONFIGURED'
      });
    }
    
    // Get customer's payment methods
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
    
    const formattedPaymentMethods = paymentMethods.data.map(pm => ({
      id: pm.id,
      card: {
        brand: pm.card?.brand || 'unknown',
        last4: pm.card?.last4 || '0000',
        exp_month: pm.card?.exp_month || 12,
        exp_year: pm.card?.exp_year || 2024
      },
      created: pm.created,
      // Use metadata for friendly name, fallback to brand + last4
      friendlyName: pm.metadata?.friendly_name || `${(pm.card?.brand || 'Card').charAt(0).toUpperCase() + (pm.card?.brand || 'Card').slice(1)} ending in ${pm.card?.last4 || '0000'}`
    }));
    
    res.json({
      paymentMethods: formattedPaymentMethods
    });
    
  } catch (error) {
    console.error('Error getting customer payment methods:', error);
    res.status(500).json({
      error: 'Failed to get payment methods'
    });
  }
};

// Delete a saved payment method
export const deletePaymentMethod: RequestHandler = async (req, res) => {
  try {
    const { paymentMethodId } = req.params;
    
    if (!paymentMethodId) {
      return res.status(400).json({
        error: 'Payment method ID is required'
      });
    }
    
    const stripe = await getStripeInstance();
    
    // Detach payment method from customer
    await stripe.paymentMethods.detach(paymentMethodId);
    
    console.log(`💳 Deleted payment method: ${paymentMethodId}`);
    
    res.json({
      success: true,
      message: 'Payment method deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting payment method:', error);
    res.status(500).json({
      error: 'Failed to delete payment method'
    });
  }
};

// Get customer by email
export const getCustomerByEmail: RequestHandler = async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        error: 'Email is required'
      });
    }

    let stripe;
    try {
      stripe = await getStripeInstance();
    } catch (configError) {
      console.error('Stripe configuration error:', configError);
      return res.status(503).json({
        error: 'Stripe is not configured. Please configure Stripe in the admin settings.',
        code: 'STRIPE_NOT_CONFIGURED'
      });
    }
    
    // Search for customer by email
    const customers = await stripe.customers.list({
      email: email,
      limit: 1
    });
    
    if (customers.data.length === 0) {
      return res.json({
        customer: null
      });
    }
    
    const customer = customers.data[0];
    
    res.json({
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        created: customer.created
      }
    });
    
  } catch (error) {
    console.error('Error getting customer by email:', error);
    res.status(500).json({
      error: 'Failed to get customer'
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

    // Update invoice status in ServeManager
    await updateInvoiceStatusInServeManager(invoiceId.toString(), 'paid');
    
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

        // Keep invoice status as "issued" for failed payments
        if (failedPayment.metadata.invoiceId) {
          console.log(`📝 Payment failed for invoice ${failedPayment.metadata.invoiceId}, keeping status as "issued"`);
        }

        // TODO: Send payment failure notification email
        break;

      case 'setup_intent.succeeded':
        const setupIntent = event.data.object;
        console.log(`💳 Setup intent succeeded: ${setupIntent.id} for customer ${setupIntent.customer}`);
        // Payment method has been successfully saved
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
