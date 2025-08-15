import { RequestHandler } from 'express';

// Create Setup Intent for card collection without charging
export const createSetupIntent: RequestHandler = async (req, res) => {
  try {
    const { customer_id, job_id, metadata = {} } = req.body;

    console.log('💳 Creating Setup Intent for card collection:', {
      customer_id,
      job_id,
      metadata
    });

    // Get Stripe configuration
    const { getStripeConfig } = await import('./config');
    const stripeConfig = await getStripeConfig();

    if (!stripeConfig?.stripe_secret_key) {
      return res.status(400).json({
        error: 'Stripe not configured',
        message: 'Please configure Stripe in the API Config section'
      });
    }

    // Initialize Stripe
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeConfig.stripe_secret_key, {
      apiVersion: '2023-10-16'
    });

    // Create customer if needed
    let customerId = customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: {
          job_id: String(job_id),
          source: 'job_creation'
        }
      });
      customerId = customer.id;
      console.log('💳 Created Stripe customer:', customerId);
    }

    // Create Setup Intent for future payments
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session', // For future payments
      metadata: {
        job_id: String(job_id),
        purpose: 'affidavit_billing',
        ...metadata
      }
    });

    console.log('💳 Setup Intent created:', setupIntent.id);

    // TODO: Store setup intent in database linked to job
    // This would typically be stored in a job_payments table

    res.json({
      setup_intent: {
        id: setupIntent.id,
        client_secret: setupIntent.client_secret,
        status: setupIntent.status,
        customer_id: customerId
      },
      success: true
    });

  } catch (error) {
    console.error('❌ Setup Intent creation failed:', error);
    res.status(500).json({
      error: 'Setup Intent creation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Confirm Setup Intent after card input
export const confirmSetupIntent: RequestHandler = async (req, res) => {
  try {
    const { setup_intent_id, payment_method_id } = req.body;

    console.log('💳 Confirming Setup Intent:', {
      setup_intent_id,
      payment_method_id
    });

    const { getStripeConfig } = await import('./config');
    const stripeConfig = await getStripeConfig();

    if (!stripeConfig?.stripe_secret_key) {
      return res.status(400).json({
        error: 'Stripe not configured'
      });
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeConfig.stripe_secret_key, {
      apiVersion: '2023-10-16'
    });

    // Get the Setup Intent
    const setupIntent = await stripe.setupIntents.retrieve(setup_intent_id);

    console.log('💳 Setup Intent confirmed:', {
      id: setupIntent.id,
      status: setupIntent.status,
      payment_method: setupIntent.payment_method
    });

    // TODO: Update database with confirmed payment method
    // Store payment_method_id linked to job for future charging

    res.json({
      setup_intent: {
        id: setupIntent.id,
        status: setupIntent.status,
        payment_method_id: setupIntent.payment_method
      },
      success: true
    });

  } catch (error) {
    console.error('❌ Setup Intent confirmation failed:', error);
    res.status(500).json({
      error: 'Setup Intent confirmation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Process payment when affidavit is signed
export const processAffidavitPayment: RequestHandler = async (req, res) => {
  try {
    const { job_id, amount, description = 'Service completion payment' } = req.body;

    console.log('💳 Processing affidavit payment:', {
      job_id,
      amount,
      description
    });

    // TODO: Get stored payment method for this job from database
    // For now, we'll expect it to be passed in the request
    const { payment_method_id, customer_id } = req.body;

    if (!payment_method_id || !customer_id) {
      return res.status(400).json({
        error: 'Payment method not found',
        message: 'No payment method stored for this job. Please collect payment information first.'
      });
    }

    const { getStripeConfig } = await import('./config');
    const stripeConfig = await getStripeConfig();

    if (!stripeConfig?.stripe_secret_key) {
      return res.status(400).json({
        error: 'Stripe not configured'
      });
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeConfig.stripe_secret_key, {
      apiVersion: '2023-10-16'
    });

    // Create Payment Intent using stored payment method
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      customer: customer_id,
      payment_method: payment_method_id,
      confirmation_method: 'manual',
      confirm: true,
      off_session: true, // Indicates this is for a saved payment method
      metadata: {
        job_id: String(job_id),
        trigger: 'affidavit_signed',
        description
      }
    });

    console.log('💳 Payment processed:', {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount
    });

    // TODO: Update job status and create payment record in database

    res.json({
      payment_intent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency
      },
      success: true
    });

  } catch (error) {
    console.error('❌ Affidavit payment processing failed:', error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return res.status(400).json({
        error: 'Card payment failed',
        message: error.message,
        decline_code: error.decline_code
      });
    }

    res.status(500).json({
      error: 'Payment processing failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get payment history for a job
export const getJobPaymentHistory: RequestHandler = async (req, res) => {
  try {
    const { job_id } = req.params;

    console.log('💳 Getting payment history for job:', job_id);

    const { getStripeConfig } = await import('./config');
    const stripeConfig = await getStripeConfig();

    if (!stripeConfig?.stripe_secret_key) {
      return res.status(400).json({
        error: 'Stripe not configured'
      });
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeConfig.stripe_secret_key, {
      apiVersion: '2023-10-16'
    });

    // Search for payment intents related to this job
    const paymentIntents = await stripe.paymentIntents.list({
      limit: 100,
      expand: ['data.payment_method']
    });

    // Filter by job_id in metadata
    const jobPayments = paymentIntents.data.filter(
      pi => pi.metadata.job_id === String(job_id)
    );

    console.log(`💳 Found ${jobPayments.length} payments for job ${job_id}`);

    res.json({
      payments: jobPayments.map(pi => ({
        id: pi.id,
        amount: pi.amount / 100,
        currency: pi.currency,
        status: pi.status,
        created: pi.created,
        description: pi.metadata.description || 'Payment',
        payment_method: pi.payment_method ? {
          type: pi.payment_method.type,
          card: pi.payment_method.card ? {
            brand: pi.payment_method.card.brand,
            last4: pi.payment_method.card.last4,
            exp_month: pi.payment_method.card.exp_month,
            exp_year: pi.payment_method.card.exp_year
          } : null
        } : null
      })),
      success: true
    });

  } catch (error) {
    console.error('❌ Payment history retrieval failed:', error);
    res.status(500).json({
      error: 'Payment history retrieval failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Refund a payment (admin only)
export const refundPayment: RequestHandler = async (req, res) => {
  try {
    const { payment_intent_id, amount, reason = 'requested_by_customer' } = req.body;

    console.log('💳 Processing refund:', {
      payment_intent_id,
      amount,
      reason
    });

    const { getStripeConfig } = await import('./config');
    const stripeConfig = await getStripeConfig();

    if (!stripeConfig?.stripe_secret_key) {
      return res.status(400).json({
        error: 'Stripe not configured'
      });
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeConfig.stripe_secret_key, {
      apiVersion: '2023-10-16'
    });

    // Create refund
    const refund = await stripe.refunds.create({
      payment_intent: payment_intent_id,
      amount: amount ? Math.round(amount * 100) : undefined, // Partial refund if amount specified
      reason,
      metadata: {
        refunded_by: 'admin', // TODO: Get actual admin user
        refund_timestamp: new Date().toISOString()
      }
    });

    console.log('💳 Refund processed:', {
      id: refund.id,
      amount: refund.amount,
      status: refund.status
    });

    res.json({
      refund: {
        id: refund.id,
        amount: refund.amount / 100,
        currency: refund.currency,
        status: refund.status,
        reason: refund.reason
      },
      success: true
    });

  } catch (error) {
    console.error('❌ Refund processing failed:', error);
    res.status(500).json({
      error: 'Refund processing failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
