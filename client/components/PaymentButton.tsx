import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, CreditCard, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { usePaymentStatus } from "@/hooks/use-payment-status";

interface PaymentButtonProps {
  invoice: {
    id: string;
    invoice_number?: string;
    servemanager_job_number?: string | number;
    total: number;
    balance_due?: string | number;
    status: string;
    due_date?: string;
    client?: {
      name?: string;
      company?: string;
    };
  };
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  onClick?: () => void;
  onPaymentSuccess?: (paymentResult: any) => void;
  showPaymentStatus?: boolean;
}

const PaymentButton: React.FC<PaymentButtonProps> = ({
  invoice,
  variant = 'default',
  size = 'default',
  className = '',
  onPaymentSuccess,
  showPaymentStatus = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { paymentStatus, isLoading: statusLoading, refetch } = usePaymentStatus(
    showPaymentStatus ? invoice.id : null
  );

  // Calculate balance due
  const balanceDue = invoice.balance_due !== undefined
    ? (typeof invoice.balance_due === 'string' ? parseFloat(invoice.balance_due) : invoice.balance_due)
    : invoice.total; // Fallback to total if balance_due is not available

  const isInvoicePaid = invoice.status.toLowerCase() === 'paid' || balanceDue <= 0;
  const canPay = !isInvoicePaid && (invoice.status.toLowerCase() === 'issued' || invoice.status.toLowerCase() === 'sent');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handlePaymentSuccess = (paymentResult: any) => {
    // Refetch payment status to update UI
    if (showPaymentStatus) {
      setTimeout(() => refetch(), 1000);
    }
    
    onPaymentSuccess?.(paymentResult);
    setIsModalOpen(false);
  };

  const getButtonContent = () => {
    if (isInvoicePaid) {
      return (
        <>
          <CheckCircle className="w-4 h-4 mr-2" />
          Paid
        </>
      );
    }

    if (!canPay) {
      return (
        <>
          <AlertCircle className="w-4 h-4 mr-2" />
          Not Available
        </>
      );
    }

    return (
      <>
        <DollarSign className="w-4 h-4 mr-2" />
        Pay {formatCurrency(balanceDue > 0 ? balanceDue : invoice.total)}
      </>
    );
  };

  const getButtonVariant = () => {
    if (isInvoicePaid) {
      return 'outline';
    }
    return variant;
  };

  const getButtonClassName = () => {
    let baseClass = className;
    
    if (isInvoicePaid) {
      baseClass += ' text-green-600 border-green-200 bg-green-50 hover:bg-green-100';
    } else if (!canPay) {
      baseClass += ' text-gray-400 cursor-not-allowed';
    }
    
    return baseClass;
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={getButtonVariant()}
        size={size}
        className={getButtonClassName()}
        onClick={() => setIsModalOpen(true)}
        disabled={!canPay}
      >
        {getButtonContent()}
      </Button>

      {/* Payment status badge */}
      {showPaymentStatus && paymentStatus && (
        <div className="flex items-center gap-1">
          {statusLoading ? (
            <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
          ) : (
            paymentStatus.payments.length > 0 && (
              <Badge variant="outline" className="text-xs">
                <CreditCard className="w-3 h-3 mr-1" />
                {paymentStatus.payments.length} payment{paymentStatus.payments.length > 1 ? 's' : ''}
              </Badge>
            )
          )}
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        invoice={invoice}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
};

export default PaymentButton;
