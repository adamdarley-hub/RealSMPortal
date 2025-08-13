import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  ChevronUp,
  ChevronDown,
  Calendar,
  MapPin,
  User,
} from "lucide-react";
import { Job, Client, Server } from "@shared/servemanager";

type SortField = 'recipient' | 'client' | 'status' | 'priority' | 'server' | 'received_date';
type SortDirection = 'asc' | 'desc';

interface JobsTableProps {
  jobs: Job[];
  clients: Client[];
  servers: Server[];
  searchTerm: string;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}

// Helper function to safely extract string values
const safeString = (value: any, fallback: string = ''): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'object' && value) {
    return value.name || value.title || value.value || value.text || String(value);
  }
  return fallback;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "served": return "bg-success text-success-foreground";
    case "in_progress": return "bg-info text-info-foreground";
    case "assigned": return "bg-warning text-warning-foreground";
    case "pending": return "bg-muted text-muted-foreground";
    case "not_served": return "bg-destructive text-destructive-foreground";
    case "cancelled": return "bg-secondary text-secondary-foreground";
    case "completed": return "bg-success text-success-foreground";
    case "Client Hold": return "bg-orange-500 text-white";
    case "unassigned": return "bg-blue-500 text-white";
    case "": return "bg-blue-500 text-white";
    default: return "bg-muted text-muted-foreground";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "rush": return "bg-destructive text-destructive-foreground border-destructive";
    case "routine": return "bg-muted text-muted-foreground border-muted";
    case "high": return "bg-warning text-warning-foreground border-warning";
    case "medium": return "bg-info text-info-foreground border-info";
    case "low": return "bg-success text-success-foreground border-success";
    default: return "bg-muted text-muted-foreground";
  }
};

