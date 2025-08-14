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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Scale,
  Building,
  UserCheck,
  Timer,
  BarChart3,
  RefreshCw,
  Filter,
} from "lucide-react";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";

// Types for our data structures
interface DashboardKPIs {
  openJobs: number;
  served7d: number;
  attempts24h: number;
  invoicesDue: number;
  invoicesDueAmount: number;
  upcomingDeadlines: number;
  openCases: number;
  hearings30d: number;
  affidavitsAwaiting: number;
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
}

interface RecentAttempt {
  id: string;
  job_id: string;
  job_number: string;
  timestamp: string;
  outcome: string;
  notes: string;
  server_name: string;
}

interface UnpaidInvoice {
  id: string;
  invoice_number: string;
  client_company: string;
  amount: number;
  due_date: string;
  status: string;
}

interface CaseInfo {
  id: string;
  case_number: string;
  plaintiff: string;
  defendant: string;
  court_name: string;
  court_county: string;
  court_state: string;
  filing_date: string;
  next_hearing: string;
  next_deadline: string;
  served_parties: number;
  total_parties: number;
  affidavits_returned: number;
  last_activity: string;
  status: string;
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
  const [recentAttempts, setRecentAttempts] = useState<RecentAttempt[]>([]);
  const [unpaidInvoices, setUnpaidInvoices] = useState<UnpaidInvoice[]>([]);
  const [cases, setCases] = useState<CaseInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Filters and search
  const [jobsSearch, setJobsSearch] = useState("");
  const [casesSearch, setCasesSearch] = useState("");
  const [caseStatusFilter, setCaseStatusFilter] = useState("all");

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

  // Load KPIs with scoping
  const loadKPIs = useCallback(async () => {
    try {
      // Build scoped query parameters
      const params = new URLSearchParams();
      if (!userScope.isAdmin && userScope.allowedClientIds.length > 0) {
        params.append('client_ids', userScope.allowedClientIds.join(','));
      }
      if (userScope.workspaceId) {
        params.append('workspace_id', userScope.workspaceId);
      }

      if (!validateScopedQuery('loadKPIs', !userScope.isAdmin)) {
        throw new Error('Invalid query scoping');
      }

      // In a real app, these would be separate optimized endpoints
      // For now, we'll use our existing data with client-side aggregation as a fallback
      const [jobsResponse] = await Promise.all([
        fetch(`/api/jobs?${params.toString()}`)
      ]);

      if (!jobsResponse.ok) {
        throw new Error('Failed to load dashboard data');
      }

      const jobsData = await jobsResponse.json();
      const jobs = jobsData.jobs || [];

      // Calculate KPIs from available data
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const openJobs = jobs.filter((job: any) => 
        ['pending', 'in_progress', 'assigned'].includes(job.status?.toLowerCase())
      ).length;

      const served7d = jobs.filter((job: any) => {
        const completedDate = job.completed_date || job.service_date;
        return completedDate && new Date(completedDate) >= sevenDaysAgo && 
               ['served', 'completed'].includes(job.status?.toLowerCase());
      }).length;

      // Mock some additional KPIs that would come from dedicated endpoints
      const kpisData: DashboardKPIs = {
        openJobs,
        served7d,
        attempts24h: Math.floor(Math.random() * 15) + 3, // Mock data
        invoicesDue: Math.floor(Math.random() * 8) + 2,
        invoicesDueAmount: Math.random() * 5000 + 1000,
        upcomingDeadlines: jobs.filter((job: any) => {
          const dueDate = job.due_date;
          return dueDate && new Date(dueDate) <= thirtyDaysFromNow && new Date(dueDate) >= now;
        }).length,
        openCases: Math.floor(Math.random() * 25) + 10, // Mock data
        hearings30d: Math.floor(Math.random() * 12) + 3,
        affidavitsAwaiting: Math.floor(Math.random() * 18) + 5,
      };

      setKpis(kpisData);
    } catch (error) {
      console.error('Error loading KPIs:', error);
      setError(error instanceof Error ? error.message : 'Failed to load KPIs');
    }
  }, [userScope, validateScopedQuery]);

  // Load recent jobs with scoping
  const loadRecentJobs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.append('limit', '25');
      params.append('sort', 'created_at_desc');
      
      if (!userScope.isAdmin && userScope.allowedClientIds.length > 0) {
        params.append('client_ids', userScope.allowedClientIds.join(','));
      }

      if (!validateScopedQuery('loadRecentJobs', !userScope.isAdmin)) {
        return;
      }

