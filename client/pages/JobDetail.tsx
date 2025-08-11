import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Job } from "@shared/servemanager";

// Helper function to safely extract string values
const safeString = (value: any, fallback: string = ''): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'object' && value) {
    return value.name || value.title || value.value || value.text || String(value);
  }
  return fallback;
};

// Helper function to format currency
const formatCurrency = (amount: number | null | undefined) => {
  if (!amount) return "$0.00";
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

// Helper function to format date
const formatDate = (dateString: string | null) => {
  if (!dateString) return "No date";
  return new Date(dateString).toLocaleDateString();
};

// Helper function to format full date/time
const formatDateTime = (dateString: string | null) => {
  if (!dateString) return "No date";
  return new Date(dateString).toLocaleString();
};

// Helper to get status color
const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "served": return "bg-green-100 text-green-800";
    case "in_progress": return "bg-blue-100 text-blue-800";
    case "assigned": return "bg-yellow-100 text-yellow-800";
    case "pending": return "bg-gray-100 text-gray-800";
    case "not_served": return "bg-red-100 text-red-800";
    case "cancelled": return "bg-gray-100 text-gray-800";
    case "completed": return "bg-green-100 text-green-800";
    case "client hold": return "bg-orange-100 text-orange-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

// Helper to get priority color
const getPriorityColor = (priority: string) => {
  switch (priority.toLowerCase()) {
    case "rush": return "bg-red-100 text-red-800 border-red-200";
    case "routine": return "bg-blue-100 text-blue-800 border-blue-200";
    case "high": return "bg-orange-100 text-orange-800 border-orange-200";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

// Helper function to extract service attempts from job data
const extractServiceAttempts = (job: Job) => {
  if (!job.attempts || !Array.isArray(job.attempts)) {
    return [];
  }

  return job.attempts.map((attempt: any, index: number) => {
    const isSuccessful = attempt.served === true || attempt.status === 'served' || attempt.result === 'served';

    return {
      id: attempt.id || index + 1,
      number: index + 1,
      status: isSuccessful ? "Successful" : "Unsuccessful Attempt",
      statusColor: isSuccessful ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800",
      date: formatDateTime(attempt.attempted_at || attempt.date || attempt.created_at),
      server: attempt.server_name || attempt.process_server || attempt.employee_name || "Unknown Server",
      method: attempt.method || attempt.source || "Manual Entry",
      expanded: index === 0, // Expand first attempt by default
      details: {
        serveType: attempt.serve_type || attempt.service_type || "Personal",
        serviceStatus: attempt.status || attempt.result || (isSuccessful ? "Served" : "Not Served"),
        recipient: attempt.recipient || attempt.served_to || attempt.description || "Unknown",
        address: (() => {
          if (attempt.address) {
            if (typeof attempt.address === 'string') return attempt.address;
            if (typeof attempt.address === 'object') {
              return `${attempt.address.street || attempt.address.address1 || ''} ${attempt.address.street2 || ''}`.trim() +
                     `, ${attempt.address.city || ''}, ${attempt.address.state || ''} ${attempt.address.zip || attempt.address.postal_code || ''}`;
            }
          }
          return "Address not available";
        })(),
        description: attempt.notes || attempt.description || attempt.comments || "No additional details",
        photos: (attempt.attachments || attempt.photos || []).map((photo: any, photoIndex: number) => ({
          id: photo.id || photoIndex,
          name: photo.name || photo.filename || `Photo ${photoIndex + 1}`,
          url: photo.url || photo.download_url || photo.file_url
        })),
        gps: {
          latitude: attempt.latitude || attempt.lat || null,
          longitude: attempt.longitude || attempt.lng || null,
          accuracy: attempt.accuracy ? `${attempt.accuracy} ft` : "Unknown",
          time: formatDateTime(attempt.gps_time || attempt.location_time || attempt.attempted_at)
        }
      }
    };
  });
};

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serviceAttempts, setServiceAttempts] = useState(mockServiceAttempts);
  const [activeJobTab, setActiveJobTab] = useState("job-info");
  const [activeMainTab, setActiveMainTab] = useState("overview");

  // Load job data
  useEffect(() => {
    const loadJob = async () => {
      if (!id) {
        setError("No job ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`/api/jobs/${id}`);
        
        if (!response.ok) {
          throw new Error(`Failed to load job: ${response.status}`);
        }

        const jobData = await response.json();
        setJob(jobData);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load job';
        setError(errorMessage);
        console.error('Error loading job:', error);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadJob();
  }, [id, toast]);

  const toggleAttemptExpansion = (attemptId: number) => {
    setServiceAttempts(prev => 
      prev.map(attempt => 
        attempt.id === attemptId 
          ? { ...attempt, expanded: !attempt.expanded }
          : attempt
      )
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-6 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading job details...</span>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !job) {
    return (
      <Layout>
        <div className="p-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
                <h3 className="text-lg font-semibold">Job Not Found</h3>
                <p className="text-muted-foreground">{error || 'The requested job could not be found.'}</p>
                <Button onClick={() => navigate('/jobs')} className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Jobs
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <main className="p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/jobs')}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Jobs
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Job Details</h1>
                <p className="text-slate-600">
                  {safeString(job.job_number || job.generated_job_id, 'No Job Number')} - {safeString(job.client_company || job.client_name, 'Unknown Client')}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={getStatusColor(job.status || 'pending')}>
                {(job.status || 'pending').replace('_', ' ')}
              </Badge>
              <Button variant="outline" className="gap-2">
                <FileText className="w-4 h-4" />
                Print Job
              </Button>
            </div>
          </div>

          {/* Main Job Info Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    {safeString(job.client_company || job.client_name, 'Unknown Client')}
                  </CardTitle>
                  <CardDescription>{safeString(job.service_type || job.type, 'Service')}</CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{formatCurrency(job.amount || job.total || job.fee)}</p>
                  <p className="text-sm text-slate-500">Service Fee</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Job Information Tabs */}
              <Tabs value={activeJobTab} onValueChange={setActiveJobTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="job-info">Job Information</TabsTrigger>
                  <TabsTrigger value="recipient">Recipient Information</TabsTrigger>
                  <TabsTrigger value="court-timeline">Court Case & Timeline</TabsTrigger>
                </TabsList>
                
                <TabsContent value="job-info" className="space-y-4 mt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700">Job ID</label>
                      <p className="text-sm text-slate-900">{safeString(job.job_number || job.generated_job_id, 'N/A')}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Client Job #</label>
                      <p className="text-sm text-slate-900">{safeString(job.reference || job.client_job_number, 'N/A')}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Service Type</label>
                      <p className="text-sm text-slate-900">{safeString(job.service_type || job.type, 'Service')}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Priority</label>
                      <Badge variant="outline" className={getPriorityColor(job.priority || 'routine')}>
                        {job.priority || 'routine'}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Attempts</label>
                      <p className="text-sm text-slate-900">{job.attempt_count || serviceAttempts.length}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Client</label>
                      <p className="text-sm text-slate-900">{safeString(job.client_company || job.client_name, 'Unknown Client')}</p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="recipient" className="space-y-4 mt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700">Recipient Name</label>
                      <p className="text-sm text-slate-900">{safeString(job.recipient_name || job.defendant_name, 'Unknown')}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Service Address</label>
                      <div className="text-sm text-slate-900">
                        {(() => {
                          const address = job.service_address || job.address;
                          if (typeof address === 'object' && address) {
                            return `${address.address1 || address.street || ''} ${address.address2 || ''}`.trim() + 
                                   `, ${address.city || ''}, ${address.state || ''} ${address.postal_code || address.zip || ''}`;
                          }
                          return 'No address available';
                        })()}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Contact Phone</label>
                      <p className="text-sm text-slate-900">{safeString(job.client_phone, 'N/A')}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Contact Email</label>
                      <p className="text-sm text-slate-900">{safeString(job.client_email, 'N/A')}</p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="court-timeline" className="space-y-4 mt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700">Due Date</label>
                      <p className="text-sm text-slate-900">{formatDate(job.due_date)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Created Date</label>
                      <p className="text-sm text-slate-900">{formatDate(job.created_at)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Last Updated</label>
                      <p className="text-sm text-slate-900">{formatDate(job.updated_at)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Court Case</label>
                      <p className="text-sm text-slate-900">{safeString(job.case_number || job.docket_number, 'N/A')}</p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Main Content Tabs */}
          <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="affidavit">Affidavit</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-2">
              <div className="space-y-6">
                {/* Service Attempts */}
                <Card>
                  <CardHeader>
                    <CardTitle>Service Attempts</CardTitle>
                    <CardDescription>History of service attempts for this job</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {serviceAttempts.map((attempt) => (
                        <div key={attempt.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="p-1 h-8 w-8"
                                onClick={() => toggleAttemptExpansion(attempt.id)}
                              >
                                {attempt.expanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </Button>
                              <h4 className="font-medium text-lg">Attempt #{attempt.number}</h4>
                              <Badge className={attempt.statusColor}>
                                {attempt.status}
                              </Badge>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                {attempt.method}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-slate-500">{attempt.date}</p>
                              <div className="flex items-center text-sm text-slate-600">
                                <User className="w-4 h-4 mr-1" />
                                {attempt.server}
                              </div>
                            </div>
                          </div>

                          {attempt.expanded && (
                            <div className="space-y-4 border-t pt-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium text-slate-700">Serve Type</label>
                                  <p className="text-sm text-slate-900">{attempt.details.serveType}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-slate-700">Service Status</label>
                                  <p className="text-sm text-slate-900">{attempt.details.serviceStatus}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-slate-700">Recipient</label>
                                  <p className="text-sm text-slate-900">{attempt.details.recipient}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-slate-700">Address</label>
                                  <p className="text-sm text-slate-900">{attempt.details.address}</p>
                                </div>
                              </div>

                              <div>
                                <label className="text-sm font-medium text-slate-700">Service Description</label>
                                <div className="text-sm text-slate-900 mt-1 p-3 bg-slate-50 rounded-md">
                                  {attempt.details.description}
                                </div>
                              </div>

                              {attempt.details.photos.length > 0 && (
                                <div>
                                  <label className="text-sm font-medium text-slate-700 mb-2 block">Attempt Photos</label>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {attempt.details.photos.map((photo) => (
                                      <div key={photo.id} className="border rounded-lg overflow-hidden">
                                        <div className="group relative cursor-pointer">
                                          <img 
                                            src={photo.url} 
                                            alt={photo.name}
                                            className="w-full h-24 object-cover"
                                          />
                                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                                            <Button 
                                              variant="secondary" 
                                              size="sm"
                                              className="opacity-0 group-hover:opacity-100 transition-opacity gap-1"
                                            >
                                              <Eye className="w-4 h-4" />
                                              View
                                            </Button>
                                          </div>
                                        </div>
                                        <div className="p-2">
                                          <p className="text-xs font-medium truncate">{photo.name}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div>
                                <label className="text-sm font-medium text-slate-700">Location</label>
                                <div className="grid grid-cols-2 gap-4 mt-1">
                                  <div>
                                    <p className="text-xs text-slate-500">Latitude</p>
                                    <p className="text-sm">{attempt.details.gps.latitude}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-slate-500">Longitude</p>
                                    <p className="text-sm">{attempt.details.gps.longitude}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-slate-500">GPS Accuracy</p>
                                    <p className="text-sm">{attempt.details.gps.accuracy}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-slate-500">GPS Time</p>
                                    <p className="text-sm">{attempt.details.gps.time}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="documents">
              <Card>
                <CardHeader>
                  <CardTitle>Documents</CardTitle>
                  <CardDescription>Documents associated with this job</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4" />
                    <p>No documents available for this job</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invoices">
              <Card>
                <CardHeader>
                  <CardTitle>Invoices</CardTitle>
                  <CardDescription>Billing information for this job</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <DollarSign className="w-12 h-12 mx-auto mb-4" />
                    <p>No invoices available for this job</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="affidavit">
              <Card>
                <CardHeader>
                  <CardTitle>Affidavit</CardTitle>
                  <CardDescription>Affidavit of service for this job</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4" />
                    <p>No affidavit available for this job</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </Layout>
  );
}
