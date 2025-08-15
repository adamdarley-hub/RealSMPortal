import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  CreditCard, 
  RefreshCw, 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertCircle,
  Undo2,
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  description: string;
  payment_method?: {
    type: string;
    card?: {
      brand: string;
      last4: string;
      exp_month: number;
      exp_year: number;
    };
  };
}

interface PaymentHistoryProps {
  jobId: string;
  showRefundButton?: boolean; // Only show for admin users
  onRefund?: (paymentId: string, amount?: number) => void;
}

export default function PaymentHistory({ jobId, showRefundButton = false, onRefund }: PaymentHistoryProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadPaymentHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('💳 Loading payment history for job:', jobId);
      const response = await fetch(`/api/stripe/jobs/${jobId}/payments`);
      
      if (!response.ok) {
        throw new Error(`Failed to load payment history: ${response.status}`);
      }

      const data = await response.json();
      console.log('💳 Payment history loaded:', data.payments.length, 'payments');
      setPayments(data.payments || []);

    } catch (error) {
      console.error('💳 Failed to load payment history:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load payment history';
      setError(errorMessage);
      toast({
        title: "Failed to Load Payments",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (jobId) {
      loadPaymentHistory();
    }
  }, [jobId]);

  const formatCurrency = (amount: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'succeeded':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Paid
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };

  const handleRefund = async (payment: Payment) => {
    if (!onRefund) return;

    try {
      console.log('💰 Processing refund for payment:', payment.id);
      
      const response = await fetch('/api/stripe/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_intent_id: payment.id,
          reason: 'requested_by_customer'
        }),
      });

      if (!response.ok) {
        throw new Error('Refund failed');
      }

      const data = await response.json();
      console.log('💰 Refund processed:', data);

      toast({
        title: "Refund Processed",
        description: `${formatCurrency(data.refund.amount)} has been refunded.`,
      });

      // Reload payment history to show the refund
      loadPaymentHistory();
      
      if (onRefund) {
        onRefund(payment.id, data.refund.amount);
      }

    } catch (error) {
      console.error('💰 Refund failed:', error);
      toast({
        title: "Refund Failed",
        description: error instanceof Error ? error.message : 'Failed to process refund',
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment History
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

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button variant="outline" size="sm" onClick={loadPaymentHistory} className="ml-2">
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
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
              Payment History
            </CardTitle>
            <CardDescription>
              All payments and refunds for this job
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadPaymentHistory}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <div className="text-center py-8">
            <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Payments Yet</h3>
            <p className="text-muted-foreground">
              Payments will appear here when the affidavit is signed and billing is processed.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Payment Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Payments</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    payments
                      .filter(p => p.status === 'succeeded')
                      .reduce((sum, p) => sum + p.amount, 0)
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Successful</p>
                <p className="text-2xl font-bold text-green-600">
                  {payments.filter(p => p.status === 'succeeded').length}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {payments.filter(p => p.status === 'pending').length}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-red-600">
                  {payments.filter(p => p.status === 'failed').length}
                </p>
              </div>
            </div>

            {/* Payment Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  {showRefundButton && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {formatDate(payment.created)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{payment.description}</p>
                        <p className="text-xs text-muted-foreground">ID: {payment.id}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {payment.payment_method?.card ? (
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          <span className="capitalize">
                            {payment.payment_method.card.brand} •••• {payment.payment_method.card.last4}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {formatCurrency(payment.amount, payment.currency)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(payment.status)}
                    </TableCell>
                    {showRefundButton && (
                      <TableCell>
                        {payment.status === 'succeeded' && (
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRefund(payment)}
                            >
                              <Undo2 className="w-3 h-3 mr-1" />
                              Refund
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Component for quick payment status display
export function PaymentStatus({ jobId }: { jobId: string }) {
  const [totalPaid, setTotalPaid] = useState(0);
  const [paymentCount, setPaymentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadQuickStatus = async () => {
      try {
        const response = await fetch(`/api/stripe/jobs/${jobId}/payments`);
        if (response.ok) {
          const data = await response.json();
          const successfulPayments = data.payments.filter((p: Payment) => p.status === 'succeeded');
          setTotalPaid(successfulPayments.reduce((sum: number, p: Payment) => sum + p.amount, 0));
          setPaymentCount(successfulPayments.length);
        }
      } catch (error) {
        console.error('Failed to load payment status:', error);
      } finally {
        setLoading(false);
      }
    };

    if (jobId) {
      loadQuickStatus();
    }
  }, [jobId]);

  if (loading) return null;

  if (paymentCount === 0) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <Clock className="w-3 h-3 mr-1" />
        No Payments
      </Badge>
    );
  }

  return (
    <Badge className="bg-green-100 text-green-800 border-green-200">
      <DollarSign className="w-3 h-3 mr-1" />
      {new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(totalPaid)} ({paymentCount} payment{paymentCount > 1 ? 's' : ''})
    </Badge>
  );
}
