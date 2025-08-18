import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  FileText, 
  DollarSign, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Zap,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AffidavitPaymentTriggerProps {
  jobId: string;
  jobAmount?: number;
  hasStoredPaymentMethod: boolean;
  paymentMethodInfo?: {
    brand: string;
    last4: string;
    customerId: string;
    paymentMethodId: string;
  };
  onPaymentProcessed: (paymentIntentId: string, amount: number) => void;
  showTrigger?: boolean; // Only show for admin users when affidavit is signed
}

export default function AffidavitPaymentTrigger({
  jobId,
  jobAmount = 0,
  hasStoredPaymentMethod,
  paymentMethodInfo,
  onPaymentProcessed,
  showTrigger = false
}: AffidavitPaymentTriggerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [amount, setAmount] = useState(jobAmount);
  const [description, setDescription] = useState('Service completion payment');
  const [showDialog, setShowDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setAmount(jobAmount);
  }, [jobAmount]);

  const processPayment = async () => {
    if (!hasStoredPaymentMethod || !paymentMethodInfo) {
      toast({
        title: "No Payment Method",
        description: "No stored payment method found for this job.",
        variant: "destructive",
      });
      return;
    }

    if (amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid payment amount.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsProcessing(true);
      console.log('💳 Processing affidavit payment for job:', jobId);

      const response = await fetch('/api/stripe/affidavit-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_id: jobId,
          amount: amount,
          description: description,
          payment_method_id: paymentMethodInfo.paymentMethodId,
          customer_id: paymentMethodInfo.customerId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Payment processing failed');
      }

      const responseData = await response.json();
      const data = responseData;
      console.log('💳 Payment processed successfully:', data);

      toast({
        title: "Payment Processed Successfully",
        description: `${new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(amount)} has been charged to ${paymentMethodInfo.brand} •••• ${paymentMethodInfo.last4}`,
      });

      setShowDialog(false);
      onPaymentProcessed(data.payment_intent.id, data.payment_intent.amount);

    } catch (error) {
      console.error('💳 Payment processing failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment processing failed';
      
      toast({
        title: "Payment Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Status display when payment method is ready but no trigger yet
  if (hasStoredPaymentMethod && !showTrigger) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <CreditCard className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Payment Method Ready</p>
                <p className="text-sm text-muted-foreground">
                  {paymentMethodInfo ? 
                    `${paymentMethodInfo.brand} •••• ${paymentMethodInfo.last4}` : 
                    'Card on file'
                  } • Will be charged when affidavit is signed
                </p>
              </div>
            </div>
            <Badge className="bg-green-100 text-green-800 border-green-200">
              <Clock className="w-3 h-3 mr-1" />
              Ready for Billing
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No stored payment method
  if (!hasStoredPaymentMethod) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-full">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
            </div>
            <div>
              <p className="font-medium">No Payment Method</p>
              <p className="text-sm text-muted-foreground">
                Add a payment method to enable automatic billing when service is completed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Admin trigger for processing payment after affidavit is signed
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-orange-600" />
          Affidavit Signed - Process Payment
        </CardTitle>
        <CardDescription>
          The affidavit has been signed. You can now process the payment for this completed service.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            <strong>Service Completed:</strong> The affidavit has been signed and the service is complete. 
            Process payment using the stored payment method.
          </AlertDescription>
        </Alert>

        {paymentMethodInfo && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                <span className="font-medium">
                  {paymentMethodInfo.brand} •••• {paymentMethodInfo.last4}
                </span>
              </div>
              <Badge variant="outline">Ready</Badge>
            </div>
          </div>
        )}

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="w-full" size="lg">
              <DollarSign className="w-4 h-4 mr-2" />
              Process Payment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Process Affidavit Payment</DialogTitle>
              <DialogDescription>
                Charge the stored payment method for the completed service.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="amount" className="text-sm font-medium">Payment Amount</label>
                <div className="relative mt-1">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="pl-10"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="description" className="text-sm font-medium">Description</label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Payment description..."
                  className="mt-1"
                />
              </div>

              {paymentMethodInfo && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    This payment will be charged to {paymentMethodInfo.brand} •••• {paymentMethodInfo.last4}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowDialog(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button onClick={processPayment} disabled={isProcessing || amount <= 0}>
                {isProcessing ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <DollarSign className="w-4 h-4 mr-2" />
                    Charge {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD'
                    }).format(amount)}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// Component to automatically detect affidavit status and trigger payment UI
interface AutoPaymentTriggerProps {
  jobId: string;
  hasAffidavit: boolean;
  affidavitSigned: boolean;
  jobAmount?: number;
  paymentMethodInfo?: {
    brand: string;
    last4: string;
    customerId: string;
    paymentMethodId: string;
  };
  onPaymentProcessed: (paymentIntentId: string, amount: number) => void;
  isAdmin?: boolean;
}

export function AutoPaymentTrigger({
  jobId,
  hasAffidavit,
  affidavitSigned,
  jobAmount,
  paymentMethodInfo,
  onPaymentProcessed,
  isAdmin = false
}: AutoPaymentTriggerProps) {
  // Only show payment trigger if:
  // 1. There's an affidavit
  // 2. The affidavit is signed
  // 3. User is admin
  // 4. There's a stored payment method
  const shouldShowTrigger = hasAffidavit && affidavitSigned && isAdmin && paymentMethodInfo;

  return (
    <AffidavitPaymentTrigger
      jobId={jobId}
      jobAmount={jobAmount}
      hasStoredPaymentMethod={!!paymentMethodInfo}
      paymentMethodInfo={paymentMethodInfo}
      onPaymentProcessed={onPaymentProcessed}
      showTrigger={shouldShowTrigger}
    />
  );
}
