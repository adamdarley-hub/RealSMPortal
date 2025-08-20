import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import ClientLayout from "@/components/ClientLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  MapPin,
  Calendar,
  Search,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Component to fetch and count actual attempts for each job
function AttemptCount({ jobId }: { jobId: string }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchAttemptCount = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}?refresh=true`);
        if (response.ok) {
          const jobData = await response.json();
          const attempts = jobData.attempts || [];
          setCount(attempts.length);
        } else {
          setCount(0);
        }
      } catch (error) {
        console.error(`Failed to fetch attempts for job ${jobId}:`, error);
        setCount(0);
      }
    };

    fetchAttemptCount();
  }, [jobId]);

  if (count === null) {
    return <span className="text-xs text-muted-foreground">...</span>;
  }

  return <span>{count}</span>;
}

// Component to fetch fresh due date for each job
function FreshDueDate({ jobId, fallbackDate }: { jobId: string; fallbackDate?: string }) {
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDueDate = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}?refresh=true`);
        if (response.ok) {
          const jobData = await response.json();
          setDueDate(jobData.due_date || null);
        } else {
          setDueDate(fallbackDate || null);
        }
      } catch (error) {
        console.error(`Failed to fetch due date for job ${jobId}:`, error);
        setDueDate(fallbackDate || null);
      } finally {
        setLoading(false);
      }
    };

    fetchDueDate();
  }, [jobId, fallbackDate]);

  if (loading) {
    return <span className="text-xs text-muted-foreground">...</span>;
  }

  return <span>{dueDate ? formatDate(dueDate) : 'No deadline'}</span>;
}

function formatDate(dateString: string): string {
  if (!dateString) return 'No date';
  return new Date(dateString).toLocaleDateString();
}

interface ClientJob {
  id: string;
  job_number: string;
  recipient_name: string;
  service_address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    full_address?: string;
  };
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    full_address?: string;
  };
  status: string;
  priority: string;
  due_date: string;
  created_at: string;
  amount: number;
  court_case_number?: string;
  plaintiff?: string;
  defendant_name?: string;
  attempt_count?: number;
  attempts?: any[];
}

interface ClientKPIs {
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  overdueJobs: number;
}

