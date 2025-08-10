import { useState, useEffect, useCallback } from "react";
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

export default function Jobs() {
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
  const { toast } = useToast();

  // Declare load functions first before using them in callbacks
  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Loading ALL jobs with filters...');

      const params = new URLSearchParams();
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.priority && filters.priority !== 'all') params.append('priority', filters.priority);
      if (filters.client_id && filters.client_id !== 'all') params.append('client_id', filters.client_id);
      if (filters.server_id && filters.server_id !== 'all') params.append('server_id', filters.server_id);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      // No limit/offset - fetch ALL jobs

      const response = await fetch(`/api/jobs?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to load jobs');
      }

      const data: JobsResponse & { mock?: boolean; error?: string; pages_fetched?: number } = await response.json();
      setJobs(data.jobs);
      setTotalJobs(data.total);
      setUsingMockData(!!data.mock);

      if (data.mock) {
        console.log('Using mock data due to API error:', data.error);
      } else {
        console.log(`Loaded ${data.total} total jobs across ${data.pages_fetched || 1} pages`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load jobs';
      setError(errorMessage);
      console.error('Error loading jobs:', error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  const loadClients = useCallback(async () => {
    try {
      console.log('Loading ALL clients...');
      const response = await fetch('/api/clients'); // No limits
      if (response.ok) {
        const data = await response.json();
        setClients(data.clients || []);
        console.log(`Loaded ${data.total} total clients`);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  }, []);

  const loadServers = async () => {
    try {
      console.log('Loading ALL servers/employees...');
      const response = await fetch('/api/servers'); // No limits
      if (response.ok) {
        const data = await response.json();
        setServers(data.servers || []);
        console.log(`Loaded ${data.total} total servers from endpoint: ${data.endpoint_used || 'unknown'}`);
      }
    } catch (error) {
      console.error('Error loading servers:', error);
    }
  };

  // Memoize the onDataUpdate callback to prevent infinite re-renders
  const onDataUpdate = useCallback(() => {
    // Reload data when sync completes (silent reload - no toast notifications)
    loadJobs();
    loadClients();
    // Note: Removed toast notification as requested - auto-sync should be silent
  }, [loadJobs, loadClients]);

  // Auto-sync setup with 30-second intervals
  const { status: syncStatus, manualSync } = useAutoSync({
    enabled: true,
    interval: 30000, // 30 seconds
    onDataUpdate
  });

  // Load data on component mount
  useEffect(() => {
    loadJobs();
    loadClients();
    loadServers();
  }, [loadJobs, loadClients, filters]);

  const handleFilterChange = (key: keyof JobFilters, value: string | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value,
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

  const refreshJobs = async () => {
    // Trigger manual sync and reload
    manualSync();
    await loadJobs();
    toast({
      title: "Refreshed",
      description: "Job data has been refreshed successfully",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "served": return "bg-success text-success-foreground";
      case "in_progress": return "bg-info text-info-foreground";
      case "assigned": return "bg-warning text-warning-foreground";
      case "pending": return "bg-muted text-muted-foreground";
      case "not_served": return "bg-destructive text-destructive-foreground";
      case "cancelled": return "bg-secondary text-secondary-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "rush": return "bg-destructive text-destructive-foreground border-destructive";
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

  // Filter jobs by search term - check ALL possible name fields, safely handle objects
  const filteredJobs = (jobs || []).filter(job =>
    safeString(job.job_number || job.generated_job_id || job.reference).toLowerCase().includes(searchTerm.toLowerCase()) ||
    safeString(job.client?.name || job.client_name || job.client_company).toLowerCase().includes(searchTerm.toLowerCase()) ||
    safeString(job.recipient?.name || job.recipient_name || job.defendant_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
    safeString(job.description || job.notes).toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <Button onClick={refreshJobs} variant="outline" className="gap-2" disabled={syncStatus.isSyncing}>
              <RefreshCw className={`w-4 h-4 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
              Refresh
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
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="served">Served</SelectItem>
                    <SelectItem value="not_served">Not Served</SelectItem>
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
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
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
                  Showing {filteredJobs.length} of {totalJobs} jobs
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job ID</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Server</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.map((job) => (
                  <TableRow key={job.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div>
                        <p className="font-mono text-sm">
                          {safeString(job.job_number || job.generated_job_id || job.reference, 'N/A')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {safeString(job.id || job.uuid, 'N/A')}
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
                          {typeof job.service_type === 'string' ? job.service_type :
                           typeof job.type === 'string' ? job.type :
                           typeof job.document_type === 'string' ? job.document_type : 'Service'}
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
                            // Safely extract address from various formats
                            const getAddressString = (addr: any) => {
                              if (typeof addr === 'string') return addr;
                              if (typeof addr === 'object' && addr) {
                                return addr.full_address || addr.address ||
                                       `${addr.street || ''} ${addr.city || ''} ${addr.state || ''} ${addr.zip || ''}`.trim();
                              }
                              return '';
                            };

                            const address = getAddressString(job.recipient?.address) ||
                                          getAddressString(job.service_address) ||
                                          getAddressString(job.defendant_address) ||
                                          getAddressString(job.address);

                            return address || 'Address not available';
                          })()}
                        </p>
                      </div>
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
                        {formatDate(job.due_date || job.service_date)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(job.amount || job.price || job.cost || job.fee || job.total || 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredJobs.length === 0 && !loading && (
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
