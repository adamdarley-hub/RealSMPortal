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

// Helper function to safely extract string values
const safeString = (value: any, fallback: string = ''): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'object' && value) {
    // Try common string properties but don't stringify the whole object
    return value.name || value.title || value.value || value.text || fallback;
  }
  return fallback;
};

// Helper function to safely extract recipient name from ServeManager recipient object
const getRecipientName = (job: Job): string => {
  // Check ALL possible places where recipient name could be stored
  const possibleFields = [
    job.recipient_name,
    job.defendant_name,
    (job as any).recipient?.name,
    job.raw_data?.recipient?.name,
    (job as any).service_to,
    (job as any).party_to_serve,
    (job as any).serve_to,
    // Try combining first and last names
    ((job as any).defendant_first_name && (job as any).defendant_last_name) ?
      `${(job as any).defendant_first_name} ${(job as any).defendant_last_name}`.trim() : null,
    ((job as any).first_name && (job as any).last_name) ?
      `${(job as any).first_name} ${(job as any).last_name}`.trim() : null
  ];

  // Return the first non-empty string found
  for (const field of possibleFields) {
    if (field && typeof field === 'string' && field.trim()) {
      return field.trim();
    }
  }

  return 'Unknown Recipient';
};

// Helper function to get recipient info only showing fields with values
const getRecipientInfo = (job: Job) => {
  // Try multiple sources for recipient data
  const recipient = job.raw_data?.recipient || (job as any).recipient || {};
  const info: { [key: string]: string } = {};

  // Add all fields that have non-null, non-empty values
  if (recipient.name && recipient.name.trim()) {
    info['Recipient Name'] = recipient.name.trim();
  }
  if (recipient.description && recipient.description.trim()) {
    info['Description'] = recipient.description.trim();
  }
  if (recipient.age && recipient.age.toString().trim()) {
    info['Age'] = recipient.age.toString();
  }
  if (recipient.ethnicity && recipient.ethnicity.trim()) {
    info['Ethnicity'] = recipient.ethnicity.trim();
  }
  if (recipient.gender && recipient.gender.trim()) {
    info['Gender'] = recipient.gender.trim();
  }
  if (recipient.weight && recipient.weight.toString().trim()) {
    info['Weight'] = recipient.weight.toString();
  }
  if (recipient.height1 || recipient.height2) {
    const height = [recipient.height1, recipient.height2].filter(Boolean).join("'") + '"';
    info['Height'] = height;
  }
  if (recipient.hair && recipient.hair.trim()) {
    info['Hair'] = recipient.hair.trim();
  }
  if (recipient.eyes && recipient.eyes.trim()) {
    info['Eyes'] = recipient.eyes.trim();
  }
  if (recipient.relationship && recipient.relationship.trim()) {
    info['Relationship'] = recipient.relationship.trim();
  }

  return info;
};