export default function ClientDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<ClientJob[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const kpis = useMemo((): ClientKPIs => {
    const totalJobs = jobs.length;
    const activeJobs = jobs.filter(job => 
      ['pending', 'in_progress', 'assigned'].includes(job.status?.toLowerCase())
    ).length;
    const completedJobs = jobs.filter(job => 
      ['served', 'completed'].includes(job.status?.toLowerCase())
    ).length;
    const overdueJobs = jobs.filter(job => {
      const dueDate = new Date(job.due_date);
      const now = new Date();
      return dueDate < now && !['served', 'completed'].includes(job.status?.toLowerCase());
    }).length;

    return { totalJobs, activeJobs, completedJobs, overdueJobs };
  }, [jobs]);

  const loadJobs = async (forceSync = false) => {
    if (!user?.client_id) return;

    setLoading(true);
    setError(null);

    try {
      // If forceSync is true, trigger a full data refresh first
      if (forceSync) {
        console.log('🔄 Forcing data sync from ServeManager...');
        try {
          await fetch('/api/sync/legacy', { method: 'POST' });
          console.log('✅ Data sync completed');
        } catch (syncError) {
          console.warn('⚠��� Sync failed, continuing with cache:', syncError);
        }
      }

      // Add cache busting timestamp to force fresh data
      const cacheBuster = forceSync ? `&t=${Date.now()}` : '';
      const response = await fetch(`/api/jobs?client_id=${user.client_id}&limit=1000${cacheBuster}`);

      if (!response.ok) {
        throw new Error('Failed to load jobs');
      }

      const data = await response.json();
      setJobs(data.jobs || []);

      if (forceSync) {
        toast({
          title: "Data Refreshed",
          description: "Jobs have been updated from ServeManager",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load jobs';
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
    loadJobs();
  }, [user?.client_id]);

  const filteredJobs = useMemo(() => {
    let filtered = jobs;

    // Apply status filter first
    if (statusFilter) {
      switch (statusFilter) {
        case 'active':
          filtered = filtered.filter(job =>
            ['pending', 'in_progress', 'assigned'].includes(job.status?.toLowerCase())
          );
          break;
        case 'completed':
          filtered = filtered.filter(job =>
            ['served', 'completed'].includes(job.status?.toLowerCase())
          );
          break;
        case 'overdue':
          filtered = filtered.filter(job => {
            const dueDate = new Date(job.due_date);
            const now = new Date();
            return dueDate < now && !['served', 'completed'].includes(job.status?.toLowerCase());
          });
          break;
        default:
          break;
      }
    }

    // Apply search filter
    return filtered.filter(job =>
      job.job_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.recipient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.court_case_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [jobs, searchTerm, statusFilter]);


  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high": case "urgent": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "low": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };


  if (loading) {
    return (
      <ClientLayout>
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-96 mt-2" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </ClientLayout>
    );
  }

  if (error) {
    return (
      <ClientLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
                <h3 className="text-lg font-semibold">Unable to Load Jobs</h3>
                <p className="text-muted-foreground">{error}</p>
                <Button onClick={() => loadJobs(true)} className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </Button>
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
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Jobs</h1>
            <p className="text-muted-foreground">
              Track your process service requests
            </p>
          </div>
          <Button onClick={() => loadJobs(true)} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Force Refresh
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === null ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setStatusFilter(null)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.totalJobs}</div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'active' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'active' ? null : 'active')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.activeJobs}</div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'completed' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'completed' ? null : 'completed')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.completedJobs}</div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'overdue' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'overdue' ? null : 'overdue')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{kpis.overdueJobs}</div>
            </CardContent>
          </Card>
        </div>

        {/* Jobs Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Recent Jobs</CardTitle>
                <CardDescription>
                  Your latest process service requests
                </CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search jobs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Case</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.map((job) => (
                  <TableRow
                    key={job.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => navigate(`/client/jobs/${job.id}`)}
                  >
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">
                          {job.recipient_name} - {job.job_number}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          {(() => {
                            // Use the same comprehensive address lookup as JobDetail.tsx
                            const getServiceAddressString = (job: any) => {
                              // Check all possible address sources in priority order
                              const possibleAddresses = [
                                job.service_address,
                                job.address,
                                job.defendant_address,
                                // Check ServeManager addresses_attributes array for primary address
                                job.addresses_attributes?.find((addr: any) => addr.primary === true),
                                job.addresses_attributes?.[0], // Fallback to first if no primary
                                job.raw_data?.addresses_attributes?.find((addr: any) => addr.primary === true),
                                job.raw_data?.addresses_attributes?.[0],
                                // Check raw data sources that ServeManager uses
                                job.raw_data?.addresses?.find((addr: any) => addr.primary === true),
                                job.raw_data?.addresses?.[0],
                                (job as any).addresses?.find((addr: any) => addr.primary === true),
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
                                  // Handle ServeManager addresses_attributes format
                                  const parts = [
                                    address.address1 || address.street || address.street1, // ServeManager uses address1
                                    address.address2 || address.street2
                                  ].filter(Boolean);

                                  const street = parts.join(' ');
                                  const cityState = [address.city, address.state].filter(Boolean).join(', ');
                                  const zip = address.zip || address.postal_code;

                                  const formattedAddress = [street, cityState, zip].filter(Boolean).join(', ');

                                  if (formattedAddress.trim()) {
                                    return formattedAddress;
                                  }
                                }
                              }

                              return 'Address pending';
                            };

                            return getServiceAddressString(job);
                          })()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {job.plaintiff && job.recipient_name ? (
                        <div className="text-sm">
                          {job.plaintiff} vs {job.recipient_name}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-center">
                        <span className="text-sm font-medium">
                          <AttemptCount jobId={job.id} />
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getPriorityColor(job.priority)}>
                        {job.priority.replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <FreshDueDate jobId={job.id} fallbackDate={job.due_date} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredJobs.length === 0 && (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Jobs Found</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? "No jobs match your search criteria" :
                   statusFilter ? `No ${statusFilter} jobs found` :
                   "No jobs available"}
                </p>
                {statusFilter && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setStatusFilter(null)}
                  >
                    Clear Filter
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
