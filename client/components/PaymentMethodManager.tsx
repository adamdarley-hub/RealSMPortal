import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Shield,
  Calendar,
  Building
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CardCollection from './CardCollection';

interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
    funding: string;
  };
  billing_details?: {
    name?: string;
    email?: string;
    address?: {
      city?: string;
      country?: string;
      line1?: string;
      line2?: string;
      postal_code?: string;
      state?: string;
    };
  };
  created: number;
  customer: string;
}

interface PaymentMethodManagerProps {
  customerId?: string;
  jobId?: string; // Optional - for job-specific payment method management
  allowAdd?: boolean;
  allowRemove?: boolean;
  onPaymentMethodSelected?: (paymentMethodId: string) => void;
  showDefaultBadge?: boolean;
}

export default function PaymentMethodManager({
  customerId,
  jobId,
  allowAdd = true,
  allowRemove = true,
  onPaymentMethodSelected,
  showDefaultBadge = true
}: PaymentMethodManagerProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadPaymentMethods = async () => {
    if (!customerId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('💳 Loading payment methods for customer:', customerId);
      
      // Note: This would typically call Stripe API to list customer payment methods
      // For now, we'll simulate the response since we don't have this endpoint yet
      const response = await fetch(`/api/stripe/customers/${customerId}/payment-methods`);
      
      if (!response.ok) {
        throw new Error(`Failed to load payment methods: ${response.status}`);
      }

      const data = await response.json();
      setPaymentMethods(data.payment_methods || []);

    } catch (error) {
      console.error('💳 Failed to load payment methods:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load payment methods';
      setError(errorMessage);
      
      // For demo purposes, show some mock data
      setPaymentMethods([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPaymentMethods();
  }, [customerId]);

  const handleAddPaymentMethod = (setupIntentId: string, newCustomerId: string) => {
    console.log('💳 Payment method added:', setupIntentId);
    setShowAddDialog(false);
    loadPaymentMethods(); // Reload to show the new payment method
    
    toast({
      title: "Payment Method Added",
      description: "Your new payment method has been saved successfully.",
    });
  };

  const handleRemovePaymentMethod = async (paymentMethodId: string) => {
    try {
      setRemovingId(paymentMethodId);
      console.log('💳 Removing payment method:', paymentMethodId);

      const response = await fetch(`/api/stripe/payment-methods/${paymentMethodId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove payment method');
      }

      // Remove from local state
      setPaymentMethods(prev => prev.filter(pm => pm.id !== paymentMethodId));
      
      toast({
        title: "Payment Method Removed",
        description: "The payment method has been removed from your account.",
      });

    } catch (error) {
      console.error('💳 Failed to remove payment method:', error);
      toast({
        title: "Removal Failed",
        description: error instanceof Error ? error.message : 'Failed to remove payment method',
        variant: "destructive",
      });
    } finally {
      setRemovingId(null);
    }
  };

  const formatCardBrand = (brand: string) => {
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  const formatExpiryDate = (month: number, year: number) => {
    return `${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
  };

  const getCardIcon = (brand: string) => {
    // You could add specific brand icons here
    return <CreditCard className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Methods
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Methods
            </CardTitle>
            <CardDescription>
              Manage your saved payment methods for faster checkout
            </CardDescription>
          </div>
          {allowAdd && (
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Card
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Payment Method</DialogTitle>
                  <DialogDescription>
                    Add a new card to your account for future payments.
                  </DialogDescription>
                </DialogHeader>
                
                {jobId ? (
                  <CardCollection
                    jobId={jobId}
                    onCardSaved={handleAddPaymentMethod}
                    onSkip={() => setShowAddDialog(false)}
                    stripe={null} // This would need to be passed from a Stripe provider
                  />
                ) : (
                  <div className="py-4">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Payment method addition requires a job context.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button variant="outline" size="sm" onClick={loadPaymentMethods} className="ml-2">
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {paymentMethods.length === 0 && !error ? (
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Payment Methods</h3>
            <p className="text-muted-foreground mb-4">
              Add a payment method to enable faster checkout and automatic billing.
            </p>
            {allowAdd && (
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Card
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {paymentMethods.map((paymentMethod, index) => (
              <div
                key={paymentMethod.id}
                className={`p-4 border rounded-lg transition-colors ${
                  onPaymentMethodSelected 
                    ? 'cursor-pointer hover:bg-muted/50 hover:border-primary' 
                    : ''
                }`}
                onClick={() => onPaymentMethodSelected?.(paymentMethod.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getCardIcon(paymentMethod.card?.brand || 'card')}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {formatCardBrand(paymentMethod.card?.brand || 'Card')} •••• {paymentMethod.card?.last4}
                        </span>
                        {showDefaultBadge && index === 0 && (
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Default
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Expires {formatExpiryDate(
                            paymentMethod.card?.exp_month || 0, 
                            paymentMethod.card?.exp_year || 0
                          )}
                        </span>
                        <span className="capitalize">
                          {paymentMethod.card?.funding} card
                        </span>
                      </div>
                      {paymentMethod.billing_details?.name && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Building className="w-3 h-3" />
                          {paymentMethod.billing_details.name}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <Shield className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                    {allowRemove && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePaymentMethod(paymentMethod.id);
                        }}
                        disabled={removingId === paymentMethod.id}
                      >
                        {removingId === paymentMethod.id ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {paymentMethods.length > 0 && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="w-4 h-4" />
              <span>
                All payment methods are securely stored and encrypted. 
                We never store your complete card details.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Simple payment method selector component
interface PaymentMethodSelectorProps {
  customerId: string;
  selectedPaymentMethodId?: string;
  onSelectionChange: (paymentMethodId: string) => void;
}

export function PaymentMethodSelector({
  customerId,
  selectedPaymentMethodId,
  onSelectionChange
}: PaymentMethodSelectorProps) {
  return (
    <PaymentMethodManager
      customerId={customerId}
      allowAdd={false}
      allowRemove={false}
      onPaymentMethodSelected={onSelectionChange}
      showDefaultBadge={false}
    />
  );
}
