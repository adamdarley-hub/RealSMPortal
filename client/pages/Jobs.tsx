import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FileText,
  Search,
  Filter,
  Plus,
  Calendar,
  MapPin,
  User,
  Loader2,
  RefreshCw,
  AlertCircle,
  Wifi,
  WifiOff,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAutoSync } from "@/hooks/use-auto-sync";
import { Job, JobsResponse, Client, Server, JobFilters } from "@shared/servemanager";

// Helper function to safely extract string values from potentially nested objects
const safeString = (value: any, fallback: string = ''): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'object' && value) {
    // Try common string properties
    return value.name || value.title || value.value || value.text || String(value);
  }
  return fallback;
};

// Helper function to format time ago
const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
};

type SortField = 'recipient' | 'client' | 'status' | 'priority' | 'server' | 'received_date';
type SortDirection = 'asc' | 'desc';

export default function Jobs() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<JobFilters>({
    limit: 50,
    offset: 0,
  });
  const [totalJobs, setTotalJobs] = useState(0);
  const [sortField, setSortField] = useState<SortField>('received_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const { toast } = useToast();

  // Pagination helpers
  const currentPage = Math.floor(filters.offset / filters.limit) + 1;
  const totalPages = Math.ceil(totalJobs / filters.limit);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  // Cache management
  const cacheRef = useRef<{
    jobs: Job[];
    clients: Client[];
    servers: Server[];
    timestamp: number;
    totalJobs: number;
    lastOffset: number;
    lastLimit: number;
  }>({
    jobs: [],
    clients: [],
    servers: [],
    timestamp: 0,
    totalJobs: 0,
    lastOffset: 0,
    lastLimit: 50
  });
  const CACHE_DURATION = 30000; // 30 seconds

  // Declare load functions first before using them in callbacks
  const loadJobs = useCallback(async (retryCount = 0, forceRefresh = false) => {
    // Check cache first (unless force refresh)
    const now = Date.now();
    const cache = cacheRef.current;

    // Cache is valid only if offset and limit match the current request
    const cacheValid = !forceRefresh &&
      cache.timestamp &&
      (now - cache.timestamp) < CACHE_DURATION &&
      cache.jobs.length > 0 &&
      cache.lastOffset === filters.offset &&
      cache.lastLimit === filters.limit;

    if (cacheValid) {
      const ageSeconds = Math.round((now - cache.timestamp) / 1000);
      console.log(`⚡ Using cached jobs data (${ageSeconds}s old) - Page ${currentPage} - INSTANT LOAD`);
      setJobs(cache.jobs);
      setTotalJobs(cache.totalJobs);
      setLoading(false);
      setError(null);
      setUsingMockData(false); // Reset mock state when using cache
      return;
    }

    setLoading(true);
    setError(null);

    const maxRetries = 3;
    const retryDelay = 1000 * (retryCount + 1); // 1s, 2s, 3s delays

    try {
      console.log('Loading ALL jobs (no backend filters - using frontend filtering)...');

      // Add timeout protection with better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('⏰ Request timeout after 15 seconds');
        controller.abort();
      }, 15000); // 15 second timeout (increased)

      try {
        // Use fast SQLite API with pagination
        const currentPageNum = Math.floor(filters.offset / filters.limit) + 1;
        const response = await fetch(`/api/jobs?limit=${filters.limit}&page=${currentPageNum}`, {
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          let errorMessage = 'Failed to load jobs';
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        const data: JobsResponse & { mock?: boolean; error?: string; pages_fetched?: number } = await response.json();

        if (!data || !Array.isArray(data.jobs)) {
          throw new Error('Invalid response format from server');
        }

        setJobs(data.jobs);
        setTotalJobs(data.total || data.jobs.length);
        setUsingMockData(!!data.mock);

        // Cache the results
        cacheRef.current = {
          jobs: data.jobs,
          clients: cacheRef.current.clients,
          servers: cacheRef.current.servers,
          timestamp: now,
          totalJobs: data.total || data.jobs.length,
          lastOffset: filters.offset,
          lastLimit: filters.limit
        };

        if (data.mock) {
          console.log('Using mock data due to API error:', data.error);
          toast({
            title: "Using Mock Data",
            description: "Could not connect to ServeManager, showing sample data",
            variant: "default",
          });
        } else {
          console.log(`✅ Loaded page ${currentPage} (${data.jobs.length} jobs) of ${data.total} total jobs in ${data.response_time_ms || 'unknown'}ms (cached for 30s)`);
        }

        // Clear any previous errors on success
        setError(null);

      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }

    } catch (error) {
      console.error(`Error loading jobs (attempt ${retryCount + 1}/${maxRetries + 1}):`, error);

      // Handle AbortError gracefully without retrying
      if (error.name === 'AbortError') {
        console.log('���️ Jobs request was aborted (likely due to timeout or navigation)');
        setLoading(false);
        return;
      }

      // If we haven't exhausted retries and it's a network error, try again
      if (retryCount < maxRetries && (
        error instanceof TypeError || // Network errors
        error.message.includes('Failed to fetch') ||
        error.message.includes('Supabase is not properly configured')
      )) {
        console.log(`Retrying in ${retryDelay}ms...`);
        setTimeout(() => {
          loadJobs(retryCount + 1);
        }, retryDelay);
        return; // Don't set loading to false or show error yet
      }

      // Final failure - show error
      const errorMessage = error instanceof Error ? error.message : 'Failed to load jobs';
      setError(errorMessage);

      toast({
        title: "Connection Error",
        description: `${errorMessage}. Please check your connection and try refreshing.`,
        variant: "destructive",
      });

      // Try legacy SQLite API as fallback
      try {
        console.log('Supabase failed, trying legacy SQLite...');
        const legacyResponse = await fetch('/api/jobs');
        if (legacyResponse.ok) {
          const legacyData = await legacyResponse.json();
          setJobs(legacyData.jobs || []);
          setTotalJobs(legacyData.total || 0);
          setUsingMockData(!!legacyData.mock);
          setError(null);
          toast({
            title: "Using Legacy Database",
            description: "Supabase unavailable, using slower SQLite fallback",
            variant: "default",
          });
        } else {
          // Final fallback to mock data
          const mockResponse = await fetch('/api/mock/jobs');
          if (mockResponse.ok) {
            const mockData = await mockResponse.json();
            setJobs(mockData.jobs || []);
            setTotalJobs(mockData.total || 0);
            setUsingMockData(true);
            setError(null);
          }
        }
      } catch (fallbackError) {
        console.error('All fallbacks failed:', fallbackError);
      }

    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadClients = useCallback(async (forceRefresh = false) => {
    // Check cache first
    const now = Date.now();
    const cache = cacheRef.current;

    if (!forceRefresh && cache.timestamp && (now - cache.timestamp) < CACHE_DURATION && cache.clients.length > 0) {
      console.log('⚡ Using cached clients data');
      setClients(cache.clients);
      return;
    }

    try {
      console.log('Loading ALL clients...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('⏰ Clients request timeout after 10 seconds');
        controller.abort();
      }, 10000); // Increased to 10 seconds

      const response = await fetch('/api/clients', {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setClients(data.clients || []);

        // Cache the results
        cacheRef.current.clients = data.clients || [];

        console.log(`Loaded ${data.total} total clients (cached for 30s)`);
      } else {
        throw new Error(`Failed to load clients: ${response.status}`);
      }
    } catch (error) {
      // Handle AbortError gracefully
      if (error.name === 'AbortError') {
        console.log('⚠️ Clients request was aborted (likely due to timeout or navigation)');
        return; // Don't try fallbacks for abort errors
      }

      console.error('Error loading clients:', error);
      // Try legacy API as fallback
      try {
        const legacyResponse = await fetch('/api/clients');
        if (legacyResponse.ok) {
          const legacyData = await legacyResponse.json();
          setClients(legacyData.clients || []);
          cacheRef.current.clients = legacyData.clients || [];
        } else {
          // Try mock clients as final fallback
          const mockResponse = await fetch('/api/mock/clients');
          if (mockResponse.ok) {
            const mockData = await mockResponse.json();
            setClients(mockData.clients || []);
            cacheRef.current.clients = mockData.clients || [];
          }
        }
      } catch (mockError) {
        console.error('All client fallbacks failed:', mockError);
      }
    }
  }, []);

  const loadServers = async (forceRefresh = false) => {
    // Check cache first
    const now = Date.now();
    const cache = cacheRef.current;

    if (!forceRefresh && cache.timestamp && (now - cache.timestamp) < CACHE_DURATION && cache.servers.length > 0) {
      console.log('⚡ Using cached servers data');
      setServers(cache.servers);
      return;
    }

    try {
      console.log('Loading ALL servers/employees...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('⏰ Servers request timeout after 10 seconds');
        controller.abort();
      }, 10000); // Increased to 10 seconds

      const response = await fetch('/api/servers', {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setServers(data.servers || []);

        // Cache the results
        cacheRef.current.servers = data.servers || [];

        console.log(`Loaded ${data.total} total servers (cached for 30s)`);
      } else {
        throw new Error(`Failed to load servers: ${response.status}`);
      }
    } catch (error) {
      // Handle AbortError gracefully
      if (error.name === 'AbortError') {
        console.log('⚠️ Servers request was aborted (likely due to timeout or navigation)');
        return; // Don't try fallbacks for abort errors
      }

      console.error('Error loading servers:', error);
      // Try legacy API as fallback
      try {
        const legacyResponse = await fetch('/api/servers');
        if (legacyResponse.ok) {
          const legacyData = await legacyResponse.json();
          setServers(legacyData.servers || []);
          cacheRef.current.servers = legacyData.servers || [];
        } else {
          // Try mock servers as final fallback
          const mockResponse = await fetch('/api/mock/servers');
          if (mockResponse.ok) {
            const mockData = await mockResponse.json();
            setServers(mockData.servers || []);
            cacheRef.current.servers = mockData.servers || [];
          }
        }
      } catch (mockError) {
        console.error('All server fallbacks failed:', mockError);
      }
    }
  };

  // Memoize the onDataUpdate callback - smart background refresh
  const onDataUpdate = useCallback(async () => {
    const now = Date.now();
    const cache = cacheRef.current;

    // Always do a silent background check for new data
    try {
      console.log('🔄 Silent background check for updates...');
      const response = await fetch('/api/jobs?limit=50');
      if (response.ok) {
        const data = await response.json();
        const newJobCount = data.total || 0;
        const cachedJobCount = cache.totalJobs;

        // If job count changed, update cache silently
        if (newJobCount !== cachedJobCount) {
          console.log(`📊 Job count changed: ${cachedJobCount} → ${newJobCount}. Updating cache silently.`);
          cacheRef.current = {
            jobs: data.jobs || [],
            clients: cache.clients,
            servers: cache.servers,
            timestamp: now,
            totalJobs: newJobCount
          };
          setJobs(data.jobs || []);
          setTotalJobs(newJobCount);

          // Show subtle notification
          toast({
            title: "Data Updated",
            description: `${newJobCount - cachedJobCount > 0 ? 'New' : 'Updated'} jobs detected`,
            duration: 2000, // Short duration
          });
        } else {
          console.log('📊 No changes detected in background check');
        }
      }
    } catch (error) {
      console.log('⚠️ Background check failed (non-blocking):', error.message);
    }
    // Note: This is silent and non-blocking - doesn't affect UI performance
  }, [toast]);

  // Smart auto-sync: enabled but non-blocking
  const { status: syncStatus, manualSync } = useAutoSync({
    enabled: true, // Re-enabled for data freshness awareness
    interval: 45000, // 45 seconds - balanced frequency
    onDataUpdate
  });

  // Load data on component mount with cleanup
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!isMounted) return;

      // Check if we have valid cache - if so, load instantly
      const now = Date.now();
      const cache = cacheRef.current;
      const hasValidCache = cache.timestamp && (now - cache.timestamp) < CACHE_DURATION && cache.jobs.length > 0;

      if (hasValidCache) {
        console.log('⚡ Instant load from cache - no network requests needed');
        setJobs(cache.jobs);
        setClients(cache.clients);
        setServers(cache.servers);
        setTotalJobs(cache.totalJobs);
        setLoading(false);
        setError(null);
        return; // Skip all network requests
      }

      // Only load from network if cache is invalid
      await loadJobs();
      if (!isMounted) return;

      await loadClients();
      if (!isMounted) return;

      await loadServers();
    };

    loadData();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [loadJobs, loadClients]);

  // Reload jobs when pagination changes
  useEffect(() => {
    console.log(`📄 Pagination changed to offset ${filters.offset}, page ${currentPage}, forcing reload...`);
    loadJobs(0, true); // Force refresh when pagination changes
  }, [filters.offset, loadJobs, currentPage]);

  const handleFilterChange = (key: keyof JobFilters, value: string | undefined) => {
    const newValue = value === 'all' ? undefined : value;
    console.log(`Filter changed: ${key} = ${newValue}`);
    setFilters(prev => ({
      ...prev,
      [key]: newValue,
      offset: 0, // Reset to first page when filtering
    }));
  };

  const clearFilters = () => {
    setFilters({
      limit: 50,
      offset: 0,
    });
    setSearchTerm("");
  };

  // Pagination functions
  const goToNextPage = () => {
    if (hasNextPage) {
      console.log(`🔄 Going to next page: ${currentPage} → ${currentPage + 1}`);
      setFilters(prev => ({
        ...prev,
        offset: prev.offset + prev.limit
      }));
    }
  };

  const goToPrevPage = () => {
    if (hasPrevPage) {
      console.log(`🔄 Going to previous page: ${currentPage} → ${currentPage - 1}`);
      setFilters(prev => ({
        ...prev,
        offset: Math.max(0, prev.offset - prev.limit)
      }));
    }
  };

  const goToFirstPage = () => {
    console.log(`🔄 Going to first page: ${currentPage} → 1`);
    setFilters(prev => ({
      ...prev,
      offset: 0
    }));
  };

  const goToLastPage = () => {
    console.log(`🔄 Going to last page: ${currentPage} → ${totalPages}`);
    setFilters(prev => ({
      ...prev,
      offset: (totalPages - 1) * prev.limit
    }));
  };

  const refreshJobs = async () => {
    console.log('🔄 Refreshing jobs...');
    setLoading(true);
    try {
      // Trigger manual sync and reload with force refresh
      manualSync();
      await loadJobs(0, true); // Force refresh jobs
      toast({
        title: "Refreshed",
        description: "Job data has been refreshed successfully",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Could not refresh job data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "served": return "bg-success text-success-foreground";
      case "in_progress": return "bg-info text-info-foreground";
      case "assigned": return "bg-warning text-warning-foreground";
      case "pending": return "bg-muted text-muted-foreground";
      case "not_served": return "bg-destructive text-destructive-foreground";
      case "cancelled": return "bg-secondary text-secondary-foreground";
      case "completed": return "bg-success text-success-foreground";
      case "Client Hold": return "bg-orange-500 text-white";
      case "unassigned": return "bg-blue-500 text-white"; // New/Unassigned jobs
      case "": return "bg-blue-500 text-white"; // Handle actual empty status from API
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "rush": return "bg-destructive text-destructive-foreground border-destructive";
      case "routine": return "bg-muted text-muted-foreground border-muted";
      case "high": return "bg-warning text-warning-foreground border-warning";
      case "medium": return "bg-info text-info-foreground border-info";
      case "low": return "bg-success text-success-foreground border-success";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No due date";
    return new Date(dateString).toLocaleDateString();
  };

  const formatReceivedDate = (dateString: string | null) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ?
      <ChevronUp className="w-4 h-4" /> :
      <ChevronDown className="w-4 h-4" />;
  };

  const getSortableValue = (job: Job, field: SortField): string => {
    switch (field) {
      case 'recipient':
        return (job.recipient_name || job.defendant_name || job.recipient?.name || 'Unknown Recipient').toLowerCase();
      case 'client':
        const clientCompany = typeof job.client_company === 'string' ? job.client_company :
                             typeof job.client?.company === 'string' ? job.client.company :
                             job.client?.name?.company || job.client?.name;
        const clientName = typeof job.client_name === 'string' ? job.client_name :
                         typeof job.client?.name === 'string' ? job.client.name :
                         job.client?.name?.name;
        return (clientCompany || clientName || 'Unknown Client').toLowerCase();
      case 'status':
        return (job.status || 'pending').toLowerCase();
      case 'priority':
        return (job.priority || 'medium').toLowerCase();
      case 'server':
        const serverName = typeof job.server_name === 'string' ? job.server_name :
                         typeof job.assigned_server === 'string' ? job.assigned_server :
                         typeof job.server?.name === 'string' ? job.server.name :
                         job.server?.name?.name;
        return (serverName || 'unassigned').toLowerCase();
      case 'received_date':
        return job.created_at || job.received_date || '';
      default:
        return '';
    }
  };

  // Pagination controls component
  const PaginationControls = () => {
    // Safety check for division by zero
    const safeTotalPages = Math.max(1, Math.ceil(totalJobs / Math.max(1, filters.limit)));
    const safeCurrentPage = Math.max(1, Math.floor(filters.offset / Math.max(1, filters.limit)) + 1);

    return (
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {Math.min(filters.offset + 1, totalJobs)} to {Math.min(filters.offset + filters.limit, totalJobs)} of {totalJobs} jobs
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToFirstPage}
            disabled={!hasPrevPage || loading}
          >
            First
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToPrevPage}
            disabled={!hasPrevPage || loading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <div className="text-sm text-muted-foreground">
            Page {safeCurrentPage} of {safeTotalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={!hasNextPage || loading}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToLastPage}
            disabled={!hasNextPage || loading}
          >
            Last
          </Button>
        </div>
      </div>
    );
  };

  // Filter and sort jobs
  const filteredAndSortedJobs = (jobs || []).filter(job => {
    // Search filter
    const matchesSearch = !searchTerm || (
      safeString(job.job_number || job.generated_job_id || job.reference).toLowerCase().includes(searchTerm.toLowerCase()) ||
      safeString(job.client?.name || job.client_name || job.client_company).toLowerCase().includes(searchTerm.toLowerCase()) ||
      safeString(job.recipient?.name || job.recipient_name || job.defendant_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
      safeString(job.description || job.notes).toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Status filter
    const matchesStatus = !filters.status || filters.status === 'all' ||
      (filters.status === 'unassigned' && (job.status === '' || !job.status)) ||
      job.status === filters.status;

    // Priority filter
    const matchesPriority = !filters.priority || filters.priority === 'all' || job.priority === filters.priority;

    // Client filter
    const matchesClient = !filters.client_id || filters.client_id === 'all' || job.client_id === filters.client_id;

    // Server filter
    const matchesServer = !filters.server_id || filters.server_id === 'all' ||
      (filters.server_id === 'unassigned' && (!job.server_id || job.server_id === '')) ||
      job.server_id === filters.server_id;

    const result = matchesSearch && matchesStatus && matchesPriority && matchesClient && matchesServer;

    // Debug first job that gets filtered
    if (job === jobs[0] && (filters.status || filters.priority || filters.client_id || filters.server_id || searchTerm)) {
      console.log(`Filter debug for job ${job.id}:`, {
        job: {
          status: job.status,
          priority: job.priority,
          client_id: job.client_id,
          server_id: job.server_id
        },
        filters,
        searchTerm,
        matches: {
          search: matchesSearch,
          status: matchesStatus,
          priority: matchesPriority,
          client: matchesClient,
          server: matchesServer,
          result
        }
      });
    }

    return result;
  }).sort((a, b) => {
    const aValue = getSortableValue(a, sortField);
    const bValue = getSortableValue(b, sortField);

    if (sortField === 'received_date') {
      // For dates, convert to timestamps for proper sorting
      const aDate = new Date(aValue).getTime() || 0;
      const bDate = new Date(bValue).getTime() || 0;
      return sortDirection === 'asc' ? aDate - bDate : bDate - aDate;
    }

    // For strings, use localeCompare
    const comparison = aValue.localeCompare(bValue);
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  if (error) {
    return (
      <Layout>
        <div className="p-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
                <h3 className="text-lg font-semibold">Unable to Load Jobs</h3>
                <p className="text-muted-foreground">{error}</p>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    To get started:
                  </p>
                  <ol className="text-sm text-muted-foreground text-left space-y-1 max-w-md mx-auto">
                    <li>1. Go to Settings → API Configuration</li>
                    <li>2. Enable ServeManager integration</li>
                    <li>3. Enter your API credentials</li>
                    <li>4. Test the connection</li>
                    <li>5. Save your configuration</li>
                  </ol>
                </div>
                <div className="flex gap-2 justify-center">
                  <Button onClick={loadJobs} variant="outline" className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Retry
                  </Button>
                  <Button asChild className="gap-2">
                    <a href="/settings">
                      Go to Settings
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-8 h-8" />
              Job Management
            </h1>
            <p className="text-muted-foreground">
              Manage all process service jobs and track their progress
            </p>
            {/* Cache status indicator with staleness awareness */}
            {cacheRef.current.timestamp > 0 && (
              <div className="text-xs flex items-center gap-1 mt-1">
                {(() => {
                  const ageSeconds = Math.round((Date.now() - cacheRef.current.timestamp) / 1000);
                  const isStale = ageSeconds > 60; // Consider stale after 1 minute
                  return (
                    <>
                      <span className={`w-2 h-2 rounded-full ${isStale ? 'bg-orange-500' : 'bg-green-500'} ${!isStale ? 'animate-pulse' : ''}`}></span>
                      <span className={isStale ? 'text-orange-600' : 'text-green-600'}>
                        {isStale ? '🔄 Data may be stale' : '⚡ Instant Load'} - Cached data ({ageSeconds}s old)
                      </span>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {/* Real-time sync status indicator */}
            <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-sm">
              {syncStatus.error ? (
                <AlertCircle className="w-4 h-4 text-orange-500" />
              ) : syncStatus.isPolling ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
              <span className="text-xs">
                {syncStatus.isSyncing ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Syncing...
                  </span>
                ) : syncStatus.error ? (
                  <span className="text-red-500" title={syncStatus.error}>
                    Sync error
                  </span>
                ) : syncStatus.lastSync ? (
                  `Updated ${formatTimeAgo(syncStatus.lastSync)}`
                ) : (
                  'Not synced'
                )}
              </span>
            </div>

            {usingMockData && (
              <Button
                onClick={() => window.open('/api/debug/servemanager', '_blank')}
                variant="secondary"
                className="gap-2"
              >
                <AlertCircle className="w-4 h-4" />
                Debug API
              </Button>
            )}
            <Button
              onClick={refreshJobs}
              variant={(() => {
                const ageSeconds = Math.round((Date.now() - cacheRef.current.timestamp) / 1000);
                return ageSeconds > 60 ? "default" : "outline"; // Prominent when stale
              })()}
              className="gap-2"
              disabled={syncStatus.isSyncing}
            >
              <RefreshCw className={`w-4 h-4 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
              Refresh{(() => {
                const ageSeconds = Math.round((Date.now() - cacheRef.current.timestamp) / 1000);
                return ageSeconds > 60 ? ' (Recommended)' : '';
              })()}
            </Button>
            <Button
              onClick={async () => {
                console.log('🔄 Quick refresh - invalidating cache...');
                setLoading(true);
                try {
                  // Simply clear cache and reload - no expensive backend operations
                  cacheRef.current.timestamp = 0;

                  // Quick reload from cached API
                  await loadJobs(0, true);

                  toast({
                    title: "Cache Cleared",
                    description: "Data reloaded from cache",
                  });
                } catch (error) {
                  console.error('❌ Refresh failed:', error);
                  toast({
                    title: "Refresh Failed",
                    description: "Could not reload data",
                    variant: "destructive"
                  });
                } finally {
                  setLoading(false);
                }
              }}
              variant="outline"
              className="gap-2"
              disabled={syncStatus.isSyncing || loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Clear Cache
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  New Job
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Job</DialogTitle>
                  <DialogDescription>
                    Job creation form coming soon...
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Mock Data Warning */}
        {usingMockData && (
          <Alert className="border-warning bg-warning/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Using Demo Data:</strong> ServeManager API is not responding. Showing sample data for demonstration.
              <Button variant="link" className="p-0 h-auto font-normal" asChild>
                <a href="/settings" className="underline">Configure API settings</a>
              </Button> or
              <Button
                variant="link"
                className="p-0 h-auto font-normal underline ml-1"
                onClick={() => window.open('/api/debug/servemanager', '_blank')}
              >
                debug the connection
              </Button>.
            </AlertDescription>
          </Alert>
        )}

        {/* Debug Section - Show first job's raw data structure */}
        {jobs.length > 0 && process.env.NODE_ENV === 'development' && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-sm text-blue-800">Debug: First Job Data Structure</CardTitle>
            </CardHeader>
            <CardContent>
              <details className="text-xs">
                <summary className="cursor-pointer text-blue-700 mb-2">View Raw Job Data</summary>
                <pre className="bg-white p-2 rounded text-xs overflow-auto max-h-40">
                  {JSON.stringify(jobs[0], null, 2)}
                </pre>
              </details>
            </CardContent>
          </Card>
        )}

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search jobs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={filters.status || "all"}
                  onValueChange={(value) => handleFilterChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="unassigned">New/Unassigned</SelectItem>
                    <SelectItem value="Client Hold">Client Hold</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="served">Served</SelectItem>
                    <SelectItem value="not_served">Not Served</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select
                  value={filters.priority || "all"}
                  onValueChange={(value) => handleFilterChange('priority', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="rush">Rush</SelectItem>
                    <SelectItem value="routine">Routine</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Client</label>
                <Select
                  value={filters.client_id || "all"}
                  onValueChange={(value) => handleFilterChange('client_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.company || client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Server</label>
                <Select
                  value={filters.server_id || "all"}
                  onValueChange={(value) => handleFilterChange('server_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Servers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Servers</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {servers.map((server) => (
                      <SelectItem key={server.id} value={server.id}>
                        {server.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button variant="outline" onClick={clearFilters} className="w-full">
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Jobs Table */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Jobs List
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                </CardTitle>
                <CardDescription>
                  Showing {filteredAndSortedJobs.length} of {totalJobs} jobs
                </CardDescription>
              </div>
            </div>
            {/* Top Pagination Controls */}
            {totalJobs > 0 && (
              <div className="mt-4">
                <PaginationControls />
              </div>
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('recipient')}
                  >
                    <div className="flex items-center gap-2">
                      Recipient
                      {getSortIcon('recipient')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('client')}
                  >
                    <div className="flex items-center gap-2">
                      Client
                      {getSortIcon('client')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-2">
                      Status
                      {getSortIcon('status')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('priority')}
                  >
                    <div className="flex items-center gap-2">
                      Priority
                      {getSortIcon('priority')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('server')}
                  >
                    <div className="flex items-center gap-2">
                      Server
                      {getSortIcon('server')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('received_date')}
                  >
                    <div className="flex items-center gap-2">
                      Received Date
                      {getSortIcon('received_date')}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedJobs.map((job) => (
                  <TableRow
                    key={job.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => navigate(`/jobs/${job.id}`)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {(() => {
                            // Safely extract recipient name from various formats
                            const recipientName = typeof job.recipient_name === 'string' ? job.recipient_name :
                                                 typeof job.defendant_name === 'string' ? job.defendant_name :
                                                 typeof job.recipient?.name === 'string' ? job.recipient.name :
                                                 job.recipient?.name?.name ||
                                                 `${job.defendant_first_name || ''} ${job.defendant_last_name || ''}`.trim();

                            return recipientName || 'Unknown Recipient';
                          })()}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {(() => {
                            // Safely extract address from ServeManager format
                            const getAddressString = (addr: any) => {
                              if (typeof addr === 'string') return addr;
                              if (typeof addr === 'object' && addr) {
                                // ServeManager format: { street1, street2, city, state, zip }
                                const parts = [
                                  addr.street1,
                                  addr.street2,
                                  addr.street,
                                  addr.address
                                ].filter(Boolean);

                                const street = parts.join(' ');
                                const cityState = [addr.city, addr.state].filter(Boolean).join(', ');
                                const zip = addr.zip || addr.postal_code;

                                const fullAddr = [street, cityState, zip].filter(Boolean).join(', ');

                                // Fallback to other formats
                                return fullAddr || addr.full_address || addr.formatted_address ||
                                       `${addr.street || ''} ${addr.city || ''} ${addr.state || ''} ${addr.zip || ''}`.trim();
                              }
                              return '';
                            };

                            const address = getAddressString(job.service_address) ||
                                          getAddressString(job.defendant_address) ||
                                          getAddressString(job.address) ||
                                          getAddressString(job.recipient?.address);

                            return address || 'Address not available';
                          })()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {(() => {
                            // Handle client data safely - extract string values from objects
                            const clientCompany = typeof job.client_company === 'string' ? job.client_company :
                                                 typeof job.client?.company === 'string' ? job.client.company :
                                                 job.client?.name?.company || job.client?.name;
                            const clientName = typeof job.client_name === 'string' ? job.client_name :
                                             typeof job.client?.name === 'string' ? job.client.name :
                                             job.client?.name?.name;

                            return clientCompany || clientName || 'Unknown Client';
                          })()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {(() => {
                            // Extract contact name from various formats
                            const contactName = typeof job.client_name === 'string' ? job.client_name :
                                              job.client_contact ?
                                                `${job.client_contact.first_name || ''} ${job.client_contact.last_name || ''}`.trim() :
                                              typeof job.client?.name === 'string' ? job.client.name :
                                              job.client?.contact_name;

                            return contactName || 'No contact name';
                          })()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(job.status || 'pending')}>
                        {(job.status || 'pending').replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getPriorityColor(job.priority || 'medium')}>
                        {job.priority || 'medium'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        // Safely extract server name from various formats
                        const serverName = typeof job.server_name === 'string' ? job.server_name :
                                         typeof job.assigned_server === 'string' ? job.assigned_server :
                                         typeof job.server?.name === 'string' ? job.server.name :
                                         job.server?.name?.name;

                        return serverName ? (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            {serverName}
                          </div>
                        ) : (
                          <Badge variant="secondary">Unassigned</Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {formatReceivedDate(job.created_at || job.received_date)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredAndSortedJobs.length === 0 && !loading && (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Jobs Found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || Object.values(filters).some(v => v)
                    ? "No jobs match your current filters"
                    : "No jobs available"}
                </p>
              </div>
            )}

            {/* Bottom Pagination Controls */}
            {totalJobs > 0 && (
              <div className="mt-4 pt-4 border-t">
                <PaginationControls />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