const formatReceivedDate = (dateString: string | null) => {
  if (!dateString) return "Unknown";
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const getSortableValue = (job: Job, field: SortField): string => {
  switch (field) {
    case 'recipient':
      return (job.recipient_name || job.defendant_name || job.recipient?.name || 'Unknown Recipient').toLowerCase();
    case 'client':
      const clientCompany = typeof job.client_company === 'string' ? job.client_company :
                           typeof job.client?.company === 'string' ? job.client.company :
                           job.client?.name?.company || job.client?.name;
      const clientName = typeof job.client_name === 'string' ? job.client_name :
                       typeof job.client?.name === 'string' ? job.client.name :
                       job.client?.name?.name;
      return (clientCompany || clientName || 'Unknown Client').toLowerCase();
    case 'status':
      return (job.status || 'pending').toLowerCase();
    case 'priority':
      return (job.priority || 'medium').toLowerCase();
    case 'server':
      const serverName = typeof job.server_name === 'string' ? job.server_name :
                       typeof job.assigned_server === 'string' ? job.assigned_server :
                       typeof job.server?.name === 'string' ? job.server.name :
                       job.server?.name?.name;
      return (serverName || 'unassigned').toLowerCase();
    case 'received_date':
      return job.created_at || job.received_date || '';
    default:
      return '';
  }
};

// Memoized filter and sort function
const useFilteredAndSortedJobs = (jobs: Job[], searchTerm: string, sortField: SortField, sortDirection: SortDirection) => {
  return useMemo(() => {
    // Filter jobs
    const filtered = jobs.filter(job => {
      if (!searchTerm) return true;
      
      const searchLower = searchTerm.toLowerCase();
      return (
        safeString(job.job_number || job.generated_job_id || job.reference).toLowerCase().includes(searchLower) ||
        safeString(job.client?.name || job.client_name || job.client_company).toLowerCase().includes(searchLower) ||
        safeString(job.recipient?.name || job.recipient_name || job.defendant_name).toLowerCase().includes(searchLower) ||
        safeString(job.description || job.notes).toLowerCase().includes(searchLower)
      );
    });

    // Sort jobs
    return filtered.sort((a, b) => {
      const aValue = getSortableValue(a, sortField);
      const bValue = getSortableValue(b, sortField);

      if (sortField === 'received_date') {
        const aDate = new Date(aValue).getTime() || 0;
        const bDate = new Date(bValue).getTime() || 0;
        return sortDirection === 'asc' ? aDate - bDate : bDate - aDate;
      }

      const comparison = aValue.localeCompare(bValue);
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [jobs, searchTerm, sortField, sortDirection]);
};

// Memoized table row component
const JobRow = React.memo(({ job, onJobClick }: { job: Job; onJobClick: (id: string) => void }) => {
  const handleClick = React.useCallback(() => {
    onJobClick(job.id);
  }, [job.id, onJobClick]);

  return (
    <TableRow
      className="hover:bg-muted/50 cursor-pointer"
      onClick={handleClick}
    >
      <TableCell>
        <div>
          <p className="font-medium">
            {(() => {
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
              const getAddressString = (addr: any) => {
                if (typeof addr === 'string') return addr;
                if (typeof addr === 'object' && addr) {
                  const parts = [addr.street1, addr.street2, addr.street, addr.address].filter(Boolean);
                  const street = parts.join(' ');
                  const cityState = [addr.city, addr.state].filter(Boolean).join(', ');
                  const zip = addr.zip || addr.postal_code;
                  const fullAddr = [street, cityState, zip].filter(Boolean).join(', ');
                  return fullAddr || addr.full_address || addr.formatted_address ||
                         `${addr.street || ''} ${addr.city || ''} ${addr.state || ''} ${addr.zip || ''}`.trim();
                }
                return '';
              };

              const address = getAddressString(job.service_address) ||
                            getAddressString(job.defendant_address) ||
                            getAddressString(job.address) ||
                            getAddressString(job.recipient?.address);

              return address || 'Address not available';
            })()}
          </p>
        </div>
      </TableCell>
      <TableCell>
        <div>
          <p className="font-medium">
            {(() => {
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
            {(() => {
              const contactName = typeof job.client_name === 'string' ? job.client_name :
                                job.client_contact ?
                                  `${job.client_contact.first_name || ''} ${job.client_contact.last_name || ''}`.trim() :
                                typeof job.client?.name === 'string' ? job.client.name :
                                job.client?.contact_name;
              return contactName || 'No contact name';
            })()}
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
        {(() => {
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
          {formatReceivedDate(job.created_at || job.received_date)}
        </div>
      </TableCell>
    </TableRow>
  );
});

JobRow.displayName = "JobRow";

export const JobsTable: React.FC<JobsTableProps> = ({
  jobs,
  searchTerm,
  sortField,
  sortDirection,
  onSort,
}) => {
  const navigate = useNavigate();
  
  const filteredAndSortedJobs = useFilteredAndSortedJobs(jobs, searchTerm, sortField, sortDirection);

  const handleJobClick = React.useCallback((jobId: string) => {
    navigate(`/jobs/${jobId}`);
  }, [navigate]);

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ?
      <ChevronUp className="w-4 h-4" /> :
      <ChevronDown className="w-4 h-4" />;
  };

  const handleSort = React.useCallback((field: SortField) => {
    onSort(field);
  }, [onSort]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead
            className="cursor-pointer hover:bg-muted/50 select-none"
            onClick={() => handleSort('recipient')}
          >
            <div className="flex items-center gap-2">
              Recipient
              {getSortIcon('recipient')}
            </div>
          </TableHead>
          <TableHead
            className="cursor-pointer hover:bg-muted/50 select-none"
            onClick={() => handleSort('client')}
          >
            <div className="flex items-center gap-2">
              Client
              {getSortIcon('client')}
            </div>
          </TableHead>
          <TableHead
            className="cursor-pointer hover:bg-muted/50 select-none"
            onClick={() => handleSort('status')}
          >
            <div className="flex items-center gap-2">
              Status
              {getSortIcon('status')}
            </div>
          </TableHead>
          <TableHead
            className="cursor-pointer hover:bg-muted/50 select-none"
            onClick={() => handleSort('priority')}
          >
            <div className="flex items-center gap-2">
              Priority
              {getSortIcon('priority')}
            </div>
          </TableHead>
          <TableHead
            className="cursor-pointer hover:bg-muted/50 select-none"
            onClick={() => handleSort('server')}
          >
            <div className="flex items-center gap-2">
              Server
              {getSortIcon('server')}
            </div>
          </TableHead>
          <TableHead
            className="cursor-pointer hover:bg-muted/50 select-none"
            onClick={() => handleSort('received_date')}
          >
            <div className="flex items-center gap-2">
              Received Date
              {getSortIcon('received_date')}
            </div>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredAndSortedJobs.map((job) => (
          <JobRow key={job.id} job={job} onJobClick={handleJobClick} />
        ))}
      </TableBody>
    </Table>
  );
};
