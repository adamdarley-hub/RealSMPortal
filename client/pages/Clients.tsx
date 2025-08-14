import { useState, useEffect, useCallback, useMemo } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  MapPin,
  Building,
  Loader2,
  RefreshCw,
  AlertCircle,
  Wifi,
  WifiOff,
  ExternalLink,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAutoSync } from "@/hooks/use-auto-sync";
import { Client, ClientsResponse } from "@shared/servemanager";

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

// Sort configuration type
type SortField = 'company' | 'name' | 'email';
type SortDirection = 'asc' | 'desc';

export default function Clients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [totalClients, setTotalClients] = useState(0);
  const [sortField, setSortField] = useState<SortField>('company');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const { toast } = useToast();

  // Declare loadClients function first before using it in callbacks
  const loadClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Loading ALL clients...');
      const response = await fetch('/api/clients'); // No limits - fetch everything

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to load clients');
      }

      const data: ClientsResponse = await response.json();
      setClients(data.clients);
      setTotalClients(data.total);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load clients';
      setError(errorMessage);
      console.error('Error loading clients:', error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Memoize the onDataUpdate callback to prevent infinite re-renders
  const onDataUpdate = useCallback(() => {
    // Reload data when sync completes (silent reload - no toast notifications)
    loadClients();
    // Note: Removed toast notification as requested - auto-sync should be silent
  }, [loadClients]);

  // Auto-sync setup
  const { status: syncStatus, manualSync } = useAutoSync({
    enabled: true,
    interval: 30000, // 30 seconds
    onDataUpdate
  });

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const refreshClients = async () => {
    manualSync();
    await loadClients();
    toast({
      title: "Refreshed",
      description: "Client data has been refreshed successfully",
    });
  };

  // Sort function
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter and sort clients
  const filteredAndSortedClients = useMemo(() => {
    // First filter by search term
    const filtered = (clients || []).filter(client =>
      (client.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Then sort
    return [...filtered].sort((a, b) => {
      let aValue = '';
      let bValue = '';

      switch (sortField) {
        case 'company':
          aValue = (a.company || '').toLowerCase();
          bValue = (b.company || '').toLowerCase();
          break;
        case 'name':
          aValue = (a.name || '').toLowerCase();
          bValue = (b.name || '').toLowerCase();
          break;
        case 'email':
          aValue = (a.email || '').toLowerCase();
          bValue = (b.email || '').toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [clients, searchTerm, sortField, sortDirection]);

  // Render sort icon for headers
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ?
      <ChevronUp className="w-4 h-4" /> :
      <ChevronDown className="w-4 h-4" />;
  };

  if (error) {
    return (
      <Layout>
        <div className="p-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
                <h3 className="text-lg font-semibold">Unable to Load Clients</h3>
                <p className="text-muted-foreground">{error}</p>
                <p className="text-sm text-muted-foreground">
                  Make sure ServeManager API is configured in Settings → API Configuration
                </p>
                <Button onClick={loadClients} className="gap-2">
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
              <Users className="w-8 h-8" />
              Client Management
            </h1>
            <p className="text-muted-foreground">
              Manage law firms and legal professionals who use your services
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

            <Button onClick={refreshClients} variant="outline" className="gap-2" disabled={syncStatus.isSyncing}>
              <RefreshCw className={`w-4 h-4 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <Dialog>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  New Client
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Client</DialogTitle>
                  <DialogDescription>
                    Client creation form coming soon...
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, company, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Clients Table */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Clients List
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                </CardTitle>
                <CardDescription>
                  Showing {filteredAndSortedClients.length} of {totalClients} clients • Click any row to view details
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('company')}
                  >
                    <div className="flex items-center gap-2">
                      Company
                      {renderSortIcon('company')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      Contact Person
                      {renderSortIcon('name')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('email')}
                  >
                    <div className="flex items-center gap-2">
                      Email
                      {renderSortIcon('email')}
                    </div>
                  </TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedClients.map((client) => (
                  <TableRow
                    key={client.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => navigate(`/clients/${client.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{client.company || 'No company name'}</p>
                          <p className="text-xs text-muted-foreground">{client.id || 'No ID'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{client.name || 'No contact name'}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        {client.email ? (
                          <a
                            href={`mailto:${client.email}`}
                            className="text-primary hover:underline"
                          >
                            {client.email}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">No email</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        {client.phone ? (
                          <a
                            href={`tel:${client.phone}`}
                            className="text-primary hover:underline"
                          >
                            {client.phone}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">No phone</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <div className="text-sm">
                          <p>{client.address?.street || 'No street address'}</p>
                          <p className="text-muted-foreground">
                            {client.address
                              ? `${client.address.city || ''}, ${client.address.state || ''} ${client.address.zip || ''}`.trim()
                              : 'No address available'
                            }
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={client.active ? "default" : "secondary"}>
                        {client.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {client.created_date
                        ? new Date(client.created_date).toLocaleDateString()
                        : 'No date available'
                      }
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/clients/${client.id}`);
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredAndSortedClients.length === 0 && !loading && (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Clients Found</h3>
                <p className="text-muted-foreground">
                  {searchTerm
                    ? "No clients match your search criteria"
                    : "No clients available"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
