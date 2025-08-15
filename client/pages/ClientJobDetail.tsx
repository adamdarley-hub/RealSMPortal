import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from '@/contexts/AuthContext';
import ClientLayout from '@/components/ClientLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  FileText,
  ChevronDown,
  ChevronUp,
  User,
  MapPin,
  Eye,
  Loader2,
  AlertCircle,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Building,
  Clock,
  Download,
  Printer,
  Navigation,
  Image as ImageIcon,
  ExternalLink,
  Copy,
  Share,
  Edit,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Job } from "@shared/servemanager";

interface JobData {
  id: string;
  job_number: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  due_date: string;
  client_id: string;
  client_name: string;
  recipient_name: string;
  service_address?: any;
  address?: any;
  amount: number;
  description: string;
  service_type: string;
  attempts?: any[];
  documents?: any[];
  court_case_number?: string;
  [key: string]: any;
}

export default function ClientJobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [job, setJob] = useState<JobData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadJob = async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/jobs/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to load job details');
      }

      const data = await response.json();
      
      // Verify client has access to this job
      if (user?.client_id && data.client_id !== user.client_id) {
        throw new Error('You do not have access to this job');
      }
      
      setJob(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load job details';
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
    loadJob();
  }, [id, user?.client_id]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "served": case "completed": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "in_progress": case "assigned": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "attempted": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "pending": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFullAddress = (addressObj: any) => {
    if (!addressObj || typeof addressObj !== 'object') return 'Address not available';
    
    const parts = [];
    const street = addressObj.street || addressObj.street1 || addressObj.address || addressObj.line1;
    if (street) parts.push(street);
    
    const street2 = addressObj.street2 || addressObj.line2;
    if (street2) parts.push(street2);
    
    const city = addressObj.city || addressObj.locality;
    if (city) parts.push(city);
    
    const state = addressObj.state || addressObj.province;
    if (state) parts.push(state);
    
    const zip = addressObj.zip || addressObj.postal_code;
    if (zip) parts.push(zip);
    
    return parts.length > 0 ? parts.join(', ') : 'Address not available';
  };

  if (loading) {
    return (
      <ClientLayout>
        <div className="p-6 space-y-6">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-10 w-32" />
            <div>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64 mt-2" />
            </div>
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </ClientLayout>
    );
  }

  if (error || !job) {
    return (
      <ClientLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
                <h3 className="text-lg font-semibold">Unable to Load Job</h3>
                <p className="text-muted-foreground">{error || 'Job not found'}</p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => navigate('/client')} variant="outline">
                    Back to Dashboard
                  </Button>
                  <Button onClick={loadJob} className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Retry
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
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => navigate('/client')} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Jobs
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Job Details</h1>
              <p className="text-muted-foreground">
                {job.job_number} - {job.client_name}
              </p>
            </div>
          </div>
          <Badge className={getStatusColor(job.status)}>
            {job.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Badge>
        </div>

        {/* Job Overview Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {job.recipient_name}
                </CardTitle>
                <CardDescription>{job.service_type}</CardDescription>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">${job.amount?.toFixed(2) || '0.00'}</p>
                <p className="text-sm text-muted-foreground">Service Fee</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Job Details Tabs */}
        <Tabs defaultValue="details" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Job Details</TabsTrigger>
            <TabsTrigger value="recipient">Recipient Info</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Job Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Job ID</label>
                    <p className="text-sm">{job.job_number}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Service Type</label>
                    <p className="text-sm">{job.service_type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Priority</label>
                    <p className="text-sm">{job.priority?.replace(/\b\w/g, l => l.toUpperCase())}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <p className="text-sm">{job.status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Created</label>
                    <p className="text-sm">{formatDate(job.created_at)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Due Date</label>
                    <p className="text-sm">{job.due_date ? formatDate(job.due_date) : 'No deadline'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recipient" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recipient Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p className="text-sm">{job.recipient_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Service Address</label>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <p className="text-sm">{getFullAddress(job.service_address || job.address)}</p>
                    </div>
                  </div>
                  {job.description && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Description</label>
                      <p className="text-sm">{job.description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Service Timeline</CardTitle>
                <CardDescription>Timeline and attempts for this job</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Job Created</p>
                      <p className="text-sm text-muted-foreground">{formatDate(job.created_at)}</p>
                    </div>
                  </div>
                  
                  {job.attempts && job.attempts.length > 0 ? (
                    job.attempts.map((attempt: any, index: number) => (
                      <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                        <Clock className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Service Attempt #{index + 1}</p>
                          <p className="text-sm text-muted-foreground">
                            {attempt.date ? formatDate(attempt.date) : 'Date not available'}
                          </p>
                          {attempt.result && (
                            <p className="text-sm">{attempt.result}</p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No service attempts recorded yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ClientLayout>
  );
}
