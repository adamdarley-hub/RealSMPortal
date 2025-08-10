import { useState, useEffect } from "react";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Job, JobsResponse, Client, Server, JobFilters } from "@shared/servemanager";

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<JobFilters>({
    limit: 50,
    offset: 0,
  });
  const [totalJobs, setTotalJobs] = useState(0);
  const { toast } = useToast();

  // Load data on component mount
  useEffect(() => {
    loadJobs();
    loadClients();
    loadServers();
  }, [filters]);

  const loadJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.client_id) params.append('client_id', filters.client_id);
      if (filters.server_id) params.append('server_id', filters.server_id);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      params.append('limit', filters.limit?.toString() || '50');
      params.append('offset', filters.offset?.toString() || '0');

      const response = await fetch(`/api/jobs?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to load jobs');
      }
      
      const data: JobsResponse = await response.json();
      setJobs(data.jobs);
      setTotalJobs(data.total);
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
  };

  const loadClients = async () => {
    try {
      const response = await fetch('/api/clients?limit=100');
      if (response.ok) {
        const data = await response.json();
        setClients(data.clients);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadServers = async () => {
    try {
      const response = await fetch('/api/servers?limit=100');
      if (response.ok) {
        const data = await response.json();
        setServers(data.servers);
      }
    } catch (error) {
      console.error('Error loading servers:', error);
    }
  };

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

  // Filter jobs by search term
  const filteredJobs = jobs.filter(job => 
    job.job_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.recipient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.description.toLowerCase().includes(searchTerm.toLowerCase())
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
                <p className="text-sm text-muted-foreground">
                  Make sure ServeManager API is configured in Settings → API Configuration
                </p>
                <Button onClick={loadJobs} className="gap-2">
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
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-8 h-8" />
              Job Management
            </h1>
            <p className="text-muted-foreground">
              Manage all process service jobs and track their progress
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={loadJobs} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
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
                        <p className="font-mono text-sm">{job.job_number}</p>
                        <p className="text-xs text-muted-foreground">{job.id}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{job.client.company || job.client.name}</p>
                        <p className="text-sm text-muted-foreground">{job.service_type}</p>
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
                      <div>
                        <p className="font-medium">{job.recipient.name}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {job.recipient.address.full_address}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {job.server ? (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          {job.server.name}
                        </div>
                      ) : (
                        <Badge variant="secondary">Unassigned</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {formatDate(job.due_date)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(job.amount)}
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
