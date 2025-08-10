import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Users,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  MapPin,
  Calendar,
  Plus,
} from "lucide-react";
import Layout from "@/components/Layout";

// Mock data - in real app this would come from ServeManager API
const dashboardStats = {
  totalJobs: 156,
  activeJobs: 23,
  completedJobs: 128,
  pendingInvoices: 5,
  totalRevenue: 45230,
  thisMonthRevenue: 8940,
};

const recentJobs = [
  {
    id: "JS-001234",
    title: "Service of Process - Divorce Papers",
    client: "Johnson & Associates",
    recipient: "Michael Thompson",
    address: "123 Oak Street, Springfield, IL",
    status: "in_progress",
    priority: "high",
    dueDate: "2024-01-15",
    assignedServer: "Mark Wilson",
    amount: 125.00,
  },
  {
    id: "JS-001235", 
    title: "Subpoena Service",
    client: "Davis Law Group",
    recipient: "Sarah Chen",
    address: "456 Maple Ave, Chicago, IL",
    status: "served",
    priority: "medium",
    dueDate: "2024-01-12",
    assignedServer: "Lisa Johnson",
    amount: 95.00,
  },
  {
    id: "JS-001236",
    title: "Court Papers - Personal Injury",
    client: "Miller & Partners", 
    recipient: "Robert Davis",
    address: "789 Pine Road, Peoria, IL",
    status: "pending",
    priority: "low",
    dueDate: "2024-01-18",
    assignedServer: "Mike Rodriguez",
    amount: 110.00,
  },
  {
    id: "JS-001237",
    title: "Eviction Notice",
    client: "Property Management Co",
    recipient: "Jennifer Martinez",
    address: "321 Elm Street, Rockford, IL",
    status: "attempted",
    priority: "high",
    dueDate: "2024-01-14",
    assignedServer: "Tom Anderson",
    amount: 85.00,
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "served": return "bg-success text-success-foreground";
    case "in_progress": return "bg-info text-info-foreground";
    case "attempted": return "bg-warning text-warning-foreground";
    case "pending": return "bg-muted text-muted-foreground";
    default: return "bg-muted text-muted-foreground";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "high": return "bg-destructive text-destructive-foreground";
    case "medium": return "bg-warning text-warning-foreground";
    case "low": return "bg-success text-success-foreground";
    default: return "bg-muted text-muted-foreground";
  }
};

export default function Dashboard() {
  const successRate = Math.round((dashboardStats.completedJobs / dashboardStats.totalJobs) * 100);

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back! Here's what's happening with your process service operations.
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Service Request
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.totalJobs}</div>
              <p className="text-xs text-muted-foreground">
                +12% from last month
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.activeJobs}</div>
              <p className="text-xs text-muted-foreground">
                Currently in progress
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{successRate}%</div>
              <Progress value={successRate} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${dashboardStats.thisMonthRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                This month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Jobs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Recent Jobs
            </CardTitle>
            <CardDescription>
              Latest process service requests and their current status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Server</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentJobs.map((job) => (
                  <TableRow key={job.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{job.id}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{job.title}</p>
                        <p className="text-sm text-muted-foreground">{job.client}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{job.recipient}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {job.address}
                        </p>
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
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {job.dueDate}
                      </div>
                    </TableCell>
                    <TableCell>{job.assignedServer}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${job.amount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
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

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-warning" />
                Pending Actions
              </CardTitle>
              <CardDescription>
                {dashboardStats.pendingInvoices} invoices require attention
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
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
