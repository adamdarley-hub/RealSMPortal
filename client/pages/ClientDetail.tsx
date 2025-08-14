import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Building,
  Users,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  ArrowLeft,
  Loader2,
  AlertCircle,
  ExternalLink,
  User,
  Briefcase,
  DollarSign,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Client } from "@shared/servemanager";

interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  title?: string;
  department?: string;
  primary?: boolean;
  raw_data?: any;
}

interface Job {
  id: string;
  job_number: string;
  status: string;
  service_type: string;
  recipient_name: string;
  created_at: string;
  amount?: number;
}

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [client, setClient] = useState<Client | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadClientDetails = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch client details
      const clientResponse = await fetch(`/api/clients`);
      if (!clientResponse.ok) {
        throw new Error('Failed to fetch client data');
      }

      const clientData = await clientResponse.json();
      const foundClient = clientData.clients.find((c: Client) => c.id === id);

      if (!foundClient) {
        throw new Error('Client not found');
      }

      setClient(foundClient);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load client details';
      setError(errorMessage);
      console.error('Error loading client details:', error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  const loadContacts = useCallback(async () => {
    if (!id) return;

    setContactsLoading(true);
    try {
      const response = await fetch(`/api/contacts`);
      if (!response.ok) {
        throw new Error('Failed to fetch contacts');
      }

      const data = await response.json();
      // Filter contacts that belong to this client or have matching company info
      const clientContacts = data.contacts.filter((contact: any) => {
        if (!contact) return false;
        
        // Direct client ID match
        if (contact.client_id === id) return true;
        
        // Match by company name if available
        if (client && contact.company && contact.company.toLowerCase() === client.company?.toLowerCase()) {
          return true;
        }
        
        // Match by email domain if company email matches
        if (client?.email && contact.email) {
          const clientDomain = client.email.split('@')[1];
          const contactDomain = contact.email.split('@')[1];
          if (clientDomain && contactDomain && clientDomain.toLowerCase() === contactDomain.toLowerCase()) {
            return true;
          }
        }

        return false;
      });

      // Map raw contact data to our Contact interface
      const mappedContacts: Contact[] = clientContacts.map((contact: any) => ({
        id: contact.id || contact.contact_id || Math.random().toString(),
        name: contact.name || contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown Contact',
        email: contact.email || contact.email_address,
        phone: contact.phone || contact.phone_number || contact.telephone,
        title: contact.title || contact.position || contact.job_title,
        department: contact.department,
        primary: contact.primary || contact.is_primary || false,
        raw_data: contact
      }));

      setContacts(mappedContacts);
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast({
        title: "Warning",
        description: "Could not load contacts for this client",
        variant: "default",
      });
    } finally {
      setContactsLoading(false);
    }
  }, [id, client, toast]);

  const loadJobs = useCallback(async () => {
    if (!id) return;

    setJobsLoading(true);
    try {
      const response = await fetch(`/api/jobs?client_id=${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }

      const data = await response.json();
      // Map job data to our simplified Job interface
      const clientJobs: Job[] = data.jobs.map((job: any) => ({
        id: job.id,
        job_number: job.job_number || job.servemanager_job_number || job.id,
        status: job.status || job.job_status || 'Unknown',
        service_type: job.service_type || job.type || 'Unknown',
        recipient_name: job.recipient_name || job.defendant_name || 'Unknown',
        created_at: job.created_at || job.created_date || '',
        amount: job.amount || job.total || job.fee || 0
      }));

      setJobs(clientJobs);
    } catch (error) {
      console.error('Error loading jobs:', error);
      toast({
        title: "Warning",
        description: "Could not load jobs for this client",
        variant: "default",
      });
    } finally {
      setJobsLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    loadClientDetails();
  }, [loadClientDetails]);

  useEffect(() => {
    if (client) {
      loadContacts();
      loadJobs();
    }
  }, [client, loadContacts, loadJobs]);

  if (loading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="ml-2">Loading client details...</span>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !client) {
    return (
      <Layout>
        <div className="p-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
                <h3 className="text-lg font-semibold">Client Not Found</h3>
                <p className="text-muted-foreground">{error || 'The requested client could not be found.'}</p>
                <Button onClick={() => navigate('/clients')} className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Clients
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Helper function to display raw data if available
  const renderRawDataSection = (rawData: any) => {
    if (!rawData) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Raw ServeManager Data
          </CardTitle>
          <CardDescription>
            Complete data structure from ServeManager API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm max-h-96">
            {JSON.stringify(rawData, null, 2)}
          </pre>
        </CardContent>
      </Card>
    );
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/clients')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Building className="w-8 h-8" />
              {client.company || client.name}
            </h1>
            <p className="text-muted-foreground">
              Client ID: {client.id}
            </p>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="contacts">
              Contacts {contacts.length > 0 && <Badge variant="secondary" className="ml-1">{contacts.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="jobs">
              Jobs {jobs.length > 0 && <Badge variant="secondary" className="ml-1">{jobs.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="raw-data">Raw Data</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Company Details */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Company Name</label>
                      <p className="text-lg font-semibold">{client.company || 'Not specified'}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Primary Contact</label>
                      <p className="text-lg">{client.name || 'Not specified'}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={client.active ? "default" : "secondary"}>
                        {client.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Email</label>
                        {client.email ? (
                          <p>
                            <a
                              href={`mailto:${client.email}`}
                              className="text-primary hover:underline"
                            >
                              {client.email}
                            </a>
                          </p>
                        ) : (
                          <p className="text-muted-foreground">Not specified</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Phone</label>
                        {client.phone ? (
                          <p>
                            <a
                              href={`tel:${client.phone}`}
                              className="text-primary hover:underline"
                            >
                              {client.phone}
                            </a>
                          </p>
                        ) : (
                          <p className="text-muted-foreground">Not specified</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Address</label>
                        {client.address ? (
                          <div>
                            <p>{client.address.street}</p>
                            <p>{client.address.city}, {client.address.state} {client.address.zip}</p>
                          </div>
                        ) : (
                          <p className="text-muted-foreground">Not specified</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Client Since</label>
                        <p>
                          {client.created_date
                            ? new Date(client.created_date).toLocaleDateString()
                            : 'Not specified'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Billing Address if different */}
            {client.billing_address && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Billing Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Billing Address</label>
                      <div>
                        <p>{client.billing_address.street}</p>
                        <p>{client.billing_address.city}, {client.billing_address.state} {client.billing_address.zip}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="contacts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Contacts at {client.company || client.name}
                  {contactsLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                </CardTitle>
                <CardDescription>
                  All contacts associated with this client
                </CardDescription>
              </CardHeader>
              <CardContent>
                {contacts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Primary</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contacts.map((contact) => (
                        <TableRow key={contact.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">{contact.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {contact.title ? (
                              <div className="flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-muted-foreground" />
                                {contact.title}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Not specified</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {contact.email ? (
                              <a
                                href={`mailto:${contact.email}`}
                                className="text-primary hover:underline flex items-center gap-2"
                              >
                                <Mail className="w-4 h-4" />
                                {contact.email}
                              </a>
                            ) : (
                              <span className="text-muted-foreground">Not specified</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {contact.phone ? (
                              <a
                                href={`tel:${contact.phone}`}
                                className="text-primary hover:underline flex items-center gap-2"
                              >
                                <Phone className="w-4 h-4" />
                                {contact.phone}
                              </a>
                            ) : (
                              <span className="text-muted-foreground">Not specified</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {contact.primary && (
                              <Badge variant="default">Primary</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Contacts Found</h3>
                    <p className="text-muted-foreground">
                      {contactsLoading ? "Loading contacts..." : "No contacts are associated with this client"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="jobs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Jobs for {client.company || client.name}
                  {jobsLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                </CardTitle>
                <CardDescription>
                  All jobs and services provided to this client
                </CardDescription>
              </CardHeader>
              <CardContent>
                {jobs.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job Number</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Service Type</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobs.map((job) => (
                        <TableRow key={job.id}>
                          <TableCell>
                            <span className="font-mono">{job.job_number}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              job.status.toLowerCase() === 'completed' ? 'default' :
                              job.status.toLowerCase() === 'pending' ? 'secondary' :
                              job.status.toLowerCase() === 'in_progress' ? 'default' : 'outline'
                            }>
                              {job.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{job.service_type}</TableCell>
                          <TableCell>{job.recipient_name}</TableCell>
                          <TableCell>
                            {job.amount ? `$${job.amount.toFixed(2)}` : 'Not specified'}
                          </TableCell>
                          <TableCell>
                            {job.created_at ? new Date(job.created_at).toLocaleDateString() : 'Not specified'}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/jobs/${job.id}`)}
                              className="gap-2"
                            >
                              <ExternalLink className="w-4 h-4" />
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Jobs Found</h3>
                    <p className="text-muted-foreground">
                      {jobsLoading ? "Loading jobs..." : "No jobs are associated with this client"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="raw-data" className="space-y-4">
            {renderRawDataSection(client)}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
