import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Scale,
  Calendar,
  FileText,
  Users,
  Building,
  MapPin,
  Phone,
  Mail,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CaseDetail {
  id: string;
  case_number: string;
  plaintiff: string;
  defendant: string;
  court_name: string;
  court_county: string;
  court_state: string;
  court_address: string;
  filing_date: string;
  case_status: string;
  assigned_manager: string;
  next_hearing: string;
  next_deadline: string;
  description: string;
}

interface Party {
  id: string;
  name: string;
  type: 'plaintiff' | 'defendant' | 'witness';
  agent_for_service: string;
  service_status: string;
  address: string;
  phone?: string;
  email?: string;
  attempts: number;
  last_attempt: string;
  affidavit_status: string;
}

interface Hearing {
  id: string;
  date: string;
  time: string;
  type: string;
  location: string;
  status: string;
  notes: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  upload_date: string;
  status: string;
  download_url: string;
}

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [parties, setParties] = useState<Party[]>([]);
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCaseData = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      // Mock case data - in real app this would be API calls
      const mockCase: CaseDetail = {
        id: id,
        case_number: '2024-CV-001234',
        plaintiff: 'Smith Industries LLC',
        defendant: 'Johnson Manufacturing Corp',
        court_name: 'Superior Court of Travis County',
        court_county: 'Travis',
        court_state: 'TX',
        court_address: '1000 Guadalupe Street, Austin, TX 78701',
        filing_date: '2024-01-15',
        case_status: 'active',
        assigned_manager: 'Sarah Johnson',
        next_hearing: '2024-02-20',
        next_deadline: '2024-02-15',
        description: 'Contract dispute regarding manufacturing agreement and delivery terms.'
      };

      const mockParties: Party[] = [
        {
          id: '1',
          name: 'Johnson Manufacturing Corp',
          type: 'defendant',
          agent_for_service: 'CT Corporation System',
          service_status: 'served',
          address: '123 Industrial Blvd, Austin, TX 78745',
          phone: '(512) 555-0123',
          email: 'legal@johnsonmfg.com',
          attempts: 2,
          last_attempt: '2024-01-25',
          affidavit_status: 'returned'
        },
        {
          id: '2',
          name: 'Robert Johnson (CEO)',
          type: 'defendant',
          agent_for_service: 'Personal Service',
          service_status: 'pending',
          address: '456 Oak Street, Austin, TX 78703',
          attempts: 1,
          last_attempt: '2024-01-28',
          affidavit_status: 'awaiting'
        }
      ];

      const mockHearings: Hearing[] = [
        {
          id: '1',
          date: '2024-02-20',
          time: '09:00 AM',
          type: 'Initial Hearing',
          location: 'Courtroom 3A',
          status: 'scheduled',
          notes: 'Parties to discuss preliminary matters'
        },
        {
          id: '2',
          date: '2024-03-15',
          time: '10:30 AM',
          type: 'Discovery Conference',
          location: 'Courtroom 2B',
          status: 'tentative',
          notes: 'Subject to completion of service'
        }
      ];

      const mockDocuments: Document[] = [
        {
          id: '1',
          name: 'Original Petition',
          type: 'petition',
          upload_date: '2024-01-15',
          status: 'filed',
          download_url: '/api/documents/1/download'
        },
        {
          id: '2',
          name: 'Service Affidavit - Johnson Mfg',
          type: 'affidavit',
          upload_date: '2024-01-26',
          status: 'completed',
          download_url: '/api/documents/2/download'
        }
      ];

      setCaseDetail(mockCase);
      setParties(mockParties);
      setHearings(mockHearings);
      setDocuments(mockDocuments);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load case details';
      setError(errorMessage);
      console.error('Error loading case details:', error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    loadCaseData();
  }, [loadCaseData]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "served": case "completed": case "filed": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "pending": case "scheduled": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "awaiting": case "tentative": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "returned": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="ml-2">Loading case details...</span>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !caseDetail) {
    return (
      <Layout>
        <div className="p-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
                <h3 className="text-lg font-semibold">Case Not Found</h3>
                <p className="text-muted-foreground">{error || 'The requested case could not be found.'}</p>
                <Button onClick={() => navigate('/')} className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const servedParties = parties.filter(p => p.service_status === 'served').length;
  const totalParties = parties.length;

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Scale className="w-8 h-8" />
              {caseDetail.case_number}
            </h1>
            <p className="text-muted-foreground">
              {caseDetail.plaintiff} vs. {caseDetail.defendant}
            </p>
          </div>
        </div>

        {/* Case Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Case Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Court</label>
                <p className="font-semibold">{caseDetail.court_name}</p>
                <p className="text-sm text-muted-foreground">{caseDetail.court_county}, {caseDetail.court_state}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Filing Date</label>
                <p className="font-semibold">{new Date(caseDetail.filing_date).toLocaleDateString()}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Case Manager</label>
                <p className="font-semibold">{caseDetail.assigned_manager}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Next Hearing</label>
                <p className="font-semibold">{new Date(caseDetail.next_hearing).toLocaleDateString()}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Service Progress</label>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{servedParties}/{totalParties} parties served</span>
                    <span>{Math.round((servedParties / totalParties) * 100)}%</span>
                  </div>
                  <Progress value={(servedParties / totalParties) * 100} className="h-2" />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <Badge className={getStatusColor(caseDetail.case_status)}>
                  {caseDetail.case_status}
                </Badge>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Description</label>
              <p className="mt-1">{caseDetail.description}</p>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="parties" className="space-y-4">
          <TabsList>
            <TabsTrigger value="parties">Parties & Service</TabsTrigger>
            <TabsTrigger value="hearings">Hearings & Deadlines</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="parties" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Parties & Service Status
                </CardTitle>
                <CardDescription>
                  Service progress and contact information for all parties
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Party Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Agent for Service</TableHead>
                      <TableHead>Service Status</TableHead>
                      <TableHead>Attempts</TableHead>
                      <TableHead>Affidavit</TableHead>
                      <TableHead>Contact Info</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parties.map((party) => (
                      <TableRow key={party.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{party.name}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {party.address}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {party.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{party.agent_for_service}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(party.service_status)}>
                            {party.service_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{party.attempts}</p>
                            <p className="text-sm text-muted-foreground">
                              Last: {new Date(party.last_attempt).toLocaleDateString()}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(party.affidavit_status)}>
                            {party.affidavit_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {party.phone && (
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="w-3 h-3" />
                                {party.phone}
                              </div>
                            )}
                            {party.email && (
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="w-3 h-3" />
                                {party.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hearings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Hearings & Deadlines
                </CardTitle>
                <CardDescription>
                  Scheduled court dates and important deadlines
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hearings.map((hearing) => (
                      <TableRow key={hearing.id}>
                        <TableCell className="font-medium">
                          {new Date(hearing.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{hearing.time}</TableCell>
                        <TableCell>{hearing.type}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-muted-foreground" />
                            {hearing.location}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(hearing.status)}>
                            {hearing.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{hearing.notes}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Case Documents
                </CardTitle>
                <CardDescription>
                  Petitions, affidavits, returns, and other case documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Upload Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((document) => (
                      <TableRow key={document.id}>
                        <TableCell className="font-medium">{document.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {document.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(document.upload_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(document.status)}>
                            {document.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="gap-2">
                            <Download className="w-4 h-4" />
                            Download
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {documents.length === 0 && (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Documents</h3>
                    <p className="text-muted-foreground">
                      No documents have been uploaded for this case yet
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
