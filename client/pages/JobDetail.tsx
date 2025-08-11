import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
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
  // Try direct recipient_name field first
  if (job.recipient_name && typeof job.recipient_name === 'string') {
    return job.recipient_name;
  }

  // Try defendant name fields
  if (job.defendant_name && typeof job.defendant_name === 'string') {
    return job.defendant_name;
  }

  // Try extracting from raw data recipient object
  if (job.raw_data?.recipient && typeof job.raw_data.recipient === 'object') {
    const recipient = job.raw_data.recipient;
    if (recipient.name && typeof recipient.name === 'string') {
      return recipient.name;
    }
  }

  // Fallback
  return 'Unknown Recipient';
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

// Helper function to extract documents from job data
const extractDocuments = (job: Job) => {
  const documents = [];

  if (job.documents && Array.isArray(job.documents)) {
    documents.push(...job.documents);
  }

  if (job.attachments && Array.isArray(job.attachments)) {
    documents.push(...job.attachments);
  }

  return documents.map((doc: any, index: number) => ({
    id: doc.id || index,
    name: doc.name || doc.filename || doc.title || `Document ${index + 1}`,
    type: doc.type || doc.file_type || 'Unknown',
    url: doc.url || doc.download_url || doc.file_url,
    size: doc.size || doc.file_size,
    uploadedAt: doc.created_at || doc.uploaded_at
  }));
};

// Helper function to get service address as formatted string
const getServiceAddressString = (job: Job) => {
  const address = job.service_address || job.address || job.defendant_address;

  if (typeof address === 'string') return address;

  if (typeof address === 'object' && address) {
    const parts = [
      address.street || address.address1 || address.street1,
      address.street2 || address.address2
    ].filter(Boolean);

    const street = parts.join(' ');
    const cityState = [address.city, address.state].filter(Boolean).join(', ');
    const zip = address.zip || address.postal_code;

    return [street, cityState, zip].filter(Boolean).join(', ');
  }

  return 'No address available';
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

  // Debug log to understand actual attempt data
  console.log('🔍 Attempt data for method detection:', {
    mobile: attempt.mobile,  // ServeManager API field
    source: attempt.source,
    method: attempt.method,
    created_via: attempt.created_via,
    device_type: attempt.device_type,
    entry_method: attempt.entry_method,
    isMobile,
    allFields: Object.keys(attempt)
  });

  return {
    name: isMobile ? "Mobile App" : "Manual Entry",
    color: isMobile ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-gray-50 text-gray-700 border-gray-200",
    icon: isMobile ? "📱" : "���"
  };
};

