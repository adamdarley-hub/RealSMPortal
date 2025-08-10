export interface Job {
  // Core identifiers
  id?: string;
  uuid?: string;
  job_number?: string;
  generated_job_id?: string;
  reference?: string;

  // Status and priority
  status?: string;
  job_status?: string;
  priority?: string;
  urgency?: string;

  // Dates and timing
  created_at?: string;
  updated_at?: string;
  due_date?: string;
  service_date?: string;
  completed_date?: string;
  received_date?: string;

  // Client information (backward compatibility)
  client?: {
    id?: string;
    name?: string;
    company?: string;
  };
  // Direct client fields
  client_id?: string;
  client_name?: string;
  client_company?: string;
  client_email?: string;
  client_phone?: string;
  client_address?: any;
  account_id?: string;

  // Recipient information (backward compatibility)
  recipient?: {
    name?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
      full_address?: string;
    };
  };
  // Direct recipient fields
  recipient_name?: string;
  defendant_name?: string;
  defendant_first_name?: string;
  defendant_last_name?: string;
  defendant_address?: any;
  service_address?: any;
  address?: any;

  // Server information (backward compatibility)
  server?: {
    id?: string;
    name?: string;
  } | null;
  // Direct server fields
  server_id?: string;
  server_name?: string;
  assigned_server?: string;
  assigned_to?: string;

  // Financial information
  amount?: number;
  price?: number;
  cost?: number;
  fee?: number;
  total?: number;

  // Service information
  service_type?: string;
  type?: string;
  document_type?: string;
  description?: string;
  notes?: string;
  instructions?: string;

  // Attempt information
  attempts?: ServiceAttempt[];
  attempt_count?: number;
  last_attempt?: string;
  last_attempt_date?: string;

  // Documents
  documents?: any[];
  attachments?: any[];
  affidavit?: any;

  // GPS and location
  gps_coordinates?: any;
  latitude?: number;
  longitude?: number;

  // Additional fields
  tags?: string[];
  badges?: any[];
  court?: string;
  case_number?: string;
  docket_number?: string;
  plaintiff?: string;
  attorney?: string;
  law_firm?: string;

  // Backward compatibility fields
  created_date?: string; // Maps to created_at

  // Raw data preservation
  _raw?: any;
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
