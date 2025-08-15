import React, { useState, useEffect } from 'react';
import {
  Elements,
  CardElement,
  useElements,
  useStripe as useStripeElements,
} from '@stripe/react-stripe-js';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, Shield, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useStripe } from "@/contexts/StripeContext";

interface StripeCheckoutProps {
  amount: number;
  currency?: string;
  invoiceId: string;
  invoiceNumber?: string;
  onSuccess?: (paymentResult: PaymentResult) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

interface PaymentResult {
  paymentIntentId: string;
  amount: number;
  currency: string;
  status: string;
  invoiceId: string;
}

// Card element styling
const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
      fontFamily: 'system-ui, -apple-system, sans-serif',
    },
    invalid: {
      color: '#9e2146',
    },
  },
};

// Internal payment form component
const PaymentForm: React.FC<StripeCheckoutProps> = ({
  amount,
  currency = 'usd',
  invoiceId,
  invoiceNumber,
  onSuccess,
  onError,
  onCancel,
}) => {
  const stripe = useStripeElements();
  const elements = useElements();
  const { toast } = useToast();

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);

  // Create payment intent when component mounts
  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        const response = await fetch('/api/stripe/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount,
            currency,
            invoiceId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create payment intent');
        }

        const { clientSecret } = await response.json();
        setPaymentIntent(clientSecret);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize payment';
        setError(errorMessage);
        onError?.(errorMessage);
      }
    };

    createPaymentIntent();
  }, [amount, currency, invoiceId, onError]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !paymentIntent) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      setError('Card element not found');
      setIsProcessing(false);
      return;
    }

    try {
      // Confirm payment with Stripe
      const { error: stripeError, paymentIntent: confirmedPayment } = await stripe.confirmCardPayment(
        paymentIntent,
        {
          payment_method: {
            card: cardElement,
          },
        }
      );

      if (stripeError) {
        throw new Error(stripeError.message || 'Payment failed');
      }

      if (confirmedPayment?.status === 'succeeded') {
        // Confirm payment with our backend
        const confirmResponse = await fetch('/api/stripe/confirm-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentIntentId: confirmedPayment.id,
            invoiceId,
          }),
        });

        if (!confirmResponse.ok) {
          const errorData = await confirmResponse.json();
          throw new Error(errorData.error || 'Failed to confirm payment');
        }

        const confirmResult = await confirmResponse.json();

        toast({
          title: "Payment Successful",
          description: `Payment of $${amount.toFixed(2)} has been processed successfully.`,
        });

        const paymentResult: PaymentResult = {
          paymentIntentId: confirmedPayment.id,
          amount: confirmResult.amount,
          currency: confirmResult.currency,
          status: confirmedPayment.status,
          invoiceId,
        };

        onSuccess?.(paymentResult);
      } else {
        throw new Error('Payment was not successful');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment processing failed';
      setError(errorMessage);
      onError?.(errorMessage);
      
      toast({
        title: "Payment Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (error && !paymentIntent) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Payment Details
        </CardTitle>
        <CardDescription>
          {invoiceNumber ? `Pay Invoice #${invoiceNumber}` : `Pay Invoice ${invoiceId}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payment amount */}
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <span className="font-medium">Amount to Pay:</span>
          <span className="text-lg font-bold">
            ${amount.toFixed(2)} {currency.toUpperCase()}
          </span>
        </div>

        {/* Payment form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Card input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Card Information</label>
            <div className="p-3 border rounded-lg bg-white">
              <CardElement
                options={cardElementOptions}
                onChange={(event) => {
                  setCardComplete(event.complete);
                  if (event.error) {
                    setError(event.error.message);
                  } else {
                    setError(null);
                  }
                }}
              />
            </div>
          </div>

          {/* Error display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Security notice */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span>Secured by Stripe. Your payment information is encrypted.</span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isProcessing}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={!stripe || !cardComplete || isProcessing || !paymentIntent}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pay ${amount.toFixed(2)}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

// Main StripeCheckout component with Elements wrapper
const StripeCheckout: React.FC<StripeCheckoutProps> = (props) => {
  const { stripe, isLoading, error } = useStripe();

  if (isLoading) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Initializing payment system...</span>
        </CardContent>
      </Card>
    );
  }

  if (error || !stripe) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error || 'Payment system unavailable. Please try again later.'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Elements stripe={stripe}>
      <PaymentForm {...props} />
    </Elements>
  );
};

export default StripeCheckout;
