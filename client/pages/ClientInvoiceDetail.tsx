import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import ClientLayout from "@/components/ClientLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Download,
  DollarSign,
  Building,
  User,
  Mail,
  Phone,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LineItem {
  type: string;
  id: number;
  name: string;
  description: string;
  unit_cost: string;
  quantity: string;
  updated_at: string;
  created_at: string;
}

interface Payment {
  type: string;
  id: number;
  amount: string;
  description: string | null;
  applied_on: string;
  updated_at: string;
  created_at: string;
}

interface InvoiceDetail {
  type: string;
  id: number;
  balance_due: string;
  locked: boolean;
  issued_on: string | null;
  total_paid: string;
  subtotal: string;
  total: string;
  total_tax_amount: string;
  terms: string | null;
  paid_on: string | null;
  job_id: number;
  token: string;
  status: string; // "Draft", "Issued", "Paid", etc.
  taxes_enabled: boolean;
  last_issued_at: string | null;
  updated_at: string;
  created_at: string;
  client_id: number;
  servemanager_job_number: number;
  pdf_download_url: string;
  line_items: LineItem[];
  payments: Payment[];
  // Client info (added by mapping)
  client?: {
    id: string;
    name: string;
    company: string;
    email?: string;
    phone?: string;
  };
}

// Helper functions
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return "No date";
  return new Date(dateString).toLocaleDateString();
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "paid": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    case "sent": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    case "overdue": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
    case "draft": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    case "cancelled": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
  }
};

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case "paid": return <CheckCircle className="w-4 h-4" />;
    case "sent": return <Mail className="w-4 h-4" />;
    case "overdue": return <AlertCircle className="w-4 h-4" />;
    case "draft": return <Clock className="w-4 h-4" />;
    case "cancelled": return <AlertCircle className="w-4 h-4" />;
    default: return <Clock className="w-4 h-4" />;
  }
};

export default function ClientInvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadInvoice = async () => {
    if (!id || !user?.client_id) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/invoices/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to load invoice');
      }

      const invoiceData = await response.json();
      
      // Verify this invoice belongs to the client
      if (invoiceData.client?.id !== user.client_id) {
        throw new Error('Invoice not found');
      }
      
      setInvoice(invoiceData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load invoice';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoice();
  }, [id, user?.client_id]);

  if (loading) {
    return (
      <ClientLayout>
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <div>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-96 mt-2" />
            </div>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </ClientLayout>
    );
  }

  if (error || !invoice) {
    return (
      <ClientLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
                <h3 className="text-lg font-semibold">Unable to Load Invoice</h3>
                <p className="text-muted-foreground">{error || 'Invoice not found'}</p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => navigate('/client/invoices')} variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Invoices
                  </Button>
                  <Button onClick={loadInvoice}>
                    Try Again
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/client/invoices')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <CreditCard className="w-8 h-8" />
                {invoice.invoice_number}
              </h1>
              <p className="text-muted-foreground">
                Invoice details and payment information
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(invoice.status)}>
              {getStatusIcon(invoice.status)}
              <span className="ml-1">{invoice.status.toUpperCase()}</span>
            </Badge>
            {invoice.status === 'sent' && (
              <Button>
                <DollarSign className="w-4 h-4 mr-2" />
                Pay Now
              </Button>
            )}
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Invoice Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Invoice Number</label>
                  <p className="font-mono text-sm">{invoice.invoice_number}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <Badge className={getStatusColor(invoice.status)}>
                    {invoice.status}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Created Date</label>
                  <p className="text-sm flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {formatDate(invoice.created_date)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Due Date</label>
                  <p className="text-sm flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {formatDate(invoice.due_date)}
                  </p>
                </div>
                {invoice.paid_date && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Paid Date</label>
                      <p className="text-sm flex items-center gap-1">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        {formatDate(invoice.paid_date)}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Client Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Client Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Company</label>
                <p className="font-medium">{invoice.client.company}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Contact</label>
                <p className="flex items-center gap-1">
                  <User className="w-4 h-4 text-gray-400" />
                  {invoice.client.name}
                </p>
              </div>
              {invoice.client.email && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="flex items-center gap-1">
                    <Mail className="w-4 h-4 text-gray-400" />
                    {invoice.client.email}
                  </p>
                </div>
              )}
              {invoice.client.phone && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p className="flex items-center gap-1">
                    <Phone className="w-4 h-4 text-gray-400" />
                    {invoice.client.phone}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Jobs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Jobs Included</CardTitle>
            <CardDescription>
              Services included in this invoice
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Number</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-mono">{job.job_number}</TableCell>
                    <TableCell>{job.description || 'Process Service'}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(job.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {/* Invoice Totals */}
            <div className="mt-6 space-y-2 border-t pt-4">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.tax > 0 && (
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>{formatCurrency(invoice.tax)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
