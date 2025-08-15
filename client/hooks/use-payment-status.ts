import { useState, useEffect } from 'react';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  description?: string;
}

interface PaymentStatusData {
  invoiceId: string;
  payments: Payment[];
  totalPaid: number;
}

interface UsePaymentStatusReturn {
  paymentStatus: PaymentStatusData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const usePaymentStatus = (invoiceId: string | null): UsePaymentStatusReturn => {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentStatus = async () => {
    if (!invoiceId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/stripe/payment-status/${invoiceId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch payment status');
      }

      const data = await response.json();
      setPaymentStatus(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch payment status';
      setError(errorMessage);
      console.error('Payment status error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentStatus();
  }, [invoiceId]);

  const refetch = () => {
    fetchPaymentStatus();
  };

  return {
    paymentStatus,
    isLoading,
    error,
    refetch,
  };
};
