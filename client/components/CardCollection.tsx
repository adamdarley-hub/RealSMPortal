import React, { useState } from 'react';
import { Elements, CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, CheckCircle, AlertCircle, Clock, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#9e2146',
    },
  },
};

interface CardCollectionFormProps {
  jobId: string;
  onCardSaved: (setupIntentId: string, customerId: string) => void;
  onCancel: () => void;
}

function CardCollectionForm({ jobId, onCardSaved, onCancel }: CardCollectionFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Get the card element
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      // Create Setup Intent on backend
      console.log('💳 Creating Setup Intent for job:', jobId);
      const setupResponse = await fetch('/api/stripe/setup-intents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_id: jobId,
          metadata: {
            purpose: 'affidavit_billing',
            created_at: new Date().toISOString()
          }
        }),
      });

      const setupResponseData = await setupResponse.json();

      if (!setupResponse.ok) {
        throw new Error(setupResponseData.message || 'Failed to create Setup Intent');
      }

      const { setup_intent } = setupResponseData;
      console.log('💳 Setup Intent created:', setup_intent.id);

      // Confirm the Setup Intent with the card
      const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(
        setup_intent.client_secret,
        {
          payment_method: {
            card: cardElement,
          }
        }
      );

      if (stripeError) {
        throw new Error(stripeError.message || 'Card setup failed');
      }

      console.log('💳 Card setup completed:', setupIntent?.id);

      // Confirm on backend
      await fetch('/api/stripe/setup-intents/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          setup_intent_id: setupIntent?.id,
          payment_method_id: setupIntent?.payment_method
        }),
      });

      toast({
        title: "Card Saved Successfully",
        description: "Payment method will be charged when service is completed and affidavit is signed.",
      });

      onCardSaved(setupIntent?.id || '', setup_intent.customer_id);

    } catch (error) {
      console.error('💳 Card collection failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Card collection failed';
      setError(errorMessage);
      toast({
        title: "Card Collection Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border rounded-md">
        <CardElement options={cardElementOptions} />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isProcessing}>
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || isProcessing}>
          {isProcessing ? (
            <>
              <Clock className="w-4 h-4 mr-2 animate-spin" />
              Saving Card...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Save Payment Method
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

interface CardCollectionProps {
  jobId: string;
  onCardSaved: (setupIntentId: string, customerId: string) => void;
  onSkip?: () => void;
  stripe: any; // Stripe instance passed from StripeProvider
}

export default function CardCollection({ jobId, onCardSaved, onSkip, stripe }: CardCollectionProps) {
  const [showForm, setShowForm] = useState(false);

  if (!showForm) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Method Collection
          </CardTitle>
          <CardDescription>
            Collect payment information for this job. Card will only be charged when service is completed and affidavit is signed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Bill on Affidavit:</strong> Your payment method will be securely stored and only charged 
              after the service is completed and the affidavit is signed. No charge will be made until then.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button onClick={() => setShowForm(true)} className="flex-1">
              <CreditCard className="w-4 h-4 mr-2" />
              Add Payment Method
            </Button>
            {onSkip && (
              <Button variant="outline" onClick={onSkip}>
                Skip for Now
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Add Payment Method
        </CardTitle>
        <CardDescription>
          Enter your payment information. This will be used for billing when the service is completed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {stripe ? (
          <Elements stripe={stripe}>
            <CardCollectionForm 
              jobId={jobId} 
              onCardSaved={onCardSaved}
              onCancel={() => setShowForm(false)}
            />
          </Elements>
        ) : (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Stripe is not configured. Please contact support to set up payment processing.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

// Component to show stored payment method status
interface PaymentMethodStatusProps {
  setupIntentId?: string;
  customerId?: string;
  paymentMethodId?: string;
  cardBrand?: string;
  cardLast4?: string;
  onRemove?: () => void;
}

export function PaymentMethodStatus({ 
  setupIntentId, 
  customerId, 
  paymentMethodId,
  cardBrand, 
  cardLast4, 
  onRemove 
}: PaymentMethodStatusProps) {
  if (!setupIntentId && !paymentMethodId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            <span>No payment method stored for this job</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Payment Method Stored
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CreditCard className="w-3 h-3 mr-1" />
              {cardBrand?.toUpperCase() || 'Card'} •••• {cardLast4 || '****'}
            </Badge>
            <Badge variant="secondary">
              Ready for Billing
            </Badge>
          </div>
          {onRemove && (
            <Button variant="outline" size="sm" onClick={onRemove}>
              Remove
            </Button>
          )}
        </div>
        
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            This payment method will be automatically charged when the affidavit is signed and the service is completed.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
