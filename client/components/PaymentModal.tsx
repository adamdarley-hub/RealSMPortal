import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  DollarSign,
  FileText,
  Calendar,
  Building,
  AlertCircle,
  X,
} from "lucide-react";
import StripeCheckout from "./StripeCheckout";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: {
    id: string;
    invoice_number?: string;
    servemanager_job_number?: string | number;
    total: number;
    balance_due: string | number;
    status: string;
    due_date?: string;
    client?: {
      name?: string;
      company?: string;
    };
  };
  onPaymentSuccess?: (paymentResult: any) => void;
}

interface PaymentStep {
  id: 'details' | 'payment' | 'success';
  title: string;
  description: string;
}

const paymentSteps: PaymentStep[] = [
  {
    id: 'details',
    title: 'Review Invoice',
    description: 'Confirm payment details',
  },
  {
    id: 'payment',
    title: 'Enter Payment',
    description: 'Complete your payment',
  },
  {
    id: 'success',
    title: 'Payment Complete',
    description: 'Payment processed successfully',
  },
];

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onPaymentSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState<PaymentStep['id']>('details');
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Calculate payment amount
  const balanceDue = typeof invoice.balance_due === 'string' 
    ? parseFloat(invoice.balance_due) 
    : invoice.balance_due;
  
  const paymentAmount = balanceDue > 0 ? balanceDue : invoice.total;

  // Reset modal state when it opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setCurrentStep('details');
      setPaymentResult(null);
      setError(null);
    }
  }, [isOpen]);

  const handlePaymentSuccess = (result: any) => {
    setPaymentResult(result);
    setCurrentStep('success');
    onPaymentSuccess?.(result);
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleClose = () => {
    setCurrentStep('details');
    setPaymentResult(null);
    setError(null);
    onClose();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'sent':
      case 'issued':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No due date';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      {paymentSteps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-medium ${
              currentStep === step.id
                ? 'bg-blue-500 text-white border-blue-500'
                : paymentSteps.findIndex(s => s.id === currentStep) > index
                ? 'bg-green-500 text-white border-green-500'
                : 'bg-gray-100 text-gray-400 border-gray-300'
            }`}
          >
            {paymentSteps.findIndex(s => s.id === currentStep) > index ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              index + 1
            )}
          </div>
          {index < paymentSteps.length - 1 && (
            <div
              className={`h-0.5 w-12 mx-2 ${
                paymentSteps.findIndex(s => s.id === currentStep) > index
                  ? 'bg-green-500'
                  : 'bg-gray-300'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderDetailsStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Review Invoice Details</h3>
        <p className="text-muted-foreground">
          Please review the invoice details before proceeding with payment
        </p>
      </div>

      {/* Invoice summary */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-medium">Invoice ID:</span>
          <span className="font-mono text-sm">
            {invoice.invoice_number || invoice.servemanager_job_number || invoice.id}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="font-medium">Status:</span>
          <Badge className={getStatusColor(invoice.status)}>
            {invoice.status.toUpperCase()}
          </Badge>
        </div>

        {invoice.due_date && (
          <div className="flex items-center justify-between">
            <span className="font-medium">Due Date:</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-gray-400" />
              {formatDate(invoice.due_date)}
            </span>
          </div>
        )}

        {invoice.client && (
          <div className="flex items-center justify-between">
            <span className="font-medium">Client:</span>
            <span className="flex items-center gap-1">
              <Building className="w-4 h-4 text-gray-400" />
              {invoice.client.company || invoice.client.name}
            </span>
          </div>
        )}

        <div className="border-t pt-3 mt-3">
          <div className="flex items-center justify-between text-lg font-bold">
            <span>Amount to Pay:</span>
            <span className="text-green-600">
              {formatCurrency(paymentAmount)}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={handleClose} className="flex-1">
          Cancel
        </Button>
        <Button 
          onClick={() => setCurrentStep('payment')} 
          className="flex-1"
          disabled={paymentAmount <= 0}
        >
          <DollarSign className="w-4 h-4 mr-2" />
          Continue to Payment
        </Button>
      </div>
    </div>
  );

  const renderPaymentStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Complete Payment</h3>
        <p className="text-muted-foreground">
          Enter your payment information to complete the transaction
        </p>
      </div>

      <div className="flex justify-center">
        <StripeCheckout
          amount={paymentAmount}
          currency="usd"
          invoiceId={invoice.id}
          invoiceNumber={invoice.invoice_number || invoice.servemanager_job_number?.toString()}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
          onCancel={() => setCurrentStep('details')}
        />
      </div>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-green-600 mb-2">
          Payment Successful!
        </h3>
        <p className="text-muted-foreground">
          Your payment has been processed successfully.
        </p>
      </div>

      {paymentResult && (
        <div className="bg-green-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Payment ID:</span>
            <span className="font-mono">{paymentResult.paymentIntentId}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Amount Paid:</span>
            <span className="font-medium">{formatCurrency(paymentResult.amount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Invoice:</span>
            <span>{invoice.invoice_number || invoice.id}</span>
          </div>
        </div>
      )}

      <Button onClick={handleClose} className="w-full">
        <CheckCircle className="w-4 h-4 mr-2" />
        Done
      </Button>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'details':
        return renderDetailsStep();
      case 'payment':
        return renderPaymentStep();
      case 'success':
        return renderSuccessStep();
      default:
        return renderDetailsStep();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="relative">
          <DialogTitle className="flex items-center gap-2 pr-8">
            <FileText className="w-5 h-5" />
            Invoice Payment
          </DialogTitle>
          <DialogDescription>
            Secure payment processing powered by Stripe
          </DialogDescription>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="absolute right-0 top-0 p-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </DialogHeader>

        <div className="py-4">
          {renderStepIndicator()}
          {renderCurrentStep()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
