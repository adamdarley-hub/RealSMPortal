export interface Job {
  id: string;
  job_number: string;
  client: {
    id: string;
    name: string;
    company?: string;
  };
  recipient: {
    name: string;
    address: {
      street: string;
      city: string;
      state: string;
      zip: string;
      full_address: string;
    };
  };
  status: 'pending' | 'assigned' | 'in_progress' | 'served' | 'not_served' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'rush';
  server: {
    id: string;
    name: string;
  } | null;
  due_date: string | null;
  created_date: string;
  amount: number;
  description: string;
  service_type: string;
  attempts?: ServiceAttempt[];
}

export interface ServiceAttempt {
  id: string;
  job_id: string;
  attempt_date: string;
  result: 'served' | 'not_served' | 'refused' | 'no_answer';
  description: string;
  server_notes?: string;
  photos?: string[];
  gps_coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  billing_address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  created_date: string;
  active: boolean;
}

export interface Server {
  id: string;
  name: string;
  email: string;
  phone: string;
  license_number?: string;
  active: boolean;
  territories?: string[];
  created_date: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  client: {
    id: string;
    name: string;
    company: string;
  };
  jobs: {
    id: string;
    job_number: string;
    amount: number;
  }[];
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  tax: number;
  total: number;
  created_date: string;
  due_date: string;
  paid_date?: string;
}

export interface JobsResponse {
  jobs: Job[];
  total: number;
  limit: number;
  offset: number;
}

export interface ClientsResponse {
  clients: Client[];
  total: number;
  limit: number;
  offset: number;
}

export interface ServersResponse {
  servers: Server[];
  total: number;
  limit: number;
  offset: number;
}

export interface InvoicesResponse {
  invoices: Invoice[];
  total: number;
  limit: number;
  offset: number;
}

export interface JobFilters {
  status?: string;
  priority?: string;
  client_id?: string;
  server_id?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}
