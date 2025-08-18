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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CreditCard, Plus, Trash2, AlertCircle, CheckCircle, Edit2, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useStripe } from "@/contexts/StripeContext";
import { useAuth } from "@/contexts/AuthContext";

interface SavedPaymentMethod {
  id: string;
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  created: number;
  friendlyName?: string;
}

interface SavedPaymentMethodsProps {
  onPaymentMethodAdded?: () => void;
  onPaymentMethodRemoved?: () => void;
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

// Add card form component
const AddCardForm: React.FC<{
  onSuccess: (customerId?: string) => void;
  onCancel: () => void;
}> = ({ onSuccess, onCancel }) => {
  const stripe = useStripeElements();
  const elements = useElements();
  const { toast } = useToast();
  const { user } = useAuth();

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [friendlyName, setFriendlyName] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !user?.email) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Create setup intent
      const setupResponse = await fetch('/api/stripe/create-setup-intent', {
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

      if (!setupResponse.ok) {
        let errorMessage = 'Failed to create setup intent';
        try {
          const errorData = await setupResponse.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // Response might not be JSON (e.g., 404 HTML page)
          errorMessage = `${errorMessage} (${setupResponse.status})`;
        }
        throw new Error(errorMessage);
      }

      const setupData = await setupResponse.json();

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      // Confirm setup intent with optional friendly name
      const setupPayload: any = {
        payment_method: {
          card: cardElement,
        }
      };

      if (friendlyName.trim()) {
        setupPayload.payment_method.metadata = {
          friendly_name: friendlyName.trim()
        };
      }

      const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(setupData.clientSecret, setupPayload);

      if (stripeError) {
        throw new Error(stripeError.message || 'Failed to save payment method');
      }

      console.log('💳 Setup intent confirmed successfully:', setupIntent?.id);
      console.log('💳 Customer ID for reload:', setupData.customerId);

      toast({
        title: "Payment Method Saved",
        description: "Your payment method has been saved successfully by Stripe.",
      });

      onSuccess(setupData.customerId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save payment method';
      setError(errorMessage);

      const isStripeNotConfigured = errorMessage.includes('Stripe is not configured');

      toast({
        title: "Error",
        description: isStripeNotConfigured 
          ? "Stripe payments are not configured. Please contact your administrator to set up Stripe integration."
          : errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add New Payment Method
        </CardTitle>
        <CardDescription>
          Save a payment method for future use
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Friendly name input */}
          <div className="space-y-2">
            <Label htmlFor="friendly-name">Card Name (Optional)</Label>
            <Input
              id="friendly-name"
              placeholder="e.g., Personal Visa, Business Card, etc."
              value={friendlyName}
              onChange={(e) => setFriendlyName(e.target.value)}
              maxLength={50}
            />
          </div>

          {/* Card input */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Card Information</Label>
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

          {/* Stripe security notice */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
            <Shield className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-blue-800">
              <strong>Secure Storage by Stripe</strong>
              <br />
              Your payment information is securely stored by Stripe, not on our servers. Stripe is PCI DSS Level 1 certified and uses bank-level security.
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!stripe || !cardComplete || isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving to Stripe...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Save Payment Method
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

// Main component
const SavedPaymentMethodsContent: React.FC<SavedPaymentMethodsProps> = ({
  onPaymentMethodAdded,
  onPaymentMethodRemoved
}) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [paymentMethods, setPaymentMethods] = useState<SavedPaymentMethod[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Load customer and payment methods
  useEffect(() => {
    const loadPaymentMethods = async () => {
      if (!user?.email) {
        setLoading(false);
        return;
      }

      try {
        // Get customer by email
        const customerResponse = await fetch(`/api/stripe/customers/by-email/${encodeURIComponent(user.email)}`);

        if (!customerResponse.ok) {
          let errorMessage = 'Failed to load customer';
          try {
            const errorData = await customerResponse.json();
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            errorMessage = `${errorMessage} (${customerResponse.status})`;
          }
          throw new Error(errorMessage);
        }

        const customerData = await customerResponse.json();
        console.log('💳 Customer data received:', customerData);

        if (customerData.customer) {
          console.log('💳 Setting customer ID:', customerData.customer.id);
          setCustomerId(customerData.customer.id);

          // Load saved payment methods
          console.log('💳 Loading payment methods for customer:', customerData.customer.id);
          const pmResponse = await fetch(`/api/stripe/customers/${customerData.customer.id}/payment-methods`);

          if (!pmResponse.ok) {
            let errorMessage = 'Failed to load payment methods';
            try {
              const errorData = await pmResponse.json();
              errorMessage = errorData.error || errorMessage;
            } catch (e) {
              errorMessage = `${errorMessage} (${pmResponse.status})`;
            }
            throw new Error(errorMessage);
          }

          const pmData = await pmResponse.json();
          console.log('💳 Payment methods data received:', pmData);

          if (pmData.paymentMethods) {
            console.log('💳 Setting payment methods:', pmData.paymentMethods);
            setPaymentMethods(pmData.paymentMethods);
          } else {
            console.log('💳 No payment methods found');
          }
        } else {
          console.log('💳 No customer found for email:', user?.email);
        }
      } catch (error) {
        console.error('Error loading payment methods:', error);
        toast({
          title: "Error",
          description: "Failed to load payment methods. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadPaymentMethods();
  }, [user?.email, toast]);

  const handleDeletePaymentMethod = async (paymentMethodId: string) => {
    setDeletingId(paymentMethodId);
    
    try {
      const response = await fetch(`/api/stripe/payment-methods/${paymentMethodId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        let errorMessage = 'Failed to delete payment method';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = `${errorMessage} (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      const responseData = await response.json();

      setPaymentMethods(prev => prev.filter(pm => pm.id !== paymentMethodId));
      
      toast({
        title: "Payment Method Deleted",
        description: "The payment method has been removed from Stripe.",
      });

      onPaymentMethodRemoved?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete payment method. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddSuccess = async (newCustomerId?: string) => {
    console.log('🔄 handleAddSuccess called with customer ID:', newCustomerId);
    setShowAddForm(false);
    
    // Use the provided customer ID or the existing one
    const customerIdToUse = newCustomerId || customerId;
    
    console.log('🔄 Customer ID to use for reload:', customerIdToUse);
    console.log('🔄 Current customerId state:', customerId);
    
    if (!customerIdToUse) {
      console.error('No customer ID available to reload payment methods');
      return;
    }
    
    // Update customer ID if we got a new one
    if (newCustomerId && newCustomerId !== customerId) {
      console.log('🔄 Updating customer ID from', customerId, 'to', newCustomerId);
      setCustomerId(newCustomerId);
    }
    
    // Reload payment methods
    try {
      console.log('🔄 Fetching payment methods for customer:', customerIdToUse);
      const pmResponse = await fetch(`/api/stripe/customers/${customerIdToUse}/payment-methods`);

      if (!pmResponse.ok) {
        let errorMessage = 'Failed to reload payment methods';
        try {
          const errorData = await pmResponse.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = `${errorMessage} (${pmResponse.status})`;
        }
        console.error('Failed to reload payment methods:', errorMessage);
        return;
      }

      const pmData = await pmResponse.json();
      console.log('🔄 Received payment methods data:', pmData);

      if (pmData.paymentMethods) {
        console.log('🔄 Setting payment methods:', pmData.paymentMethods);
        setPaymentMethods(pmData.paymentMethods);
        onPaymentMethodAdded?.();
      } else {
        console.log('🔄 No payment methods in response');
      }
    } catch (error) {
      console.error('Error reloading payment methods:', error);
    }
  };

  const formatCardBrand = (brand: string) => {
    const brandMap: Record<string, string> = {
      'visa': 'Visa',
      'mastercard': 'Mastercard',
      'amex': 'American Express',
      'discover': 'Discover',
      'diners': 'Diners Club',
      'jcb': 'JCB',
      'unionpay': 'UnionPay',
      'unknown': 'Card'
    };
    return brandMap[brand] || brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  const getBrandColor = (brand: string) => {
    const colorMap: Record<string, string> = {
      'visa': 'bg-blue-100 text-blue-800',
      'mastercard': 'bg-red-100 text-red-800',
      'amex': 'bg-green-100 text-green-800',
      'discover': 'bg-orange-100 text-orange-800',
      'unknown': 'bg-gray-100 text-gray-800'
    };
    return colorMap[brand] || 'bg-gray-100 text-gray-800';
  };

  if (!user) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-gray-600">Please log in to manage payment methods.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Loading payment methods...</span>
        </CardContent>
      </Card>
    );
  }

  if (showAddForm) {
    return (
      <AddCardForm
        onSuccess={handleAddSuccess}
        onCancel={() => setShowAddForm(false)}
      />
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Saved Payment Methods
            </CardTitle>
            <CardDescription>
              Manage your saved payment methods for faster checkout
            </CardDescription>
          </div>
          <Button onClick={() => setShowAddForm(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Card
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {paymentMethods.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No saved payment methods</h3>
            <p className="text-gray-600 mb-4">
              Add a payment method to make future payments faster and easier.
            </p>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Card
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {paymentMethods.map((pm) => (
              <div
                key={pm.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-gray-500" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {pm.friendlyName || `${formatCardBrand(pm.card.brand)} ending in ${pm.card.last4}`}
                      </span>
                      <Badge className={getBrandColor(pm.card.brand)}>
                        {formatCardBrand(pm.card.brand)}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500">
                      •••• {pm.card.last4} • Expires {pm.card.exp_month}/{pm.card.exp_year}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeletePaymentMethod(pm.id)}
                    disabled={deletingId === pm.id}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    {deletingId === pm.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stripe branding footer */}
        <div className="flex items-center justify-center gap-2 pt-4 border-t text-xs text-gray-500">
          <Shield className="w-3 h-3" />
          <span>Payment methods securely stored by Stripe</span>
        </div>
      </CardContent>
    </Card>
  );
};

// Wrapper component with Stripe Elements
const SavedPaymentMethods: React.FC<SavedPaymentMethodsProps> = (props) => {
  const { stripe, isLoading, error } = useStripe();

  if (isLoading) {
    return (
      <Card className="w-full">
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
      <SavedPaymentMethodsContent {...props} />
    </Elements>
  );
};

export default SavedPaymentMethods;
