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

// Helper function to detect if attempt was via mobile app
const isMobileAttempt = (attempt: any): boolean => {
  // ServeManager API has a direct 'mobile' boolean field
  if (attempt.mobile === true) return true;
  if (attempt.mobile === false) return false;

  // Fallback to checking other fields if mobile field is not present
  const source = (attempt.source || '').toLowerCase();
  const method = (attempt.method || '').toLowerCase();
  const createdVia = (attempt.created_via || '').toLowerCase();
  const deviceType = (attempt.device_type || '').toLowerCase();

  return source.includes('mobile') ||
         source.includes('app') ||
         method.includes('mobile') ||
         method.includes('app') ||
         createdVia.includes('mobile') ||
         createdVia.includes('app') ||
         deviceType === 'mobile' ||
         deviceType === 'ios' ||
         deviceType === 'android';
};

// Helper function to get method display name and color
const getMethodDisplay = (attempt: any) => {
  const isMobile = isMobileAttempt(attempt);

  return {
    name: isMobile ? "Mobile App" : "Manual Entry",
    color: isMobile ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-gray-50 text-gray-700 border-gray-200",
    icon: isMobile ? "📱" : "💻"
  };
};

// Helper function to extract service attempts from job data
const extractServiceAttempts = (job: Job) => {
  if (!job.attempts || !Array.isArray(job.attempts)) {
    // Try alternative attempt field names that ServeManager might use
    const alternativeAttempts = (job as any).service_attempts || (job as any).job_attempts || (job as any).service_history;
    if (alternativeAttempts && Array.isArray(alternativeAttempts)) {
      job.attempts = alternativeAttempts;
    } else {
      return [];
    }
  }

  return job.attempts.map((attempt: any, index: number) => {
    // ServeManager attempt success detection based on serve_type field
    const serveType = attempt.serve_type || attempt.service_type || '';
    const successfulServeTypes = [
      "Authorized", "Business", "Corporation", "Government Agency", "Mail",
      "Personal/Individual", "Posted", "Registered Agent", "Secretary of State",
      "Substitute Service - Abode", "Substitute Service - Business", "Substitute Service - Personal"
    ];
    const unsuccessfulServeTypes = ["Bad Address", "Non-Service", "Unsuccessful Attempt"];

    let isSuccessful = false;

    if (successfulServeTypes.includes(serveType)) {
      isSuccessful = true;
    } else if (unsuccessfulServeTypes.includes(serveType)) {
      isSuccessful = false;
    } else {
      // Fallback to other detection methods if serve_type is not available
      isSuccessful = (
        attempt.success === true ||
        attempt.service_status === 'Served' ||
        attempt.served_at !== null && attempt.served_at !== undefined ||
        attempt.served === true ||
        attempt.status === 'served' ||
        attempt.status === 'Served'
      );
    }

    const methodDisplay = getMethodDisplay(attempt);

    return {
      id: attempt.id || index + 1,
      number: index + 1,
      status: isSuccessful ? "Successful" : "Unsuccessful Attempt",
      statusColor: isSuccessful ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800",
      date: formatDateTime(attempt.attempted_at || attempt.date || attempt.created_at),
      server: attempt.server_name || attempt.process_server || attempt.employee_name || "Unknown Server",
      method: methodDisplay.name,
      methodColor: methodDisplay.color,
      methodIcon: methodDisplay.icon,
      isMobileAttempt: isMobileAttempt(attempt),
      details: {
        serveType: attempt.serve_type || attempt.service_type || "Personal",
        serviceStatus: attempt.status || attempt.result || (isSuccessful ? "Served" : "Not Served"),
        recipient: (() => {
          if (attempt.recipient) {
            if (typeof attempt.recipient === 'string') return attempt.recipient;
            if (typeof attempt.recipient === 'object' && attempt.recipient.name) return attempt.recipient.name;
          }
          if (attempt.served_to && typeof attempt.served_to === 'string') return attempt.served_to;
          if (attempt.description && typeof attempt.description === 'string') return attempt.description;
          return "Unknown";
        })(),
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
        photos: (() => {
          // ServeManager stores photos in misc_attachments array
          const miscAttachments = attempt.misc_attachments || attempt.attachments || [];

          return miscAttachments
            .filter((attachment: any) => {
              // Check if it's an image attachment
              const isImage = attachment.upload?.content_type?.startsWith('image/') ||
                             attachment.upload?.file_name?.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) ||
                             attachment.content_type?.startsWith('image/') ||
                             attachment.file_name?.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i);

              const hasValidStructure = attachment.id &&
                                      (attachment.title || attachment.name) &&
                                      (attachment.upload?.links?.download_url || attachment.download_url || attachment.url);

              return isImage && hasValidStructure;
            })
            .map((photo: any, photoIndex: number) => {
              // Use proxy URLs instead of direct S3 URLs to avoid expiration and CORS issues
              const proxyUrl = `/api/proxy/photo/${job.id}/${attempt.id}/${photo.id}`;

              return {
                id: photo.id,
                name: photo.title || photo.name || `Photo ${photoIndex + 1}`,
                url: proxyUrl,
                thumbnailUrl: proxyUrl, // Use same proxy URL for thumbnail
                size: photo.upload?.size || photo.size || 0,
                mimeType: photo.upload?.content_type || photo.content_type || 'image/jpeg',
                uploadedAt: photo.created_at || photo.uploaded_at
              };
            });
        })(),
        gps: {
          latitude: attempt.latitude || attempt.lat || attempt.gps?.lat,
          longitude: attempt.longitude || attempt.lng || attempt.gps?.lng,
          accuracy: attempt.gps_accuracy || attempt.accuracy || attempt.gps?.accuracy,
          time: attempt.gps_time || attempt.location_time || attempt.gps?.timestamp
        }
      }
    };
  });
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
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);

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
      console.log('🔍 Access control check:', {
        userClientId: user?.client_id,
        jobClientId: jobData.client_id,
        userClientIdType: typeof user?.client_id,
        jobClientIdType: typeof jobData.client_id,
        match: user?.client_id == jobData.client_id,
        strictMatch: user?.client_id === jobData.client_id,
        jobData: {
          id: jobData.id,
          client_name: jobData.client_name,
          company: jobData.company
        }
      });

      if (user?.client_id && jobData.client_id && String(user.client_id) !== String(jobData.client_id)) {
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

              {/* Timeline - Simple version for Court Case tab */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Job Timeline
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
            <div className="space-y-6">
              {/* Job Summary */}
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

              {/* Service Attempts */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Service Attempts</CardTitle>
                      <CardDescription>History of service attempts for this job</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(() => {
                      const serviceAttempts = extractServiceAttempts(job);

                      if (serviceAttempts.length === 0) {
                        return (
                          <div className="text-center py-8 text-gray-500">
                            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p>No service attempts recorded yet</p>
                          </div>
                        );
                      }

                      return serviceAttempts.map((attempt: any) => (
                        <div key={attempt.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <h4 className="font-medium text-lg">Attempt #{attempt.number}</h4>
                              <Badge className={attempt.statusColor}>
                                {attempt.status}
                              </Badge>
                              <Badge variant="outline" className={attempt.methodColor}>
                                <span className="mr-1">{attempt.methodIcon}</span>
                                {attempt.method}
                              </Badge>
                              {attempt.details.photos.length > 0 && (
                                <Badge variant="outline" className="bg-purple-50 text-purple-700">
                                  <img className="w-3 h-3 mr-1" alt="" />
                                  {attempt.details.photos.length} photo{attempt.details.photos.length > 1 ? 's' : ''}
                                </Badge>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-500">{attempt.date}</p>
                              <div className="flex items-center text-sm text-gray-600">
                                {attempt.server}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4 border-t pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium text-gray-700">Serve Type</label>
                                <p className="text-sm text-gray-900">{attempt.details.serveType}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700">Service Status</label>
                                <p className="text-sm text-gray-900">{attempt.details.serviceStatus}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700">Recipient</label>
                                <p className="text-sm text-gray-900">{attempt.details.recipient}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700">Address</label>
                                <p className="text-sm text-gray-900">{attempt.details.address}</p>
                              </div>
                            </div>

                            <div>
                              <label className="text-sm font-medium text-gray-700">Service Description</label>
                              <div className="text-sm text-gray-900 mt-1 p-3 bg-gray-50 rounded-md">
                                {attempt.details.description}
                              </div>
                            </div>

                            {/* Attempt Photos - only in expanded view */}
                            {attempt.details.photos && attempt.details.photos.length > 0 && (
                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">Attempt Photos</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  {attempt.details.photos.map((photo: any) => (
                                    <div key={photo.id} className="border rounded-lg overflow-hidden group">
                                      <div
                                        className="relative cursor-pointer bg-gray-100"
                                        onClick={() => setSelectedPhoto(photo)}
                                      >
                                        <img
                                          src={photo.url}
                                          alt={photo.name}
                                          loading="lazy"
                                          className="w-full h-24 object-cover transition-transform group-hover:scale-105"
                                          onLoad={(e) => {
                                            // Remove loading background once image loads
                                            const parent = e.currentTarget.parentElement;
                                            if (parent) {
                                              parent.classList.remove('bg-gray-100');
                                            }
                                          }}
                                          onError={(e) => {
                                            // Hide broken images and their container
                                            const container = e.currentTarget.closest('.border');
                                            if (container) {
                                              container.style.display = 'none';
                                            }
                                          }}
                                        />
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                                          <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                        </div>
                                      </div>
                                      <div className="p-2">
                                        <p className="text-xs font-medium truncate" title={photo.name}>
                                          {photo.name}
                                        </p>
                                        {photo.size && (
                                          <p className="text-xs text-muted-foreground">
                                            {formatFileSize(photo.size)}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* GPS Information */}
                            {(attempt.details.gps.latitude || attempt.details.gps.longitude) && (
                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-3 block">Location</label>
                                <div className="grid grid-cols-2 gap-6">
                                  <div>
                                    <label className="text-sm font-medium text-gray-700">Latitude</label>
                                    <p className="text-sm text-gray-900">{attempt.details.gps.latitude || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-700">Longitude</label>
                                    <p className="text-sm text-gray-900">{attempt.details.gps.longitude || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-700">GPS Accuracy</label>
                                    <p className="text-sm text-gray-900">{attempt.details.gps.accuracy || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-700">GPS Time</label>
                                    <p className="text-sm text-gray-900">{attempt.details.gps.time ? formatDateTime(attempt.details.gps.time) : 'N/A'}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardContent className="pt-6">
                {(() => {
                  // Extract documents from all possible sources (same as admin view)
                  let documentsToBeServed = [];

                  // Check all document sources to match admin view behavior
                  if (job.documents && Array.isArray(job.documents)) {
                    documentsToBeServed.push(...job.documents);
                  }
                  if (job.attachments && Array.isArray(job.attachments)) {
                    documentsToBeServed.push(...job.attachments);
                  }
                  if (job.documents_to_be_served && Array.isArray(job.documents_to_be_served)) {
                    documentsToBeServed.push(...job.documents_to_be_served);
                  }
                  if (job.raw_data?.documents_to_be_served && Array.isArray(job.raw_data.documents_to_be_served)) {
                    documentsToBeServed.push(...job.raw_data.documents_to_be_served);
                  }
                  if ((job as any).files && Array.isArray((job as any).files)) {
                    documentsToBeServed.push(...(job as any).files);
                  }

                  console.log('📄 Client documents found:', {
                    total: documentsToBeServed.length,
                    sources: {
                      documents: job.documents?.length || 0,
                      attachments: job.attachments?.length || 0,
                      documents_to_be_served: job.documents_to_be_served?.length || 0,
                      raw_documents: job.raw_data?.documents_to_be_served?.length || 0,
                      files: (job as any).files?.length || 0
                    }
                  });

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
                            {documentsToBeServed.length > 1 && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                {currentDocumentIndex + 1} of {documentsToBeServed.length}
                              </Badge>
                            )}
                            {documentsToBeServed[currentDocumentIndex]?.title && (
                              <span className="text-sm font-medium text-gray-900">
                                {documentsToBeServed[currentDocumentIndex].title}
                              </span>
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
              <CardContent className="pt-6">
                <div className="text-center py-8 text-gray-500">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Invoice information will be displayed here when available</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="affidavit">
            <Card>
              <CardContent className="pt-6">
                {jobAffidavits.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4" />
                    <p>No signed affidavits for this job</p>
                  </div>
                ) : (
                  <div>
                    {/* Affidavit Viewer */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          {jobAffidavits.length > 1 && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                              {currentAffidavitIndex + 1} of {jobAffidavits.length}
                            </Badge>
                          )}
                          {jobAffidavits[currentAffidavitIndex]?.title && (
                            <span className="text-sm font-medium text-gray-900">
                              {jobAffidavits[currentAffidavitIndex].title}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {jobAffidavits.length > 1 && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentAffidavitIndex(Math.max(0, currentAffidavitIndex - 1))}
                                disabled={currentAffidavitIndex === 0}
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentAffidavitIndex(Math.min(jobAffidavits.length - 1, currentAffidavitIndex + 1))}
                                disabled={currentAffidavitIndex === jobAffidavits.length - 1}
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
                              href={`/api/jobs/${job.id}/affidavits/${jobAffidavits[currentAffidavitIndex]?.id}/download`}
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
                          const currentAffidavit = jobAffidavits[currentAffidavitIndex];

                          if (!currentAffidavit?.pdf_url && !currentAffidavit?.id) {
                            return (
                              <div className="flex items-center justify-center h-full text-muted-foreground">
                                <div className="text-center space-y-4">
                                  <FileText className="w-12 h-12 mx-auto mb-4" />
                                  <p>Affidavit preview not available</p>
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

      {/* Photo Modal */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              {selectedPhoto?.name || 'Service Attempt Photo'}
            </DialogTitle>
            {selectedPhoto?.uploadedAt && (
              <DialogDescription>
                Uploaded on {new Date(selectedPhoto.uploadedAt).toLocaleString()}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="flex items-center justify-center p-6 pt-0 max-h-[70vh]">
            {selectedPhoto && (
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.name}
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder.svg';
                }}
              />
            )}
          </div>

          {selectedPhoto && (
            <div className="px-6 pb-6 pt-0">
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {selectedPhoto.size && (
                  <span>Size: {formatFileSize(selectedPhoto.size)}</span>
                )}
                {selectedPhoto.mimeType && (
                  <span>Type: {selectedPhoto.mimeType}</span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="ml-auto"
                >
                  <a
                    href={selectedPhoto.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={selectedPhoto.name}
                  >
                    Download Original
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ClientLayout>
  );
}
