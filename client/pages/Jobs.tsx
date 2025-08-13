import React, { useState, useEffect, useCallback, useRef, useMemo, Suspense } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Filter,
  Plus,
  Loader2,
  RefreshCw,
  AlertCircle,
  Wifi,
  WifiOff,
} from "lucide-react";

// Import components directly to avoid dynamic import issues
import { JobsTable } from "@/components/JobsTable";
import { JobsFilters } from "@/components/JobsFilters";
import { useToast } from "@/hooks/use-toast";
import { useAutoSync } from "@/hooks/use-auto-sync";
import { Job, JobsResponse, Client, Server, JobFilters } from "@shared/servemanager";

// Performance optimization: Move complex functions to dedicated components

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

  // Cache management
  const cacheRef = useRef<{
    jobs: Job[];
    clients: Client[];
    servers: Server[];
    timestamp: number;
    totalJobs: number;
  }>({
    jobs: [],
    clients: [],
    servers: [],
    timestamp: 0,
    totalJobs: 0
  });
  const CACHE_DURATION = 30000; // 30 seconds

  // Declare load functions first before using them in callbacks
  const loadJobs = useCallback(async (retryCount = 0, forceRefresh = false) => {
    // Check cache first (unless force refresh)
    const now = Date.now();
    const cache = cacheRef.current;

    if (!forceRefresh && cache.timestamp && (now - cache.timestamp) < CACHE_DURATION && cache.jobs.length > 0) {
      const ageSeconds = Math.round((now - cache.timestamp) / 1000);
      console.log(`⚡ Using cached jobs data (${ageSeconds}s old) - INSTANT LOAD`);
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
        const response = await fetch('/api/jobs?limit=50', {
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
          totalJobs: data.total || data.jobs.length
        };

        if (data.mock) {
          console.log('Using mock data due to API error:', data.error);
          toast({
            title: "Using Mock Data",
            description: "Could not connect to ServeManager, showing sample data",
            variant: "default",
          });
        } else {
          console.log(`Loaded ${data.total} total jobs in ${data.response_time_ms || 'unknown'}ms (cached for 30s)`);
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
        console.log('⚠️ Jobs request was aborted (likely due to timeout or navigation)');
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
      console.log('�� Silent background check for updates...');
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

  // Optimized refresh function
  const refreshJobs = useCallback(async () => {
    console.log('🔄 Refreshing jobs...');
    setLoading(true);
    try {
      manualSync();
      await loadJobs(0, true);
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
  }, [manualSync, loadJobs, toast]);

  // Optimized sort handler
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField, sortDirection]);

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

        {/* Filters and Search - Lazy Loaded */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={
              <div className="animate-pulse bg-muted h-20 rounded"></div>
            }>
              <JobsFilters
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={clearFilters}
                clients={clients}
                servers={servers}
              />
            </Suspense>
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
          </CardHeader>
          <CardContent>
            <Suspense fallback={
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-muted h-12 rounded"></div>
                ))}
              </div>
            }>
              <JobsTable
                jobs={jobs}
                clients={clients}
                servers={servers}
                searchTerm={searchTerm}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
            </Suspense>

            {jobs.length === 0 && !loading && (
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
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