// Helper function to extract service attempts from job data
const extractServiceAttempts = (job: Job) => {
  console.log('🔍 extractServiceAttempts called with:', {
    hasAttempts: !!job.attempts,
    attemptsType: typeof job.attempts,
    isArray: Array.isArray(job.attempts),
    attemptsLength: job.attempts?.length,
    jobId: job.id,
    jobKeys: Object.keys(job)
  });

  if (!job.attempts || !Array.isArray(job.attempts)) {
    console.log('❌ No attempts found or not array:', {
      attempts: job.attempts,
      hasAttempts: !!job.attempts,
      isArray: Array.isArray(job.attempts)
    });
    return [];
  }

  // Check if the overall job is served to help identify successful attempts
  const jobIsServed = (
    job.service_status === 'Served' ||
    job.service_status === 'served' ||
    job.status === 'Served' ||
    job.status === 'served'
  );

  return job.attempts.map((attempt: any, index: number) => {
    // Debug log for each attempt to understand status fields
    console.log(`🔍 Attempt ${index + 1} status analysis:`, {
      success: attempt.success,  // Primary field from API docs
      service_status: attempt.service_status,  // API docs show \"Served\"
      served_at: attempt.served_at,  // Timestamp when served
      mobile: attempt.mobile,  // Boolean for mobile vs manual
      allStatusFields: {
        success: attempt.success,
        service_status: attempt.service_status,
        served_at: attempt.served_at,
        served: attempt.served,
        status: attempt.status,
        result: attempt.result
      },
      allFields: Object.keys(attempt)
    });

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

    console.log(`🔍 Attempt ${index + 1} success detection:`, {
      serveType,
      isSuccessful,
      successfulTypes: successfulServeTypes,
      unsuccessfulTypes: unsuccessfulServeTypes
    });
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
      expanded: index === 0, // Expand first attempt by default
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

          // Comprehensive debug logging
          console.log(`🖼️ Attempt ${index + 1} FULL photo extraction debug:`, {
            attemptId: attempt.id,
            attemptKeys: Object.keys(attempt),
            hasMiscAttachments: !!attempt.misc_attachments,
            hasAttachments: !!attempt.attachments,
            miscAttachmentsLength: miscAttachments.length,
            miscAttachmentsRaw: miscAttachments,
            // Also check for other possible attachment fields
            photos: attempt.photos,
            images: attempt.images,
            files: attempt.files,
            attachments_detail: attempt.attachments,
            fullAttemptData: attempt
          });

          if (miscAttachments.length === 0) {
            console.log(`❌ No misc_attachments found for attempt ${index + 1}. Checking other fields...`);
            // Try other possible photo locations
            const alternativePhotos = attempt.photos || attempt.images || attempt.files || [];
            console.log(`🔍 Alternative photo sources:`, {
              photos: attempt.photos,
              images: attempt.images,
              files: attempt.files,
              alternativePhotosLength: alternativePhotos.length
            });
          }

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

              console.log(`📷 Attachment ${attachment.id} check:`, {
                attachment,
                isImage,
                hasValidStructure,
                contentType: attachment.upload?.content_type || attachment.content_type,
                fileName: attachment.upload?.file_name || attachment.file_name,
                downloadUrl: attachment.upload?.links?.download_url || attachment.download_url || attachment.url
              });

              return isImage && hasValidStructure;
            })
            .map((photo: any, photoIndex: number) => ({
              id: photo.id,
              name: photo.title || photo.name || `Photo ${photoIndex + 1}`,
              url: photo.upload?.links?.download_url || photo.download_url || photo.url,
              thumbnailUrl: photo.upload?.links?.thumbnail_url || photo.thumbnail_url || photo.upload?.links?.download_url || photo.download_url || photo.url,
              type: photo.upload?.content_type || photo.content_type || 'image/jpeg',
              size: photo.upload?.file_size || photo.file_size,
              uploadedAt: photo.created_at || photo.updated_at
            }));
        })(),
        gps: {
          latitude: attempt.lat || attempt.latitude || null,
          longitude: attempt.lng || attempt.longitude || null,
          accuracy: attempt.gps_accuracy ? `${attempt.gps_accuracy} ft` : (attempt.accuracy ? `${attempt.accuracy} ft` : null),
          time: formatDateTime(attempt.gps_timestamp || attempt.device_timestamp || attempt.gps_time || attempt.location_time || attempt.attempted_at)
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
  const [serviceAttempts, setServiceAttempts] = useState<any[]>([]);
  const [activeJobTab, setActiveJobTab] = useState("job-info");
  const [activeMainTab, setActiveMainTab] = useState("overview");
  const [expandedAttempts, setExpandedAttempts] = useState<Set<string>>(new Set(['1'])); // First attempt expanded by default
  const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);
  const [currentDocumentIndex, setCurrentDocumentIndex] = useState(0);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [urlRefreshCount, setUrlRefreshCount] = useState(0);

  // Simple manual refresh functionality
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    if (!id) return;

    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/jobs/${id}`);
      if (response.ok) {
        const freshJob = await response.json();
        const currentAttempts = extractServiceAttempts(job);
        const freshAttempts = extractServiceAttempts(freshJob);

        // Check for new attempts
        if (freshAttempts.length > currentAttempts.length) {
          const newAttemptCount = freshAttempts.length - currentAttempts.length;
          toast({
            title: "New Service Attempt!",
            description: `${newAttemptCount} new attempt(s) found`,
          });

          // Expand the newest attempt
          if (freshAttempts.length > 0) {
            const newestAttempt = freshAttempts[freshAttempts.length - 1];
            setExpandedAttempts(new Set([String(newestAttempt.id)]));
          }
        }

        setJob(freshJob);
        setServiceAttempts(freshAttempts);
        console.log('🔄 Job data refreshed manually');
      }
    } catch (error) {
      console.error('❌ Manual refresh failed:', error);
      toast({
        title: "Refresh Failed",
        description: "Could not refresh job data",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

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
        console.log(`🔍 Loading job ${id}...`);

        const response = await fetch(`/api/jobs/${id}`);

        if (!response.ok) {
          throw new Error(`Failed to load job: ${response.status}`);
        }

        const jobData = await response.json();
        console.log('📄 Raw job data received:', {
          id: jobData.id,
          jobNumber: jobData.job_number || jobData.generated_job_id,
          clientName: jobData.client_company || jobData.client_name,
          hasAttempts: !!jobData.attempts,
          attemptsLength: jobData.attempts?.length || 0,
          rawAttempts: jobData.attempts,
          jobKeys: Object.keys(jobData)
        });

        setJob(jobData);

        // Extract real service attempts from job data
        const realAttempts = extractServiceAttempts(jobData);
        console.log('🔍 Extracted service attempts:', {
          extractedCount: realAttempts.length,
          extractedAttempts: realAttempts,
          extractionInput: {
            hasAttempts: !!jobData.attempts,
            attemptsArray: jobData.attempts
          }
        });

        setServiceAttempts(realAttempts);

        // Expand first attempt by default to show photos
        if (realAttempts.length > 0) {
          setExpandedAttempts(new Set([String(realAttempts[0].id)]));
        }

        // Real-time updates are now handled by the useRealTimeJob hook
        console.log('🔌 Real-time monitoring enabled for instant updates');

        console.log('���� Job data loaded:', {
          jobId: jobData.id,
          attemptsFound: realAttempts.length,
          jobServiceStatus: jobData.service_status,
          jobStatus: jobData.job_status,
          jobOverallStatus: jobData.status,
          rawAttempts: jobData.attempts,
          extractedAttempts: realAttempts,
          hasPhotos: realAttempts.some(a => a.details.photos.length > 0),
          totalPhotos: realAttempts.reduce((sum, a) => sum + a.details.photos.length, 0)
        });
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

  // Listen for refresh messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'REFRESH_JOB') {
        console.log('🔄 Received refresh request from iframe');
        refreshJobData();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const toggleAttemptExpansion = (attemptId: string | number) => {
    const id = String(attemptId);
    setExpandedAttempts(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      return newExpanded;
    });
  };

  const isAttemptExpanded = (attemptId: string | number) => {
    return expandedAttempts.has(String(attemptId));
  };

  const handlePhotoClick = (photo: any, isMobileAttempt?: boolean) => {
    setSelectedPhoto({
      ...photo,
      isMobileAttempt: isMobileAttempt
    });
    setIsPhotoModalOpen(true);
  };

  const handlePrintJob = () => {
    setIsPrintMode(true);
    setTimeout(() => {
      window.print();
      setIsPrintMode(false);
    }, 100);
  };

  const refreshJobData = async () => {
    if (!id) return;

    try {
      console.log('🔄 Refreshing job data due to expired URLs...');
      const response = await fetch(`/api/jobs/${id}?refresh=true`);

      if (response.ok) {
        const freshJobData = await response.json();
        setJob(freshJobData);
        setUrlRefreshCount(prev => prev + 1);
        console.log('✅ Job data refreshed with fresh URLs');

        toast({
          title: "Updated",
          description: "Document links have been refreshed",
        });
      }
    } catch (error) {
      console.error('❌ Failed to refresh job data:', error);
      toast({
        title: "Error",
        description: "Failed to refresh document links. Please refresh the page.",
        variant: "destructive",
      });
    }
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
              {isRealTimeConnected ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  🔄 Auto-Refresh (5s)
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  🔄 Starting Monitor...
                </Badge>
              )}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Share className="w-4 h-4" />
                  Share
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Edit className="w-4 h-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={handlePrintJob}
                  disabled={isPrintMode}
                >
                  <Printer className="w-4 h-4" />
                  {isPrintMode ? 'Printing...' : 'Print Job'}
                </Button>
              </div>
            </div>
          </div>

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
                      <p className="text-sm text-slate-900">{serviceAttempts.length || job.attempt_count || 0}</p>
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
                      <p className="text-sm text-slate-900">{getRecipientName(job)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Service Address</label>
                      <div className="text-sm text-slate-900">
                        {getServiceAddressString(job)}
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
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Service Attempts</CardTitle>
                        <CardDescription>History of service attempts for this job</CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            console.log('🔄 Manual refresh triggered...');
                            const freshResponse = await fetch(`/api/jobs/${id}?refresh=true`);

                            if (freshResponse.ok) {
                              const freshJobData = await freshResponse.json();
                              const freshAttempts = extractServiceAttempts(freshJobData);

                              setJob(freshJobData);
                              setServiceAttempts(freshAttempts);

                              if (freshAttempts.length > 0) {
                                setExpandedAttempts(new Set([String(freshAttempts[0].id)]));
                              }

                              toast({
                                title: "Refreshed",
                                description: `Loaded ${freshAttempts.length} attempt(s) from server`,
                              });
                            }
                          } catch (error) {
                            toast({
                              title: "Error",
                              description: "Failed to refresh attempts",
                              variant: "destructive",
                            });
                          }
                        }}
                        className="gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Refresh
                      </Button>
                    </div>
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
                                {isAttemptExpanded(attempt.id) ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </Button>
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
                                  <ImageIcon className="w-3 h-3 mr-1" />
                                  {attempt.details.photos.length} photo{attempt.details.photos.length > 1 ? 's' : ''}
                                </Badge>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-slate-500">{attempt.date}</p>
                              <div className="flex items-center text-sm text-slate-600">
                                <User className="w-4 h-4 mr-1" />
                                {attempt.server}
                              </div>
                            </div>
                          </div>


                          {isAttemptExpanded(attempt.id) && (
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

                              {/* Attempt Photos - only in expanded view */}
                              {attempt.details.photos && attempt.details.photos.length > 0 && (
                                <div>
                                  <label className="text-sm font-medium text-slate-700 mb-2 block">Attempt Photos</label>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {attempt.details.photos.map((photo: any) => (
                                      <div key={photo.id} className="border rounded-lg overflow-hidden group">
                                        <div
                                          className="relative cursor-pointer"
                                          onClick={() => handlePhotoClick(photo, attempt.isMobileAttempt)}
                                        >
                                          <img
                                            src={`/api/proxy/photo/${job.id}/${attempt.id}/${photo.id}`}
                                            alt={photo.name}
                                            className="w-full h-24 object-cover transition-transform group-hover:scale-105"
                                            onError={(e) => {
                                              // Hide broken images and their container
                                              const container = e.currentTarget.closest('.border');
                                              if (container) {
                                                container.style.display = 'none';
                                              }
                                            }}
                                          />
                                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                              <Button size="sm" variant="secondary" className="gap-1">
                                                <Eye className="w-4 h-4" />
                                                View
                                              </Button>
                                            </div>
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

                              <div>
                                <label className="text-sm font-medium text-slate-700 mb-3 block">Location</label>
                                <div className="grid grid-cols-2 gap-6">
                                  <div>
                                    <label className="text-sm font-medium text-slate-700">Latitude</label>
                                    <p className="text-sm text-slate-900">{attempt.details.gps.latitude || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-slate-700">Longitude</label>
                                    <p className="text-sm text-slate-900">{attempt.details.gps.longitude || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-slate-700">GPS Accuracy</label>
                                    <p className="text-sm text-slate-900">{attempt.details.gps.accuracy || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-slate-700">GPS Time</label>
                                    <p className="text-sm text-slate-900">{attempt.details.gps.time || 'N/A'}</p>
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
                  <CardDescription>Legal documents and attachments for this job</CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    // Handle multiple possible data structures from cache vs fresh API
                    const documentsToBeServed =
                      job.raw_data?.documents_to_be_served ||  // Cached/mapped data
                      job.documents_to_be_served ||            // Direct field
                      job.data?.documents_to_be_served ||      // Fresh ServeManager API response
                      [];

                    if (documentsToBeServed.length === 0) {
                      return (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="w-12 h-12 mx-auto mb-4" />
                          <p>No documents to be served</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-6">
                        {/* Documents List */}
                        <div>
                          <h3 className="text-lg font-semibold mb-4">Documents to be Served</h3>
                          <p className="text-sm text-muted-foreground mb-4">Legal documents that need to be served to the recipient</p>

                          <div className="space-y-4">
                            {documentsToBeServed.map((document, index) => (
                              <div key={document.id || index} className="border rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                  <div className="space-y-2">
                                    <h4 className="font-medium text-lg">{document.title || 'Document'}</h4>
                                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                      {document.pages && (
                                        <span>{document.pages} page{document.pages > 1 ? 's' : ''}</span>
                                      )}
                                      {document.received_at && (
                                        <span>Received: {formatDate(document.received_at)}</span>
                                      )}
                                      {document.created_at && !document.received_at && (
                                        <span>Created: {formatDate(document.created_at)}</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    {currentDocumentIndex === index && (
                                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                        Viewing
                                      </Badge>
                                    )}
                                    {document.id && (
                                      <>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => setCurrentDocumentIndex(index)}
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
                                            href={getProxyDownloadUrl(document.id, job.id)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                          >
                                            <Download className="w-4 h-4" />
                                            Download
                                          </a>
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Document Viewer */}
                        {documentsToBeServed.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-lg font-semibold">Document Viewer</h3>
                              {documentsToBeServed.length > 1 && (
                                <div className="flex items-center space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentDocumentIndex(Math.max(0, currentDocumentIndex - 1))}
                                    disabled={currentDocumentIndex === 0}
                                  >
                                    <ChevronLeft className="w-4 h-4" />
                                  </Button>
                                  <span className="text-sm text-muted-foreground">
                                    {currentDocumentIndex + 1} of {documentsToBeServed.length}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentDocumentIndex(Math.min(documentsToBeServed.length - 1, currentDocumentIndex + 1))}
                                    disabled={currentDocumentIndex === documentsToBeServed.length - 1}
                                  >
                                    <ChevronRight className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </div>

                            <div className="border rounded-lg overflow-hidden" style={{ height: '600px' }}>
                              {(() => {
                                const currentDocument = documentsToBeServed[currentDocumentIndex];

                                // Try multiple possible URL paths
                                const documentUrl =
                                  currentDocument?.upload?.links?.download_url ||
                                  currentDocument?.upload?.download_url ||
                                  currentDocument?.download_url ||
                                  currentDocument?.links?.download_url ||
                                  currentDocument?.file_url;

                                console.log('📄 Document URL debug:', {
                                  documentTitle: currentDocument?.title,
                                  hasUpload: !!currentDocument?.upload,
                                  hasUploadLinks: !!currentDocument?.upload?.links,
                                  documentUrl: documentUrl,
                                  documentKeys: currentDocument ? Object.keys(currentDocument) : [],
                                  uploadKeys: currentDocument?.upload ? Object.keys(currentDocument.upload) : []
                                });

                                if (!documentUrl) {
                                  return (
                                    <div className="flex items-center justify-center h-full text-muted-foreground">
                                      <div className="text-center space-y-4">
                                        <FileText className="w-12 h-12 mx-auto mb-4" />
                                        <p>Document preview not available</p>
                                        <p className="text-xs text-gray-500">Document: {currentDocument?.title || 'Unknown'}</p>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={async () => {
                                            console.log('🔄 Force refreshing job data for fresh URLs...');
                                            await refreshJobData();
                                            // Force a short delay then reload
                                            setTimeout(() => window.location.reload(), 1000);
                                          }}
                                          className="gap-2"
                                        >
                                          <Download className="w-4 h-4" />
                                          Get Fresh URLs
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                }

                                return (
                                  <div className="relative w-full h-full">
                                    <iframe
                                      src={getPreviewUrl(currentDocument.id, job.id)}
                                      className="w-full h-full border-0"
                                      title={`Document: ${currentDocument.title}`}
                                      key={`${currentDocument.id}-${urlRefreshCount}`}
                                    />
                                    <div className="absolute top-2 right-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setUrlRefreshCount(prev => prev + 1);
                                          console.log('🔄 Refreshing document viewer...');
                                        }}
                                        className="gap-2 bg-white/90 backdrop-blur"
                                        title="Refresh document viewer"
                                      >
                                        <Download className="w-3 h-3" />
                                        Refresh
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        )}
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
                  {job.raw_data?.invoice ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                        <div>
                          <label className="text-sm font-medium text-slate-700">Invoice ID</label>
                          <p className="text-sm text-slate-900">{job.raw_data.invoice.id}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-700">Status</label>
                          <Badge variant="outline">{job.raw_data.invoice.status}</Badge>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-700">Subtotal</label>
                          <p className="text-sm text-slate-900">{formatCurrency(parseFloat(job.raw_data.invoice.subtotal))}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-700">Total</label>
                          <p className="text-sm text-slate-900 font-semibold">{formatCurrency(parseFloat(job.raw_data.invoice.total))}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-700">Balance Due</label>
                          <p className="text-sm text-slate-900">{formatCurrency(parseFloat(job.raw_data.invoice.balance_due))}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-700">Created</label>
                          <p className="text-sm text-slate-900">{formatDate(job.raw_data.invoice.created_at)}</p>
                        </div>
                      </div>

                      {job.raw_data.invoice.pdf_download_url && (
                        <div className="flex justify-center">
                          <Button asChild className="gap-2">
                            <a href={job.raw_data.invoice.pdf_download_url} target="_blank" rel="noopener noreferrer">
                              <FileText className="w-4 h-4" />
                              Download Invoice PDF
                            </a>
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <DollarSign className="w-12 h-12 mx-auto mb-4" />
                      <p>No invoices available for this job</p>
                    </div>
                  )}
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

      {/* Photo Modal */}
      <Dialog open={isPhotoModalOpen} onOpenChange={setIsPhotoModalOpen}>
        <DialogContent className="max-w-4xl w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{selectedPhoto?.name}</span>
                {selectedPhoto?.isMobileAttempt && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    📱 Mobile App
                  </Badge>
                )}
                {selectedPhoto?.isMobileAttempt === false && (
                  <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                    💻 Manual Entry
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {selectedPhoto?.url && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="gap-2"
                  >
                    <a
                      href={selectedPhoto.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={selectedPhoto.name}
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                  </Button>
                )}
              </div>
            </DialogTitle>
            <DialogDescription>
              {selectedPhoto?.uploadedAt && `Uploaded: ${formatDateTime(selectedPhoto.uploadedAt)}`}
              {selectedPhoto?.size && (
                <>
                  {selectedPhoto?.uploadedAt && ' • '}
                  Size: {formatFileSize(selectedPhoto.size)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center p-4">
            {selectedPhoto?.url && (
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.name}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
                onError={(e) => {
                  console.error('Failed to load image:', selectedPhoto.url);
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
