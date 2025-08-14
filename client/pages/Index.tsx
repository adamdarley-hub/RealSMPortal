import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  FileText,
  Users,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  MapPin,
  Calendar,
  Plus,
  Search,
  Gavel,
  Building,
  Timer,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";

// Types for our real data structures
interface DashboardKPIs {
  totalJobs: number;
  openJobs: number;
  servedJobs: number;
  served7d: number;
  attempts24h: number;
  upcomingDeadlines: number;
  totalClients: number;
  activeServers: number;
}

interface RecentJob {
  id: string;
  job_number: string;
  client_company: string;
  recipient_name: string;
  service_address: string;
  city: string;
  state: string;
  county: string;
  status: string;
  priority: string;
  due_date: string;
  created_at: string;
  amount: number;
  court_case_number?: string;
  plaintiff?: string;
  defendant?: string;
}

interface CourtCase {
  id: string;
  type: string;
  number: string;
  plaintiff: string;
  defendant: string;
  filed_date: string;
  court_date?: string;
  court: {
    id: string;
    name: string;
    county?: string;
    state?: string;
  };
  created_at: string;
  updated_at: string;
}

// User scoping - would normally come from auth context
interface UserScope {
  isAdmin: boolean;
  allowedClientIds: string[];
  workspaceId?: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // State for data and loading
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [courtCases, setCourtCases] = useState<CourtCase[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [servers, setServers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Filters and search
  const [jobsSearch, setJobsSearch] = useState("");
  const [casesSearch, setCasesSearch] = useState("");

  // User scoping - In real app, this would come from auth context
  const userScope: UserScope = useMemo(() => {
    // TODO: Get from actual auth context
    // For now, simulate admin user
    return {
      isAdmin: true,
      allowedClientIds: [], // Empty for admin means all clients
      workspaceId: undefined
    };
  }, []);

  // Security guard: Ensure all queries include proper scoping
  const validateScopedQuery = useCallback((queryName: string, hasClientFilter: boolean) => {
    if (!userScope.isAdmin && (!hasClientFilter || userScope.allowedClientIds.length === 0)) {
      console.warn(`🚨 SECURITY: Query "${queryName}" missing client scoping for non-admin user`);
      return false;
    }
    return true;
  }, [userScope]);

  // Load all real data
  const loadDashboardData = useCallback(async () => {
    if (userScope.allowedClientIds.length === 0 && !userScope.isAdmin) {
      setError('No data in scope for current user');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build scoped query parameters
      const params = new URLSearchParams();
      if (!userScope.isAdmin && userScope.allowedClientIds.length > 0) {
        params.append('client_ids', userScope.allowedClientIds.join(','));
      }
      if (userScope.workspaceId) {
        params.append('workspace_id', userScope.workspaceId);
      }

      if (!validateScopedQuery('loadDashboardData', !userScope.isAdmin)) {
        throw new Error('Invalid query scoping');
      }

      // Fetch all real data
      const [jobsResponse, clientsResponse, serversResponse, courtCasesResponse] = await Promise.all([
        fetch(`/api/jobs?${params.toString()}`),
        fetch(`/api/clients?${params.toString()}`),
        fetch(`/api/servers?${params.toString()}`),
        fetch(`/api/court_cases?${params.toString()}`)
      ]);

      if (!jobsResponse.ok) {
        throw new Error('Failed to load jobs data');
      }

      const jobsData = await jobsResponse.json();
      const jobs = jobsData.jobs || [];

      let clientsData = { clients: [] };
      if (clientsResponse.ok) {
        clientsData = await clientsResponse.json();
      }

      let serversData = { servers: [] };
      if (serversResponse.ok) {
        serversData = await serversResponse.json();
      }

      let courtCasesData = { court_cases: [] };
      if (courtCasesResponse.ok) {
        courtCasesData = await courtCasesResponse.json();
      }

      // Calculate real KPIs from job data
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const openJobs = jobs.filter((job: any) => 
        ['pending', 'in_progress', 'assigned'].includes(job.status?.toLowerCase())
      ).length;

      const servedJobs = jobs.filter((job: any) => {
        const status = job.status?.toLowerCase();
        const serviceStatus = job.service_status?.toLowerCase();
        const jobStatus = job.job_status?.toLowerCase();

        return status === 'served' ||
               serviceStatus === 'served' ||
               jobStatus === 'served';
      }).length;

      // Debug logging to verify calculation
      console.log('🔍 Served Jobs Calculation Debug:');
      console.log(`Total jobs: ${jobs.length}`);
      console.log(`Served jobs: ${servedJobs}`);
      console.log(`Success rate: ${Math.round((servedJobs / Math.max(jobs.length, 1)) * 100)}%`);

      // Sample of job statuses for debugging
      const statusSample = jobs.slice(0, 10).map((job: any) => ({
        id: job.id,
        status: job.status,
        service_status: job.service_status,
        job_status: job.job_status
      }));
      console.log('Sample job statuses:', statusSample);

      const served7d = jobs.filter((job: any) => {
        const completedDate = job.completed_date || job.service_date;
        return completedDate && new Date(completedDate) >= sevenDaysAgo && 
               ['served', 'completed'].includes(job.status?.toLowerCase());
      }).length;

      const upcomingDeadlines = jobs.filter((job: any) => {
        const dueDate = job.due_date;
        return dueDate && new Date(dueDate) <= sevenDaysFromNow && new Date(dueDate) >= now;
      }).length;

      // Real KPIs from actual data
      const kpisData: DashboardKPIs = {
        totalJobs: jobs.length,
        openJobs,
        servedJobs,
        served7d,
        attempts24h: 0, // We don't have attempt data in current schema
        upcomingDeadlines,
        totalClients: clientsData.clients.length,
        activeServers: serversData.servers.filter((s: any) => s.active).length,
      };

      // Process recent jobs with real data
      const processedJobs: RecentJob[] = jobs.slice(0, 25).map((job: any) => ({
        id: job.id,
        job_number: job.job_number || job.servemanager_job_number || job.id,
        client_company: job.client_company || job.client?.company || 'Unknown Client',
        recipient_name: job.recipient_name || job.defendant_name || 'Unknown Recipient',
        service_address: job.service_address?.street || job.address?.street || '',
        city: job.service_address?.city || job.address?.city || '',
        state: job.service_address?.state || job.address?.state || '',
        county: job.service_address?.county || job.address?.county || '',
        status: job.status || job.job_status || 'unknown',
        priority: job.priority || job.urgency || 'medium',
        due_date: job.due_date || '',
        created_at: job.created_at || '',
        amount: job.amount || job.total || job.fee || 0,
        court_case_number: job.case_number || job.court_case?.number,
        plaintiff: job.plaintiff || job.court_case?.plaintiff,
        defendant: job.defendant || job.court_case?.defendant,
      }));

      // Use real court cases from API
      const realCourtCases: CourtCase[] = courtCasesData.court_cases || [];

      setKpis(kpisData);
      setRecentJobs(processedJobs);
      setCourtCases(realCourtCases);
      setClients(clientsData.clients);
      setServers(serversData.servers);

    } catch (error) {
      console.error('Error loading dashboard:', error);
      setError(error instanceof Error ? error.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [userScope, validateScopedQuery]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Filter functions using real data
  const filteredJobs = useMemo(() => {
    return recentJobs.filter(job =>
      job.job_number.toLowerCase().includes(jobsSearch.toLowerCase()) ||
      job.client_company.toLowerCase().includes(jobsSearch.toLowerCase()) ||
      job.recipient_name.toLowerCase().includes(jobsSearch.toLowerCase())
    );
  }, [recentJobs, jobsSearch]);

  const filteredCases = useMemo(() => {
    return courtCases.filter(case_ => {
      return casesSearch === '' ||
        case_.number.toLowerCase().includes(casesSearch.toLowerCase()) ||
        case_.plaintiff.toLowerCase().includes(casesSearch.toLowerCase()) ||
        case_.defendant.toLowerCase().includes(casesSearch.toLowerCase());
    });
  }, [courtCases, casesSearch]);

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "served": case "completed": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "in_progress": case "assigned": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "attempted": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "pending": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high": case "urgent": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "low": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const formatRelativeTime = (dateString: string) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  // Calculate successful serve rate from real data
  const successfulServeRate = kpis ? Math.round((kpis.servedJobs / Math.max(kpis.totalJobs, 1)) * 100) : 0;

  // Loading skeleton
  if (loading) {
    return (
      <Layout>
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-96 mt-2" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-32 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  // Error state
  if (error) {
    return (
      <Layout>
        <div className="p-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
                <h3 className="text-lg font-semibold">Dashboard Error</h3>
                <p className="text-muted-foreground">{error}</p>
                <Button onClick={loadDashboardData} className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Retry
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
      <div className="p-6 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">
              {userScope.isAdmin 
                ? "Complete overview of all process service operations"
                : "Your process service dashboard"
              }
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadDashboardData} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Job
            </Button>
          </div>
        </div>

        {/* KPIs Grid - Real Data Only */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis?.totalJobs || 0}</div>
              <p className="text-xs text-muted-foreground">
                All process service jobs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Jobs</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis?.openJobs || 0}</div>
              <p className="text-xs text-muted-foreground">
                Currently in progress
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Successful Serve Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{successfulServeRate}%</div>
              <Progress value={successfulServeRate} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Served (7 days)</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis?.served7d || 0}</div>
              <p className="text-xs text-muted-foreground">
                Successfully served
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis?.totalClients || 0}</div>
              <p className="text-xs text-muted-foreground">
                Active client accounts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Process Servers</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis?.activeServers || 0}</div>
              <p className="text-xs text-muted-foreground">
                Active servers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Deadlines</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis?.upcomingDeadlines || 0}</div>
              <p className="text-xs text-muted-foreground">
                Due within 7 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Court Cases</CardTitle>
              <Gavel className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{courtCases.length}</div>
              <p className="text-xs text-muted-foreground">
                Active legal cases
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="jobs" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="jobs">Recent Jobs</TabsTrigger>
            <TabsTrigger value="cases">Court Cases</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Recent Jobs
                    </CardTitle>
                    <CardDescription>
                      Latest process service requests from real data
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search jobs..."
                        value={jobsSearch}
                        onChange={(e) => setJobsSearch(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job Number</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredJobs.map((job) => (
                      <TableRow 
                        key={job.id} 
                        className="hover:bg-muted/50 cursor-pointer"
                        onClick={() => navigate(`/jobs/${job.id}`)}
                      >
                        <TableCell className="font-medium">{job.job_number}</TableCell>
                        <TableCell>{job.client_company}</TableCell>
                        <TableCell>{job.recipient_name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            {job.city && job.state ? `${job.city}, ${job.state}` : 'Address pending'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(job.status)}>
                            {job.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getPriorityColor(job.priority)}>
                            {job.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {job.due_date ? new Date(job.due_date).toLocaleDateString() : 'No deadline'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${job.amount.toFixed(2)}
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
                      {jobsSearch ? "No jobs match your search criteria" : "No recent jobs available"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cases" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Gavel className="w-5 h-5" />
                      Court Cases
                    </CardTitle>
                    <CardDescription>
                      Legal cases extracted from job data with case numbers
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search cases..."
                        value={casesSearch}
                        onChange={(e) => setCasesSearch(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Case Number</TableHead>
                      <TableHead>Case Name</TableHead>
                      <TableHead>Court</TableHead>
                      <TableHead>Filed Date</TableHead>
                      <TableHead>Court Date</TableHead>
                      <TableHead>Last Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCases.map((case_) => (
                      <TableRow
                        key={case_.id}
                        className="hover:bg-muted/50"
                      >
                        <TableCell className="font-medium">{case_.number}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{case_.plaintiff || 'Unknown Plaintiff'}</p>
                            <p className="text-sm text-muted-foreground">vs. {case_.defendant || 'Unknown Defendant'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{case_.court?.name || 'Court not specified'}</p>
                            {case_.court?.county && case_.court?.state && (
                              <p className="text-sm text-muted-foreground">{case_.court.county}, {case_.court.state}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {case_.filed_date ? new Date(case_.filed_date).toLocaleDateString() : 'Not specified'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {case_.court_date ? (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              {new Date(case_.court_date).toLocaleDateString()}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Not scheduled</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {formatRelativeTime(case_.updated_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {filteredCases.length === 0 && (
                  <div className="text-center py-8">
                    <Gavel className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Court Cases Found</h3>
                    <p className="text-muted-foreground">
                      {casesSearch 
                        ? "No cases match your search criteria" 
                        : "No jobs with case numbers found"
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/clients')}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Manage Clients
              </CardTitle>
              <CardDescription>
                View and manage your client accounts and contacts
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/jobs')}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-warning" />
                All Jobs
              </CardTitle>
              <CardDescription>
                View all jobs and service requests
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/analytics')}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-success" />
                View Reports
              </CardTitle>
              <CardDescription>
                Detailed analytics and performance metrics
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