// Helper function to format court case with line breaks
const getCourtCaseDisplay = (job: Job) => {
  // Get court case data from the proper ServeManager court_case structure
  const courtCase = (job.raw_data as any)?.court_case || (job as any).court_case;

  const plaintiff = safeString(
    courtCase?.plaintiff ||
    job.plaintiff ||
    (job as any).plaintiff_name ||
    ''
  ).trim();

  const defendant = safeString(
    courtCase?.defendant ||
    getRecipientName(job) ||
    ''
  ).trim();

  // If we have both plaintiff and defendant, show with line breaks
  if (plaintiff && defendant && defendant !== 'Unknown Recipient') {
    return (
      <div className="text-sm text-slate-900">
        <div>{plaintiff}</div>
        <div>vs.</div>
        <div>{defendant}</div>
      </div>
    );
  }

  // If we only have plaintiff, show just plaintiff
  if (plaintiff) {
    return <div className="text-sm text-slate-900">{plaintiff}</div>;
  }

  // Try case number from court case structure first
  const caseNumber = safeString(
    courtCase?.number ||
    job.case_number ||
    job.docket_number ||
    ''
  ).trim();

  if (caseNumber) {
    return <div className="text-sm text-slate-900">{caseNumber}</div>;
  }

  return <div className="text-sm text-slate-900">N/A</div>;
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

// Helper function to format file sizes
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper function to get preview URL for inline viewing using fresh document fetch
const getPreviewUrl = (documentId: string | number, jobId: string): string => {
  if (!documentId || !jobId) return '';

  // Use fresh document endpoint that fetches current URLs from ServeManager
  return `/api/jobs/${jobId}/documents/${documentId}/preview`;
};

// Helper function to get download URL with fresh document fetch
const getProxyDownloadUrl = (documentId: string | number, jobId: string): string => {
  if (!documentId || !jobId) return '';

  // Use fresh document endpoint that fetches current URLs from ServeManager
  return `/api/jobs/${jobId}/documents/${documentId}/download`;
};

// Component for viewing images in a dialog
const ImageDialog = ({ src, alt, children }: { src: string; alt: string; children: React.ReactNode }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{alt}</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <img src={src} alt={alt} className="w-full h-auto" />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default function ClientJobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCards, setExpandedCards] = useState<{ [key: string]: boolean }>({});
  const [documentLoading, setDocumentLoading] = useState<{ [key: string]: boolean }>({});
  const [currentDocumentIndex, setCurrentDocumentIndex] = useState(0);
  const [jobAffidavits, setJobAffidavits] = useState<any[]>([]);
  const [currentAffidavitIndex, setCurrentAffidavitIndex] = useState(0);

  const loadJob = async (refresh = false) => {
    if (!id) return;
    
    setLoading(true);

    try {
      const url = refresh ? `/api/jobs/${id}?refresh=true` : `/api/jobs/${id}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to load job: ${response.statusText}`);
      }

      const jobData = await response.json();
      
      // Verify client has access to this job
      if (user?.client_id && jobData.client_id !== user.client_id) {
        throw new Error('You do not have access to this job');
      }
      
      setJob(jobData);

      // Load affidavits for this job
      loadJobAffidavits(id);
    } catch (error) {
      console.error("Error loading job:", error);
      toast({
        title: "Error loading job",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadJobAffidavits = async (jobId: string) => {
    if (!jobId) return;

    try {
      const response = await fetch(`/api/jobs/${jobId}/affidavits`);
      if (response.ok) {
        const data = await response.json();
        setJobAffidavits(data.affidavits || []);
        setCurrentAffidavitIndex(0);
        console.log('📜 Affidavits loaded:', data.affidavits?.length || 0);
      } else {
        console.warn('📜 Affidavits fetch failed:', response.status);
        setJobAffidavits([]);
      }
    } catch (error) {
      console.warn('📜 Affidavits fetch error:', error);
      setJobAffidavits([]);
    }
  };

  useEffect(() => {
    loadJob();
  }, [id, user?.client_id]);

  const toggleCard = (cardId: string) => {
    setExpandedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };


  if (loading) {
    return (
      <ClientLayout>
        <div className="container mx-auto p-6 space-y-6">
          <div className="animate-pulse space-y-6">
            <div className="flex items-center space-x-4">
              <div className="h-10 w-32 bg-gray-200 rounded"></div>
              <div className="h-8 w-48 bg-gray-200 rounded"></div>
            </div>
            <div className="h-48 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </ClientLayout>
    );
  }

  if (!job) {
    return (
      <ClientLayout>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Job Not Found</h2>
              <p className="text-gray-600 mb-6">
                The job you're looking for doesn't exist or you don't have permission to view it.
              </p>
              <Button onClick={() => navigate('/client')} className="mr-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <Button variant="outline" onClick={() => loadJob()}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </ClientLayout>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "served": 
      case "completed": 
        return "bg-green-100 text-green-800 border-green-200";
      case "in_progress": 
      case "assigned": 
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "attempted": 
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "pending": 
        return "bg-gray-100 text-gray-800 border-gray-200";
      default: 
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const recipientName = getRecipientName(job);
  const recipientInfo = getRecipientInfo(job);

  return (
    <ClientLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => navigate('/client')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Jobs
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{recipientName}</h1>
              <p className="text-gray-600">Job #{job.job_number || job.id}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Badge className={getStatusColor(job.status)}>
              {job.status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown'}
            </Badge>
            <Button variant="outline" onClick={() => loadJob(true)}>
              <Loader2 className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Job Overview Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">{job.service_type || 'Process Service'}</CardTitle>
                  <CardDescription>
                    Created {formatDate(job.created_at)} • Due {formatDate(job.due_date)}
                  </CardDescription>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">{formatCurrency(job.amount || job.price || job.total)}</p>
                <p className="text-sm text-gray-500">Service Fee</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="job-info" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="job-info">Job Information</TabsTrigger>
            <TabsTrigger value="recipient">Recipient Information</TabsTrigger>
            <TabsTrigger value="court-timeline">Court Case & Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="job-info">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Job Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Job Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Job ID</label>
                        <p className="text-sm">{job.job_number || job.id}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Status</label>
                        <p className="text-sm">{job.status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Priority</label>
                        <p className="text-sm">{job.priority?.replace(/\b\w/g, l => l.toUpperCase()) || 'Normal'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Service Type</label>
                        <p className="text-sm">{job.service_type || 'Process Service'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Created</label>
                        <p className="text-sm">{formatDateTime(job.created_at)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Due Date</label>
                        <p className="text-sm">{formatDateTime(job.due_date)}</p>
                      </div>
                    </div>
                    
                    {job.description && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Description</label>
                        <p className="text-sm mt-1">{job.description}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Service Address */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="w-5 h-5 mr-2" />
                    Service Address
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(() => {
                      const address = job.service_address || job.address || job.defendant_address;
                      if (address && typeof address === 'object') {
                        const parts = [];
                        if (address.street) parts.push(address.street);
                        if (address.street2) parts.push(address.street2);
                        if (address.city) parts.push(address.city);
                        if (address.state) parts.push(address.state);
                        if (address.zip) parts.push(address.zip);
                        
                        return parts.length > 0 ? (
                          <div>
                            {address.street && <p className="font-medium">{address.street}</p>}
                            {address.street2 && <p>{address.street2}</p>}
                            <p>{[address.city, address.state, address.zip].filter(Boolean).join(', ')}</p>
                          </div>
                        ) : <p className="text-gray-500">Address not available</p>;
                      }
                      return <p className="text-gray-500">Address not available</p>;
                    })()}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="recipient">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Recipient Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Name</label>
                    <p className="text-lg font-medium">{recipientName}</p>
                  </div>
                  
                  {Object.keys(recipientInfo).length > 0 && (
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(recipientInfo).map(([key, value]) => (
                        <div key={key}>
                          <label className="text-sm font-medium text-gray-500">{key}</label>
                          <p className="text-sm">{value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="court-timeline">
            <div className="space-y-6">
              {/* Court Case Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building className="w-5 h-5 mr-2" />
                    Court Case Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Case Details</label>
                      <div className="mt-1">
                        {getCourtCaseDisplay(job)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Service Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Calendar className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="font-medium">Job Created</p>
                        <p className="text-sm text-gray-500">{formatDateTime(job.created_at)}</p>
                      </div>
                    </div>
                    
                    {job.updated_at && job.updated_at !== job.created_at && (
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Clock className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="font-medium">Last Updated</p>
                          <p className="text-sm text-gray-500">{formatDateTime(job.updated_at)}</p>
                        </div>
                      </div>
                    )}

                    {(() => {
                      const attempts = job.attempts || (job as any).service_attempts || [];
                      if (Array.isArray(attempts) && attempts.length > 0) {
                        return attempts.map((attempt: any, index: number) => (
                          <div key={index} className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                            <Clock className="w-5 h-5 text-yellow-600" />
                            <div>
                              <p className="font-medium">Service Attempt #{index + 1}</p>
                              <p className="text-sm text-gray-500">
                                {attempt.date ? formatDateTime(attempt.date) : 'Date not available'}
                              </p>
                              {attempt.result && <p className="text-sm">{attempt.result}</p>}
                            </div>
                          </div>
                        ));
                      }
                      return (
                        <div className="text-center py-8 text-gray-500">
                          <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p>No service attempts recorded yet</p>
                        </div>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Secondary Tabs for Documents, etc. */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="affidavit">Affidavit</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Job Summary</CardTitle>
                <CardDescription>Complete overview of this service job</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500">Client</label>
                    <p className="font-medium">{job.client_name || 'N/A'}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500">Recipient</label>
                    <p className="font-medium">{recipientName}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500">Amount</label>
                    <p className="font-medium text-green-600">{formatCurrency(job.amount || job.price || job.total)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Documents</CardTitle>
                <CardDescription>Legal documents and attachments for this job</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  // Handle multiple possible data structures from cache vs fresh API
                  let documentsToBeServed = 
                    job.raw_data?.documents_to_be_served ||
                    job.documents_to_be_served ||
                    job.data?.documents_to_be_served ||
                    (job as any).attachments ||
                    (job as any).documents ||
                    (job as any).files ||
                    [];

                  // Ensure it's an array
                  if (!Array.isArray(documentsToBeServed)) {
                    documentsToBeServed = [];
                  }

                  // Filter out documents that have null/empty URLs
                  documentsToBeServed = documentsToBeServed.filter((document: any) => {
                    return !!(
                      document.upload?.links?.download_url ||
                      document.upload?.download_url ||
                      document.download_url ||
                      document.links?.download_url ||
                      document.url ||
                      document.file_url
                    );
                  });

                  if (documentsToBeServed.length === 0) {
                    return (
                      <div className="text-center py-8 text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium">No Service Documents Available</p>
                        <p className="text-sm mt-2">
                          This job does not have any service documents attached.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div>
                      {/* Document Viewer */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <h3 className="text-lg font-semibold">{getRecipientName(job)} - Service Documents</h3>
                            {documentsToBeServed.length > 1 && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                {currentDocumentIndex + 1} of {documentsToBeServed.length}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {documentsToBeServed.length > 1 && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setCurrentDocumentIndex(Math.max(0, currentDocumentIndex - 1))}
                                  disabled={currentDocumentIndex === 0}
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setCurrentDocumentIndex(Math.min(documentsToBeServed.length - 1, currentDocumentIndex + 1))}
                                  disabled={currentDocumentIndex === documentsToBeServed.length - 1}
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              className="gap-2"
                            >
                              <a
                                href={getProxyDownloadUrl(documentsToBeServed[currentDocumentIndex]?.id, job.id)}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Download className="w-4 h-4" />
                                Download
                              </a>
                            </Button>
                          </div>
                        </div>

                        <div className="border rounded-lg overflow-hidden" style={{ height: '600px' }}>
                          {(() => {
                            const currentDocument = documentsToBeServed[currentDocumentIndex];

                            // Comprehensive document URL detection for ServeManager API
                            const documentUrl =
                              currentDocument?.upload?.links?.download_url ||
                              currentDocument?.upload?.download_url ||
                              currentDocument?.download_url ||
                              currentDocument?.links?.download_url ||
                              currentDocument?.url ||
                              currentDocument?.file_url ||
                              currentDocument?.links?.view ||
                              currentDocument?.links?.preview ||
                              currentDocument?.preview_url;

                            // If no URL found but we have a document ID, try using the proxy
                            if (!documentUrl && currentDocument?.id) {
                              return (
                                <div className="relative w-full h-full">
                                  <iframe
                                    src={`${getPreviewUrl(currentDocument.id, job.id)}#navpanes=0`}
                                    className="w-full h-full border-0"
                                    title={`Document: ${currentDocument.title}`}
                                    key={`${currentDocument.id}-${currentDocumentIndex}`}
                                    onError={() => {
                                      console.error('📄 Iframe failed to load, trying alternative...');
                                    }}
                                  />
                                </div>
                              );
                            }

                            if (!documentUrl) {
                              // Check if this is a document without a file (null upload URL)
                              const hasNullUpload = currentDocument?.upload?.links?.download_url === null;

                              return (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                  <div className="text-center space-y-4">
                                    <FileText className="w-12 h-12 mx-auto mb-4" />
                                    {hasNullUpload ? (
                                      <>
                                        <p>No file attached to this document</p>
                                        <p className="text-xs text-gray-500">
                                          Document: {currentDocument?.title || 'Unknown'}
                                        </p>
                                      </>
                                    ) : (
                                      <>
                                        <p>Unable to load document preview</p>
                                        <p className="text-xs text-gray-500">
                                          Try downloading the document instead
                                        </p>
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            }

                            // Use iframe for PDF/document viewing with proxy URL
                            return (
                              <div className="relative w-full h-full">
                                <iframe
                                  src={`${getPreviewUrl(currentDocument.id, job.id)}#navpanes=0`}
                                  className="w-full h-full border-0"
                                  title={`Document: ${currentDocument.title}`}
                                  key={`${currentDocument.id}-${currentDocumentIndex}`}
                                />
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })()}
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
                <div className="text-center py-8 text-gray-500">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Invoice information will be displayed here when available</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="affidavit">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Affidavits</CardTitle>
                    <CardDescription>Signed affidavits of service for this job</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {jobAffidavits.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4" />
                    <p>No signed affidavits for this job</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Only signed affidavits are displayed
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Affidavit List */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Affidavit Documents</h3>
                      <div className="space-y-4">
                        {jobAffidavits.map((affidavit: any, index: number) => (
                          <div key={affidavit.id || index} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div className="space-y-2">
                                <h4 className="font-medium text-lg">
                                  Affidavit of Service
                                </h4>
                                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                  <Badge variant="outline" className="bg-green-50 text-green-700">
                                    Signed
                                  </Badge>
                                  {affidavit.signed_at && (
                                    <span>Signed: {formatDate(affidavit.signed_at)}</span>
                                  )}
                                  {affidavit.created_at && (
                                    <span>Created: {formatDate(affidavit.created_at)}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {currentAffidavitIndex === index && (
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                    Viewing
                                  </Badge>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setCurrentAffidavitIndex(index)}
                                  className="gap-2"
                                >
                                  <Eye className="w-4 h-4" />
                                  View
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  asChild
                                  className="gap-2"
                                >
                                  <a
                                    href={`/api/jobs/${job.id}/affidavits/${affidavit.id}/download`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Download className="w-4 h-4" />
                                    Download
                                  </a>
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Affidavit Viewer */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">{getRecipientName(job)} - Affidavit</h3>
                        {jobAffidavits.length > 1 && (
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentAffidavitIndex(Math.max(0, currentAffidavitIndex - 1))}
                              disabled={currentAffidavitIndex === 0}
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="text-sm text-muted-foreground">
                              {currentAffidavitIndex + 1} of {jobAffidavits.length}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentAffidavitIndex(Math.min(jobAffidavits.length - 1, currentAffidavitIndex + 1))}
                              disabled={currentAffidavitIndex === jobAffidavits.length - 1}
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="border rounded-lg overflow-hidden" style={{ height: '600px' }}>
                        {(() => {
                          const currentAffidavit = jobAffidavits[currentAffidavitIndex];

                          if (!currentAffidavit?.pdf_url && !currentAffidavit?.id) {
                            return (
                              <div className="flex items-center justify-center h-full text-muted-foreground">
                                <div className="text-center space-y-4">
                                  <FileText className="w-12 h-12 mx-auto mb-4" />
                                  <p>Affidavit preview not available</p>
                                  <p className="text-xs text-gray-500">
                                    Affidavit ID: {currentAffidavit?.id || 'Unknown'}
                                  </p>
                                </div>
                              </div>
                            );
                          }

                          // Use iframe for PDF viewing with proxy URL
                          return (
                            <div className="relative w-full h-full">
                              <iframe
                                src={`/api/jobs/${job.id}/affidavits/${currentAffidavit.id}/preview#navpanes=0`}
                                className="w-full h-full border-0"
                                title={`Affidavit: ${currentAffidavit.id}`}
                                key={`${currentAffidavit.id}-${currentAffidavitIndex}`}
                              />
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ClientLayout>
  );
}
