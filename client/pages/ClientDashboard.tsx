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

  const loadJobs = async () => {
    if (!user?.client_id) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/jobs?client_id=${user.client_id}&limit=50`);
      
      if (!response.ok) {
        throw new Error('Failed to load jobs');
      }

      const data = await response.json();
      setJobs(data.jobs || []);
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
    return jobs.filter(job =>
      job.job_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.recipient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.court_case_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [jobs, searchTerm]);

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

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No date';
    return new Date(dateString).toLocaleDateString();
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
                <Button onClick={loadJobs} className="gap-2">
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
          <Button onClick={loadJobs} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.totalJobs}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.activeJobs}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.completedJobs}</div>
            </CardContent>
          </Card>

          <Card>
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
                  <TableHead>Job Number</TableHead>
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
                    onClick={() => navigate(`/client/jobs/${job.id}`)}
                  >
                    <TableCell className="font-medium">{job.job_number}</TableCell>
                    <TableCell>{job.recipient_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {(() => {
                          // Try multiple possible address fields and formats
                          const addressObj = job.service_address || job.address;
                          const addressStr = job.service_address_string || job.address_string;

                          console.log('Full job debug:', job);

                          // Check for string format first
                          if (addressStr && typeof addressStr === 'string') {
                            return addressStr;
                          }

                          // Check for object format
                          if (addressObj && typeof addressObj === 'object') {
                            // Try various field combinations
                            if (addressObj.full_address) return addressObj.full_address;
                            if (addressObj.address_line_1) {
                              const parts = [addressObj.address_line_1];
                              if (addressObj.city) parts.push(addressObj.city);
                              if (addressObj.state) parts.push(addressObj.state);
                              if (addressObj.zip) parts.push(addressObj.zip);
                              return parts.join(', ');
                            }
                            if (addressObj.street || addressObj.street1) {
                              const parts = [addressObj.street || addressObj.street1];
                              if (addressObj.city) parts.push(addressObj.city);
                              if (addressObj.state) parts.push(addressObj.state);
                              if (addressObj.zip || addressObj.postal_code) parts.push(addressObj.zip || addressObj.postal_code);
                              return parts.join(', ');
                            }
                          }

                          // Check any field that might contain full address
                          for (const [key, value] of Object.entries(job)) {
                            if (key.toLowerCase().includes('address') && typeof value === 'string' && value.length > 10) {
                              return value;
                            }
                          }

                          return 'Address pending';
                        })()}
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
                      {job.due_date ? formatDate(job.due_date) : 'No deadline'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${job.amount?.toFixed(2) || '0.00'}
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
                  {searchTerm ? "No jobs match your search criteria" : "No jobs available"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