      const response = await fetch(`/api/jobs?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to load recent jobs');

      const data = await response.json();
      const jobs = (data.jobs || []).slice(0, 25).map((job: any) => ({
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
      }));

      setRecentJobs(jobs);
    } catch (error) {
      console.error('Error loading recent jobs:', error);
    }
  }, [userScope, validateScopedQuery]);

  // Load mock case data (would be real API in production)
  const loadCases = useCallback(async () => {
    try {
      if (!validateScopedQuery('loadCases', !userScope.isAdmin)) {
        return;
      }

      // Mock case data - in real app this would be from a cases API
      const mockCases: CaseInfo[] = [
        {
          id: '1',
          case_number: '2024-CV-001234',
          plaintiff: 'Smith Industries LLC',
          defendant: 'Johnson Manufacturing Corp',
          court_name: 'Superior Court of Travis County',
          court_county: 'Travis',
          court_state: 'TX',
          filing_date: '2024-01-15',
          next_hearing: '2024-02-20',
          next_deadline: '2024-02-15',
          served_parties: 2,
          total_parties: 3,
          affidavits_returned: 1,
          last_activity: '2024-01-28',
          status: 'open'
        },
        {
          id: '2',
          case_number: '2024-CV-001567',
          plaintiff: 'Davis & Associates',
          defendant: 'Williams Construction Inc',
          court_name: 'District Court of Harris County',
          court_county: 'Harris',
          court_state: 'TX',
          filing_date: '2024-01-10',
          next_hearing: '2024-03-05',
          next_deadline: '2024-02-28',
          served_parties: 1,
          total_parties: 2,
          affidavits_returned: 0,
          last_activity: '2024-01-25',
          status: 'open'
        },
      ];

      setCases(mockCases);
    } catch (error) {
      console.error('Error loading cases:', error);
    }
  }, [userScope, validateScopedQuery]);

  // Load all data
  const loadDashboardData = useCallback(async () => {
    if (userScope.allowedClientIds.length === 0 && !userScope.isAdmin) {
      setError('No data in scope for current user');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        loadKPIs(),
        loadRecentJobs(),
        loadCases(),
      ]);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setError(error instanceof Error ? error.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [loadKPIs, loadRecentJobs, loadCases, userScope]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Filter functions
  const filteredJobs = useMemo(() => {
    return recentJobs.filter(job =>
      job.job_number.toLowerCase().includes(jobsSearch.toLowerCase()) ||
      job.client_company.toLowerCase().includes(jobsSearch.toLowerCase()) ||
      job.recipient_name.toLowerCase().includes(jobsSearch.toLowerCase())
    );
  }, [recentJobs, jobsSearch]);

  const filteredCases = useMemo(() => {
    return cases.filter(case_ => {
      const matchesSearch = casesSearch === '' || 
        case_.case_number.toLowerCase().includes(casesSearch.toLowerCase()) ||
        case_.plaintiff.toLowerCase().includes(casesSearch.toLowerCase()) ||
        case_.defendant.toLowerCase().includes(casesSearch.toLowerCase());
      
      const matchesStatus = caseStatusFilter === 'all' || case_.status === caseStatusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [cases, casesSearch, caseStatusFilter]);

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

        {/* Top KPIs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              <CardTitle className="text-sm font-medium">Attempts (24h)</CardTitle>
              <Timer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis?.attempts24h || 0}</div>
              <p className="text-xs text-muted-foreground">
                Service attempts today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Invoices Due</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis?.invoicesDue || 0}</div>
              <p className="text-xs text-muted-foreground">
                ${(kpis?.invoicesDueAmount || 0).toLocaleString()} total
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Case Info KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Cases</CardTitle>
              <Gavel className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis?.openCases || 0}</div>
              <p className="text-xs text-muted-foreground">
                Active legal cases
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hearings (30d)</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis?.hearings30d || 0}</div>
              <p className="text-xs text-muted-foreground">
                Upcoming hearings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Affidavits Awaiting</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis?.affidavitsAwaiting || 0}</div>
              <p className="text-xs text-muted-foreground">
                Returns pending
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
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="jobs" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="jobs">Recent Jobs</TabsTrigger>
            <TabsTrigger value="cases">Cases</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
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
                      Latest process service requests and their current status
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
                      <Scale className="w-5 h-5" />
                      Legal Cases
                    </CardTitle>
                    <CardDescription>
                      Court cases and their service progress
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
                    <Select value={caseStatusFilter} onValueChange={setCaseStatusFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
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
                      <TableHead>Service Progress</TableHead>
                      <TableHead>Next Deadline</TableHead>
                      <TableHead>Affidavits</TableHead>
                      <TableHead>Last Activity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCases.map((case_) => (
                      <TableRow 
                        key={case_.id} 
                        className="hover:bg-muted/50 cursor-pointer"
                        onClick={() => navigate(`/cases/${case_.id}`)}
                      >
                        <TableCell className="font-medium">{case_.case_number}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{case_.plaintiff}</p>
                            <p className="text-sm text-muted-foreground">vs. {case_.defendant}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{case_.court_name}</p>
                            <p className="text-sm text-muted-foreground">{case_.court_county}, {case_.court_state}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span>{case_.served_parties}/{case_.total_parties} served</span>
                              <span>{Math.round((case_.served_parties / case_.total_parties) * 100)}%</span>
                            </div>
                            <Progress value={(case_.served_parties / case_.total_parties) * 100} className="h-2" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {case_.next_deadline ? new Date(case_.next_deadline).toLocaleDateString() : 'None'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {case_.affidavits_returned} returned
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatRelativeTime(case_.last_activity)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {filteredCases.length === 0 && (
                  <div className="text-center py-8">
                    <Scale className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Cases Found</h3>
                    <p className="text-muted-foreground">
                      {casesSearch ? "No cases match your search criteria" : "No cases available"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Unpaid Invoices
                </CardTitle>
                <CardDescription>
                  Outstanding invoices requiring attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Invoices Coming Soon</h3>
                  <p className="text-muted-foreground">
                    Invoice management will be available in the next update
                  </p>
                </div>
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
                <AlertCircle className="w-5 h-5 text-warning" />
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
