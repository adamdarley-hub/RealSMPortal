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
      console.log('✅ Found recipient name in field:', field.trim());
      return field.trim();
    }
  }

  // If still nothing found, check if this is a mapped job from cache vs fresh data
  if (job._raw || job.raw_data) {
    const rawData = job._raw || job.raw_data;

    // Try ServeManager API raw fields
    const rawFields = [
      rawData?.recipient?.name,
      rawData?.recipient_name,
      rawData?.defendant_name,
      rawData?.service_to
    ];

    for (const field of rawFields) {
      if (field && typeof field === 'string' && field.trim()) {
        console.log('✅ Found recipient name in raw data:', field.trim());
        return field.trim();
      }
    }
  }

  // Debug log when no recipient name found
  console.error('❌ NO RECIPIENT NAME FOUND in any field for job:', {
    jobId: job.id,
    checkedFields: {
      recipient_name: job.recipient_name,
      defendant_name: job.defendant_name,
      raw_recipient_name: job.raw_data?.recipient?.name,
      all_keys: Object.keys(job)
    }
  });

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

  // Debug log to see what recipient data is available
  console.log('🔍 Recipient info extraction:', {
    jobId: job.id,
    raw_data_recipient: job.raw_data?.recipient,
    recipient_direct: (job as any).recipient,
    extractedInfo: info,
    foundFields: Object.keys(info)
  });

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
  // Check all possible address sources in priority order
  const possibleAddresses = [
    job.service_address,
    job.address,
    job.defendant_address,
    // Check raw data sources that ServeManager uses
    job.raw_data?.addresses?.[0],
    (job as any).addresses?.[0],
    // Check nested raw data
    job.raw_data?.service_address,
    job.raw_data?.defendant_address,
    job.raw_data?.address
  ];

  for (const address of possibleAddresses) {
    if (!address) continue;

    // If address is a string, return it directly
    if (typeof address === 'string' && address.trim()) {
      return address.trim();
    }

    // If address is an object, format it
    if (typeof address === 'object' && address) {
      const parts = [
        address.street || address.address1 || address.street1,
        address.street2 || address.address2
      ].filter(Boolean);

      const street = parts.join(' ');
      const cityState = [address.city, address.state].filter(Boolean).join(', ');
      const zip = address.zip || address.postal_code;

      const formattedAddress = [street, cityState, zip].filter(Boolean).join(', ');

      if (formattedAddress.trim()) {
        console.log('✅ Found service address:', formattedAddress);
        return formattedAddress;
      }
    }
  }

  // Debug log when no address found
  console.log('⚠️ No service address found for job:', {
    jobId: job.id,
    checkedFields: {
      service_address: job.service_address,
      address: job.address,
      defendant_address: job.defendant_address,
      raw_addresses: job.raw_data?.addresses,
      raw_service_address: job.raw_data?.service_address,
      all_keys: Object.keys(job)
    }
  });

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
    jobKeys: Object.keys(job),
    fullJobData: job // Log the full job data to understand structure
  });

  if (!job.attempts || !Array.isArray(job.attempts)) {
    console.log('❌ No attempts found or not array:', {
      attempts: job.attempts,
      hasAttempts: !!job.attempts,
      isArray: Array.isArray(job.attempts),
      jobDataStructure: job,
      possibleAttemptFields: {
        attempts: job.attempts,
        service_attempts: (job as any).service_attempts,
        jobAttempts: (job as any).job_attempts,
        serviceHistory: (job as any).service_history
      }
    });

    // Try alternative attempt field names that ServeManager might use
    const alternativeAttempts = (job as any).service_attempts || (job as any).job_attempts || (job as any).service_history;
    if (alternativeAttempts && Array.isArray(alternativeAttempts)) {
      console.log('✅ Found attempts in alternative field:', {
        fieldName: (job as any).service_attempts ? 'service_attempts' :
                   (job as any).job_attempts ? 'job_attempts' : 'service_history',
        attemptsCount: alternativeAttempts.length
      });
      // Use the alternative field temporarily
      job.attempts = alternativeAttempts;
    } else {
      return [];
    }
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
            .map((photo: any, photoIndex: number) => {
              // Use proxy URLs instead of direct S3 URLs to avoid expiration and CORS issues
              const proxyUrl = `/api/proxy/photo/${job.id}/${attempt.id}/${photo.id}`;

              return {
                id: photo.id,
                name: photo.title || photo.name || `Photo ${photoIndex + 1}`,
                url: proxyUrl,
                thumbnailUrl: proxyUrl, // Use same proxy URL for thumbnail
                type: photo.upload?.content_type || photo.content_type || 'image/jpeg',
                size: photo.upload?.file_size || photo.file_size,
                uploadedAt: photo.created_at || photo.updated_at
              };
            });
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
  const [dataSource, setDataSource] = useState<string>('unknown');
  const [serviceAttempts, setServiceAttempts] = useState<any[]>([]);
  const [activeJobTab, setActiveJobTab] = useState("job-info");
  const [activeMainTab, setActiveMainTab] = useState("overview");
  const [expandedAttempts, setExpandedAttempts] = useState<Set<string>>(new Set(['1'])); // First attempt expanded by default
  const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);
  const [currentDocumentIndex, setCurrentDocumentIndex] = useState(0);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [urlRefreshCount, setUrlRefreshCount] = useState(0);
  const [jobInvoices, setJobInvoices] = useState<any[]>([]);
  const [jobAffidavits, setJobAffidavits] = useState<any[]>([]);
  const [currentInvoiceIndex, setCurrentInvoiceIndex] = useState(0);
  const [currentAffidavitIndex, setCurrentAffidavitIndex] = useState(0);

  // No refresh needed - data is always fresh from ServeManager

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

        let response;
        let rawJobData;
        let dataSource = 'unknown';

        // Try fresh ServeManager API first
        try {
          console.log('🔄 Attempting to fetch fresh data from ServeManager...');
          response = await fetch(`/api/servemanager/jobs/${id}`);

          if (response.ok) {
            rawJobData = await response.json();
            dataSource = 'servemanager-fresh';
            console.log('✅ Successfully loaded fresh data from ServeManager');
          } else {
            throw new Error(`ServeManager API failed: ${response.status}`);
          }
        } catch (serveManagerError) {
          console.warn('⚠️ ServeManager API failed, falling back to cached data:', serveManagerError);

          // Fallback to cached data
          console.log('🔄 Falling back to cached data...');
          response = await fetch(`/api/jobs/${id}`);

          if (!response.ok) {
            throw new Error(`Both ServeManager API and cache failed. ServeManager: ${serveManagerError.message}, Cache: ${response.status}`);
          }

          rawJobData = await response.json();
          dataSource = 'cache-fallback';
          console.log('✅ Successfully loaded data from cache fallback');
        }
        // Handle both direct job data and wrapped responses
        const jobData = rawJobData.data || rawJobData;

        console.log('📄 Raw job data received:', {
          dataSource,
          id: jobData.id,
          jobNumber: jobData.job_number || jobData.generated_job_id,
          clientName: jobData.client_company || jobData.client_name,
          hasAttempts: !!jobData.attempts,
          attemptsLength: jobData.attempts?.length || 0,
          rawAttempts: jobData.attempts,
          jobKeys: Object.keys(jobData),
          isWrapped: !!rawJobData.data,
          rawDataStructure: Object.keys(rawJobData)
        });

        setJob(jobData);
        setDataSource(dataSource);

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

        console.log('������� Job data loaded:', {
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

  // Optimized: Load invoices and affidavits in parallel without blocking UI
  const loadJobInvoicesAndAffidavits = async (jobId: string) => {
    if (!jobId) {
      console.log('📋 No jobId provided for invoices/affidavits');
      return;
    }

    try {
      console.log('📋 Loading invoices and affidavits for job:', jobId);

      // Load both in parallel for instant tab switching
      const [invoicesResponse, affidavitsResponse] = await Promise.allSettled([
        fetch(`/api/jobs/${jobId}/invoices`).catch(err => {
          console.warn('🧾 Invoices fetch failed:', err);
          return { ok: false, status: 'network_error', error: err };
        }),
        fetch(`/api/jobs/${jobId}/affidavits`).catch(err => {
          console.warn('📜 Affidavits fetch failed:', err);
          return { ok: false, status: 'network_error', error: err };
        })
      ]);

      // Process invoices with enhanced error handling
      if (invoicesResponse.status === 'fulfilled' && invoicesResponse.value.ok) {
        try {
          const invoicesData = await invoicesResponse.value.json();
          setJobInvoices(invoicesData.invoices || []);
          setCurrentInvoiceIndex(0);
          console.log('✅ Invoices loaded:', invoicesData.invoices?.length || 0);
        } catch (jsonError) {
          console.warn('⚠️ Failed to parse invoices JSON:', jsonError);
          setJobInvoices([]);
        }
      } else {
        console.log('❌ Invoices request failed:', invoicesResponse);
        setJobInvoices([]);
      }

      // Process affidavits with enhanced error handling
      if (affidavitsResponse.status === 'fulfilled' && affidavitsResponse.value.ok) {
        try {
          const affidavitsData = await affidavitsResponse.value.json();
          setJobAffidavits(affidavitsData.affidavits || []);
          setCurrentAffidavitIndex(0);
          console.log('✅ Affidavits loaded:', affidavitsData.affidavits?.length || 0);
        } catch (jsonError) {
          console.warn('⚠️ Failed to parse affidavits JSON:', jsonError);
          setJobAffidavits([]);
        }
      } else {
        console.log('❌ Affidavits request failed:', affidavitsResponse);
        setJobAffidavits([]);
      }

    } catch (error) {
      console.error('❌ Critical error loading job invoices/affidavits:', error);
      // Ensure states are reset even on critical errors
      setJobInvoices([]);
      setJobAffidavits([]);
    }
  };

  // Load invoices and affidavits when the tab becomes active to prevent startup crashes
  useEffect(() => {
    if (!id) return;

    // Only load when invoices or affidavit tabs are active to prevent network errors on page load
    if (activeMainTab === 'invoices' || activeMainTab === 'affidavit') {
      loadJobInvoicesAndAffidavits(id);
    }
  }, [id, activeMainTab]);

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
      console.log('🔄 Refreshing job data to get fresh document URLs...');

      // Force fresh data from ServeManager
      const response = await fetch(`/api/servemanager/jobs/${id}?refresh=true&t=${Date.now()}`);

      if (response.ok) {
        const rawJobData = await response.json();
        const freshJobData = rawJobData.data || rawJobData;
        setJob(freshJobData);
        setDataSource('servemanager-fresh');
        setUrlRefreshCount(prev => prev + 1);
        console.log('✅ Job data refreshed with fresh URLs from ServeManager');

        // Re-extract service attempts
        const freshAttempts = extractServiceAttempts(freshJobData);
        setServiceAttempts(freshAttempts);

        // Always refresh invoices and affidavits for consistency
        loadJobInvoicesAndAffidavits(id);

        toast({
          title: "Updated",
          description: "Document links have been refreshed from ServeManager",
        });
      } else {
        // Fallback to forced cache refresh
        console.log('🔄 ServeManager refresh failed, trying cache refresh...');
        const cacheResponse = await fetch(`/api/jobs/${id}?refresh=true&t=${Date.now()}`);

        if (cacheResponse.ok) {
          const freshJobData = await cacheResponse.json();
          setJob(freshJobData);
          setDataSource('cache-refreshed');
          setUrlRefreshCount(prev => prev + 1);

          toast({
            title: "Updated",
            description: "Document links have been refreshed from cache",
          });
        }
      }
    } catch (error) {
      console.error('❌ Failed to refresh job data:', error);
      toast({
        title: "Error",
        description: "Failed to refresh document links. Please reload the page.",
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
                  {safeString((job as any).servemanager_job_number || job.job_number || job.generated_job_id, 'No Job Number')} - {safeString(job.client_company || job.client_name, 'Unknown Client')}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={getStatusColor(job.service_status || job.status || 'pending')}>
                {(job.service_status || job.status || 'pending').replace('_', ' ')}
              </Badge>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    {getRecipientName(job)}
                  </CardTitle>
                  <CardDescription>{safeString(job.service_status || job.status, 'Service')}</CardDescription>
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
                      <p className="text-sm text-slate-900">{safeString((job as any).servemanager_job_number || job.job_number, 'N/A')}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Client Job #</label>
                      <p className="text-sm text-slate-900">{safeString((job as any).client_job_number || job.reference || job.case_number || job.docket_number, 'N/A')}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Service Type</label>
                      <p className="text-sm text-slate-900">{safeString(job.service_status || job.status, 'Service')}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Priority</label>
                      <p className="text-sm text-slate-900">{(job.priority || 'routine').charAt(0).toUpperCase() + (job.priority || 'routine').slice(1).toLowerCase()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Attempts</label>
                      <p className="text-sm text-slate-900">{serviceAttempts.length}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Client</label>
                      <p className="text-sm text-slate-900">{safeString(job.client_company || job.client_name, 'Unknown Client')}</p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="recipient" className="space-y-4 mt-6">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Service Address - always show */}
                    <div>
                      <label className="text-sm font-medium text-slate-700">Service Address</label>
                      <div className="text-sm text-slate-900">
                        {getServiceAddressString(job)}
                      </div>
                    </div>

                    {/* Dynamic recipient fields - show all fields with values */}
                    {(() => {
                      const recipientInfo = getRecipientInfo(job);

                      // If no recipient info found, show at least the name
                      if (Object.keys(recipientInfo).length === 0) {
                        return (
                          <div>
                            <label className="text-sm font-medium text-slate-700">Recipient Name</label>
                            <p className="text-sm text-slate-900">{getRecipientName(job)}</p>
                          </div>
                        );
                      }

                      // Show all available recipient fields
                      return Object.entries(recipientInfo).map(([key, value]) => (
                        <div key={key}>
                          <label className="text-sm font-medium text-slate-700">{key}</label>
                          <p className="text-sm text-slate-900">{value}</p>
                        </div>
                      ));
                    })()}
                  </div>
                </TabsContent>
                
                <TabsContent value="court-timeline" className="space-y-4 mt-6">
                  <div className="grid grid-cols-2 gap-4">
                    {(() => {
                      // Get court case data from ServeManager structure
                      const courtCase = (job.raw_data as any)?.court_case || (job as any).court_case;
                      const elements = [];

                      // Court Case info with custom formatting
                      elements.push(
                        <div key="court-case">
                          <label className="text-sm font-medium text-slate-700">Court Case</label>
                          {getCourtCaseDisplay(job)}
                        </div>
                      );

                      // Case Number
                      const caseNumber = safeString(courtCase?.number || job.case_number || job.docket_number, '').trim();
                      if (caseNumber) {
                        elements.push(
                          <div key="case-number">
                            <label className="text-sm font-medium text-slate-700">Case Number</label>
                            <p className="text-sm text-slate-900">{caseNumber}</p>
                          </div>
                        );
                      }

                      // Court
                      const court = safeString(courtCase?.court || job.court, '').trim();
                      if (court) {
                        elements.push(
                          <div key="court">
                            <label className="text-sm font-medium text-slate-700">Court</label>
                            <p className="text-sm text-slate-900">{court}</p>
                          </div>
                        );
                      }

                      // Filed Date
                      const filedDate = courtCase?.filed_date;
                      if (filedDate) {
                        elements.push(
                          <div key="filed-date">
                            <label className="text-sm font-medium text-slate-700">Filed Date</label>
                            <p className="text-sm text-slate-900">{formatDate(filedDate)}</p>
                          </div>
                        );
                      }

                      // Court Date
                      const courtDate = courtCase?.court_date;
                      if (courtDate) {
                        elements.push(
                          <div key="court-date">
                            <label className="text-sm font-medium text-slate-700">Court Date</label>
                            <p className="text-sm text-slate-900">{formatDate(courtDate)}</p>
                          </div>
                        );
                      }

                      // Court information from ServeManager courts API structure
                      const courtInfo = (job.raw_data as any)?.court || (job as any).court || {};

                      // Branch Name
                      const branchName = safeString(
                        courtInfo?.branch_name ||
                        (job as any).branch_name ||
                        job.raw_data?.branch_name ||
                        '', ''
                      ).trim();
                      if (branchName) {
                        elements.push(
                          <div key="branch-name">
                            <label className="text-sm font-medium text-slate-700">Branch Name</label>
                            <p className="text-sm text-slate-900">{branchName}</p>
                          </div>
                        );
                      }

                      // County
                      const county = safeString(
                        courtInfo?.county ||
                        (job as any).county ||
                        job.raw_data?.county ||
                        '', ''
                      ).trim();
                      if (county) {
                        elements.push(
                          <div key="county">
                            <label className="text-sm font-medium text-slate-700">County</label>
                            <p className="text-sm text-slate-900">{county}</p>
                          </div>
                        );
                      }

                      // Court Address
                      const courtAddress = courtInfo?.address || (job as any).court_address;
                      if (courtAddress && typeof courtAddress === 'object') {
                        const addressParts = [
                          courtAddress.address1,
                          courtAddress.address2
                        ].filter(Boolean);

                        const street = addressParts.join(' ');
                        const cityState = [courtAddress.city, courtAddress.state].filter(Boolean).join(', ');
                        const zip = courtAddress.postal_code;

                        const formattedAddress = [street, cityState, zip].filter(Boolean).join(', ');

                        if (formattedAddress.trim()) {
                          elements.push(
                            <div key="court-address">
                              <label className="text-sm font-medium text-slate-700">Court Address</label>
                              <p className="text-sm text-slate-900">{formattedAddress}</p>
                            </div>
                          );
                        }
                      }

                      return elements;
                    })()}
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
                    // Debug: Log all possible document fields to understand the fresh API structure
                    console.log('📄 Document extraction debug:', {
                      jobId: job.id,
                      jobKeys: Object.keys(job),
                      raw_data: job.raw_data,
                      hasRawData: !!job.raw_data,
                      documents_to_be_served: job.documents_to_be_served,
                      attachments: (job as any).attachments,
                      documents: (job as any).documents,
                      files: (job as any).files,
                      uploads: (job as any).uploads,
                      paperwork: (job as any).paperwork,
                      job_documents: (job as any).job_documents
                    });

                    // Handle multiple possible data structures from cache vs fresh API
                    let documentsToBeServed =
                      job.raw_data?.documents_to_be_served ||  // Cached/mapped data
                      job.documents_to_be_served ||            // Direct field
                      job.data?.documents_to_be_served ||      // Fresh ServeManager API response
                      (job as any).attachments ||              // Alternative field name
                      (job as any).documents ||                // Alternative field name
                      (job as any).files ||                    // Alternative field name
                      (job as any).uploads ||                  // Alternative field name
                      (job as any).paperwork ||                // Alternative field name
                      (job as any).job_documents ||            // Alternative field name
                      [];

                    // Ensure it's an array
                    if (!Array.isArray(documentsToBeServed)) {
                      console.log('📄 Documents field is not an array:', documentsToBeServed);
                      documentsToBeServed = [];
                    }

                    console.log('📄 Final documents to be served:', {
                      count: documentsToBeServed.length,
                      documents: documentsToBeServed,
                      firstDocument: documentsToBeServed[0] || null
                    });

                    if (documentsToBeServed.length === 0) {
                      return (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="w-12 h-12 mx-auto mb-4" />
                          <p>No documents to be served</p>
                          <p className="text-xs text-gray-500 mt-2">
                            Job ID: {job.id}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              console.log('📄 Full job object for debugging:', job);
                            }}
                            className="gap-2 mt-2"
                          >
                            <Eye className="w-4 h-4" />
                            Debug Job Data
                          </Button>
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
                                    {document.id && (() => {
                                      // Check if document has a valid URL before showing view/download buttons
                                      const hasValidUrl = !!(
                                        document.upload?.links?.download_url ||
                                        document.upload?.download_url ||
                                        document.download_url ||
                                        document.links?.download_url ||
                                        document.url ||
                                        document.file_url
                                      );

                                      if (!hasValidUrl) {
                                        return (
                                          <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="bg-gray-50 text-gray-600">
                                              No File Attached
                                            </Badge>
                                          </div>
                                        );
                                      }

                                      return (
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
                                      );
                                    })()}
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

                                console.log('��� COMPREHENSIVE Document URL debug:', {
                                  documentTitle: currentDocument?.title,
                                  documentId: currentDocument?.id,
                                  documentUrl: documentUrl,
                                  hasUpload: !!currentDocument?.upload,
                                  hasUploadLinks: !!currentDocument?.upload?.links,
                                  hasLinks: !!currentDocument?.links,
                                  documentKeys: currentDocument ? Object.keys(currentDocument) : [],
                                  uploadKeys: currentDocument?.upload ? Object.keys(currentDocument.upload) : [],
                                  linksKeys: currentDocument?.links ? Object.keys(currentDocument.links) : [],
                                  fullDocument: currentDocument,
                                  dataSource: dataSource,
                                  allPossibleUrls: {
                                    'upload.links.download_url': currentDocument?.upload?.links?.download_url,
                                    'upload.download_url': currentDocument?.upload?.download_url,
                                    'download_url': currentDocument?.download_url,
                                    'links.download_url': currentDocument?.links?.download_url,
                                    'url': currentDocument?.url,
                                    'file_url': currentDocument?.file_url,
                                    'links.view': currentDocument?.links?.view,
                                    'links.preview': currentDocument?.links?.preview,
                                    'preview_url': currentDocument?.preview_url
                                  }
                                });

                                // If no URL found but we have a document ID, try using the proxy
                                if (!documentUrl && currentDocument?.id) {
                                  console.log('📄 No direct URL found, trying proxy approach...');
                                  return (
                                    <div className="relative w-full h-full">
                                      <iframe
                                        src={getPreviewUrl(currentDocument.id, job.id)}
                                        className="w-full h-full border-0"
                                        title={`Document: ${currentDocument.title}`}
                                        key={`${currentDocument.id}-${urlRefreshCount}`}
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
                                            <p className="text-xs text-gray-400">
                                              This document exists in ServeManager but has no file content
                                            </p>
                                          </>
                                        ) : (
                                          <>
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
                                          </>
                                        )}
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
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Invoices</CardTitle>
                      <CardDescription>Issued or paid invoices related to this job</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {jobInvoices.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <DollarSign className="w-12 h-12 mx-auto mb-4" />
                      <p>No issued or paid invoices for this job</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Only invoices with status 'issued' or 'paid' are displayed
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Invoice List */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Invoice Documents</h3>
                        <div className="space-y-4">
                          {jobInvoices.map((invoice, index) => (
                            <div key={invoice.id || index} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div className="space-y-2">
                                  <h4 className="font-medium text-lg">
                                    Invoice #{invoice.invoice_number || invoice.id}
                                  </h4>
                                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                    <Badge variant="outline" className={invoice.status === 'paid' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}>
                                      {invoice.status || 'issued'}
                                    </Badge>
                                    <span>Total: {formatCurrency(invoice.total || 0)}</span>
                                    {invoice.created_at && (
                                      <span>Created: {formatDate(invoice.created_at)}</span>
                                    )}
                                    {invoice.paid_at && (
                                      <span>Paid: {formatDate(invoice.paid_at)}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {currentInvoiceIndex === index && (
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                      Viewing
                                    </Badge>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentInvoiceIndex(index)}
                                    className="gap-2"
                                  >
                                    <Eye className="w-4 h-4" />
                                    View
                                  </Button>
                                  {invoice.pdf_url && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      asChild
                                      className="gap-2"
                                    >
                                      <a
                                        href={`/api/jobs/${job.id}/invoices/${invoice.id}/download`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <Download className="w-4 h-4" />
                                        Download
                                      </a>
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Invoice Viewer */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold">Invoice Viewer</h3>
                          {jobInvoices.length > 1 && (
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentInvoiceIndex(Math.max(0, currentInvoiceIndex - 1))}
                                disabled={currentInvoiceIndex === 0}
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </Button>
                              <span className="text-sm text-muted-foreground">
                                {currentInvoiceIndex + 1} of {jobInvoices.length}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentInvoiceIndex(Math.min(jobInvoices.length - 1, currentInvoiceIndex + 1))}
                                disabled={currentInvoiceIndex === jobInvoices.length - 1}
                              >
                                <ChevronRight className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>

                        <div className="border rounded-lg overflow-hidden" style={{ height: '600px' }}>
                          {(() => {
                            const currentInvoice = jobInvoices[currentInvoiceIndex];

                            if (!currentInvoice?.pdf_url && !currentInvoice?.id) {
                              return (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                  <div className="text-center space-y-4">
                                    <FileText className="w-12 h-12 mx-auto mb-4" />
                                    <p>Invoice preview not available</p>
                                    <p className="text-xs text-gray-500">
                                      Invoice: {currentInvoice?.invoice_number || 'Unknown'}
                                    </p>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div className="relative w-full h-full">
                                <iframe
                                  src={`/api/jobs/${job.id}/invoices/${currentInvoice.id}/preview`}
                                  className="w-full h-full border-0"
                                  title={`Invoice: ${currentInvoice.invoice_number || currentInvoice.id}`}
                                  key={`${currentInvoice.id}-${urlRefreshCount}`}
                                />
                                <div className="absolute top-2 right-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setUrlRefreshCount(prev => prev + 1)}
                                    className="gap-2 bg-white/90 backdrop-blur"
                                    title="Refresh invoice viewer"
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
                    </div>
                  )}
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
                          {jobAffidavits.map((affidavit, index) => (
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
                          <h3 className="text-lg font-semibold">Affidavit Viewer</h3>
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

                            return (
                              <div className="relative w-full h-full">
                                <iframe
                                  src={`/api/jobs/${job.id}/affidavits/${currentAffidavit.id}/preview`}
                                  className="w-full h-full border-0"
                                  title={`Affidavit: ${currentAffidavit.id}`}
                                  key={`${currentAffidavit.id}-${urlRefreshCount}`}
                                />
                                <div className="absolute top-2 right-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setUrlRefreshCount(prev => prev + 1)}
                                    className="gap-2 bg-white/90 backdrop-blur"
                                    title="Refresh affidavit viewer"
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
                    </div>
                  )}
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
