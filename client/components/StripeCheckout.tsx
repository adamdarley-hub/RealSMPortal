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
import { Loader2, CreditCard, Shield, CheckCircle, AlertCircle, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useStripe } from "@/contexts/StripeContext";
import { useAuth } from "@/contexts/AuthContext";

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

interface SavedPaymentMethod {
  id: string;
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  created: number;
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
  const { user } = useAuth();

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [showSaveCard, setShowSaveCard] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<SavedPaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [useNewCard, setUseNewCard] = useState(true);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);

  // Load customer and payment methods on mount
  useEffect(() => {
    const loadCustomerInfo = async () => {
      if (!user?.email) return;

      try {
        setLoadingPaymentMethods(true);
        
        // Get customer by email
        const customerResponse = await fetch(`/api/stripe/customers/by-email/${encodeURIComponent(user.email)}`);

        if (!customerResponse.ok) {
          const errorData = await customerResponse.json();
          console.error('Failed to load customer:', errorData.error);
          return;
        }

        const customerData = await customerResponse.json();

        if (customerData.customer) {
          setCustomerId(customerData.customer.id);

          // Load saved payment methods
          const pmResponse = await fetch(`/api/stripe/customers/${customerData.customer.id}/payment-methods`);

          if (!pmResponse.ok) {
            const errorData = await pmResponse.json();
            console.error('Failed to load payment methods:', errorData.error);
            return;
          }

          const pmData = await pmResponse.json();

          if (pmData.paymentMethods) {
            setSavedPaymentMethods(pmData.paymentMethods);
            // If user has saved cards, default to using them
            if (pmData.paymentMethods.length > 0) {
              setUseNewCard(false);
              setSelectedPaymentMethod(pmData.paymentMethods[0].id);
            }
          }
        }
      } catch (error) {
        console.error('Error loading customer info:', error);
      } finally {
        setLoadingPaymentMethods(false);
      }
    };

    loadCustomerInfo();
  }, [user?.email]);

  // Create payment intent when component mounts or payment method changes
  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        const requestBody: any = {
          amount,
          currency,
          invoiceId,
        };

        // Add user info for customer creation/lookup
        if (user) {
          requestBody.userInfo = {
            email: user.email,
            name: user.name,
            clientId: user.client_id
          };
        }

        // If using existing payment method, include it
        if (!useNewCard && selectedPaymentMethod && customerId) {
          requestBody.useExistingPaymentMethod = true;
          requestBody.paymentMethodId = selectedPaymentMethod;
        }

        const response = await fetch('/api/stripe/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        const responseData = await response.json();

        if (!response.ok) {
          throw new Error(responseData.error || 'Failed to create payment intent');
        }

        const { clientSecret, customerId: returnedCustomerId } = responseData;
        setPaymentIntent(clientSecret);
        
        if (returnedCustomerId && !customerId) {
          setCustomerId(returnedCustomerId);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize payment';
        setError(errorMessage);
        onError?.(errorMessage);
      }
    };

    createPaymentIntent();
  }, [amount, currency, invoiceId, onError, user, useNewCard, selectedPaymentMethod, customerId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !paymentIntent) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      let confirmedPayment;

      if (useNewCard) {
        // Using new card
        const cardElement = elements?.getElement(CardElement);
        if (!cardElement) {
          throw new Error('Card element not found');
        }

        const confirmData: any = {
          payment_method: {
            card: cardElement,
          },
        };

        // Save card for future use if requested
        if (showSaveCard && customerId) {
          confirmData.setup_future_usage = 'off_session';
        }

        const { error: stripeError, paymentIntent: payment } = await stripe.confirmCardPayment(
          paymentIntent,
          confirmData
        );

        if (stripeError) {
          throw new Error(stripeError.message || 'Payment failed');
        }

        confirmedPayment = payment;
      } else {
        // Using saved payment method
        const { error: stripeError, paymentIntent: payment } = await stripe.confirmCardPayment(
          paymentIntent,
          {
            payment_method: selectedPaymentMethod!,
          }
        );

        if (stripeError) {
          throw new Error(stripeError.message || 'Payment failed');
        }

        confirmedPayment = payment;
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

        const confirmResponseData = await confirmResponse.json();

        if (!confirmResponse.ok) {
          throw new Error(confirmResponseData.error || 'Failed to confirm payment');
        }

        toast({
          title: "Payment Successful",
          description: `Payment of $${amount.toFixed(2)} has been processed successfully.`,
        });

        const paymentResult: PaymentResult = {
          paymentIntentId: confirmedPayment.id,
          amount: confirmResponseData.amount,
          currency: confirmResponseData.currency,
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

  const handleDeletePaymentMethod = async (paymentMethodId: string) => {
    try {
      const response = await fetch(`/api/stripe/payment-methods/${paymentMethodId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete payment method');
      }

      const responseData = await response.json();

      setSavedPaymentMethods(prev => prev.filter(pm => pm.id !== paymentMethodId));

      // If we deleted the selected method, switch to new card
      if (selectedPaymentMethod === paymentMethodId) {
        setUseNewCard(true);
        setSelectedPaymentMethod(null);
      }

      toast({
        title: "Payment Method Deleted",
        description: "The payment method has been removed successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete payment method. Please try again.",
        variant: "destructive",
      });
    }
  };

  const addNewPaymentMethod = async () => {
    if (!user?.email) return;

    try {
      const response = await fetch('/api/stripe/create-setup-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userInfo: {
            email: user.email,
            name: user.name,
            clientId: user.client_id
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create setup intent');
      }

      const data = await response.json();

      if (data.clientSecret) {
        const cardElement = elements?.getElement(CardElement);
        if (!cardElement) {
          throw new Error('Card element not found');
        }

        const { error } = await stripe!.confirmCardSetup(data.clientSecret, {
          payment_method: {
            card: cardElement,
          }
        });

        if (error) {
          throw new Error(error.message);
        }

        // Reload payment methods
        if (data.customerId) {
          const pmResponse = await fetch(`/api/stripe/customers/${data.customerId}/payment-methods`);

          if (!pmResponse.ok) {
            const errorData = await pmResponse.json();
            console.error('Failed to reload payment methods:', errorData.error);
            return;
          }

          const pmData = await pmResponse.json();

          if (pmData.paymentMethods) {
            setSavedPaymentMethods(pmData.paymentMethods);
          }
        }

        toast({
          title: "Payment Method Saved",
          description: "Your payment method has been saved for future use.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save payment method. Please try again.",
        variant: "destructive",
      });
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

  if (loadingPaymentMethods) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Loading payment options...</span>
        </CardContent>
      </Card>
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

        {/* Payment method selection */}
        {savedPaymentMethods.length > 0 && (
          <div className="space-y-3">
            <label className="text-sm font-medium">Payment Method</label>
            
            {/* Saved payment methods */}
            <div className="space-y-2">
              {savedPaymentMethods.map((pm) => (
                <div
                  key={pm.id}
                  className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                    !useNewCard && selectedPaymentMethod === pm.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => {
                    setUseNewCard(false);
                    setSelectedPaymentMethod(pm.id);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 border-2 rounded-full border-gray-300 flex items-center justify-center">
                      {!useNewCard && selectedPaymentMethod === pm.id && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-gray-500" />
                      <span className="capitalize">{pm.card.brand}</span>
                      <span>���••• {pm.card.last4}</span>
                      <span className="text-sm text-gray-500">
                        {pm.card.exp_month}/{pm.card.exp_year}
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePaymentMethod(pm.id);
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* New card option */}
            <div
              className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                useNewCard
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setUseNewCard(true)}
            >
              <div className="w-4 h-4 border-2 rounded-full border-gray-300 flex items-center justify-center">
                {useNewCard && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                )}
              </div>
              <Plus className="w-4 h-4 text-gray-500" />
              <span>Use new card</span>
            </div>
          </div>
        )}

        {/* Payment form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Card input - only show if using new card */}
          {useNewCard && (
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
              
              {/* Save card option */}
              {user && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="save-card"
                    checked={showSaveCard}
                    onChange={(e) => setShowSaveCard(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="save-card" className="text-sm text-gray-600">
                    Save this card for future payments
                  </label>
                </div>
              )}
            </div>
          )}

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
              disabled={
                !stripe || 
                isProcessing || 
                !paymentIntent || 
                (useNewCard && !cardComplete) ||
                (!useNewCard && !selectedPaymentMethod)
              }
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
