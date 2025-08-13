import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { JobFilters, Client, Server } from "@shared/servemanager";

interface JobsFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filters: JobFilters;
  onFilterChange: (key: keyof JobFilters, value: string | undefined) => void;
  onClearFilters: () => void;
  clients: Client[];
  servers: Server[];
}

export const JobsFilters: React.FC<JobsFiltersProps> = React.memo(({
  searchTerm,
  onSearchChange,
  filters,
  onFilterChange,
  onClearFilters,
  clients,
  servers,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Search</label>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Status</label>
        <Select
          value={filters.status || "all"}
          onValueChange={(value) => onFilterChange('status', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="unassigned">New/Unassigned</SelectItem>
            <SelectItem value="Client Hold">Client Hold</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="served">Served</SelectItem>
            <SelectItem value="not_served">Not Served</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Priority</label>
        <Select
          value={filters.priority || "all"}
          onValueChange={(value) => onFilterChange('priority', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="rush">Rush</SelectItem>
            <SelectItem value="routine">Routine</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Client</label>
        <Select
          value={filters.client_id || "all"}
          onValueChange={(value) => onFilterChange('client_id', value)}
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
          onValueChange={(value) => onFilterChange('server_id', value)}
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
        <Button variant="outline" onClick={onClearFilters} className="w-full">
          Clear Filters
        </Button>
      </div>
    </div>
  );
});

JobsFilters.displayName = "JobsFilters";
