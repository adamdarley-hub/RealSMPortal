// Comprehensive data mapper for ServeManager API responses
// This extracts ALL available fields, even if we don't use them yet

// Helper function to safely extract string values from potentially nested objects
function safeString(value: any, fallback: string = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value.toString();
  if (typeof value === 'object' && value) {
    // Try common string properties
    return value.name || value.title || value.value || value.text || value.toString?.() || String(value);
  }
  return fallback;
}

export interface ServeManagerJob {
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
  
  // Client information
  client_id?: string;
  client_name?: string;
  client_company?: string;
  client_email?: string;
  client_phone?: string;
  client_address?: any;
  account_id?: string;
  
  // Recipient/defendant information
  recipient_name?: string;
  defendant_name?: string;
  defendant_first_name?: string;
  defendant_last_name?: string;
  defendant_address?: any;
  service_address?: any;
  address?: any;
  
  // Server information
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
  attempts?: any[];
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
  
  // Miscellaneous fields that might exist
  tags?: string[];
  badges?: any[];
  court?: string;
  case_number?: string;
  docket_number?: string;
  plaintiff?: string;
  attorney?: string;
  law_firm?: string;
  
  // Raw data preservation
  _raw?: any; // Store the entire original response
}

export function mapJobFromServeManager(rawJob: any): ServeManagerJob {
  if (!rawJob) return { _raw: rawJob };
  
  // Extract all possible fields
  const mapped: ServeManagerJob = {
    // Identifiers - try all possible variants, ensure strings
    id: safeString(rawJob.id || rawJob.uuid || rawJob.job_id),
    uuid: safeString(rawJob.uuid || rawJob.id),
    job_number: safeString(rawJob.servemanager_job_number || rawJob.job_number || rawJob.generated_job_id || rawJob.reference || rawJob.number),
    generated_job_id: safeString(rawJob.generated_job_id || rawJob.job_number),
    reference: safeString(rawJob.reference || rawJob.ref),

    // Status - ServeManager uses service_status, job_status is often empty
    status: safeString(rawJob.service_status || rawJob.job_status || rawJob.status || 'pending'),
    job_status: safeString(rawJob.job_status || rawJob.service_status),
    // Priority - ServeManager uses 'rush' boolean, convert to priority levels
    priority: rawJob.rush === true ? 'rush' : (rawJob.rush === false ? 'routine' : safeString(rawJob.priority || rawJob.urgency || rawJob.importance || 'routine')),
    urgency: rawJob.rush === true ? 'high' : safeString(rawJob.urgency || rawJob.priority || 'normal'),
    
    // Dates - extract all date fields
    created_at: rawJob.created_at || rawJob.date_created || rawJob.created,
    updated_at: rawJob.updated_at || rawJob.date_updated || rawJob.modified,
    due_date: rawJob.due_date || rawJob.date_due || rawJob.deadline,
    service_date: rawJob.service_date || rawJob.date_served,
    completed_date: rawJob.completed_date || rawJob.date_completed,
    received_date: rawJob.received_date || rawJob.date_received,
    
    // Client information - ServeManager uses client_company and client_contact
    client_id: safeString(rawJob.client_company?.id || rawJob.client_id || rawJob.account_id || rawJob.customer_id),
    client_name: safeString(rawJob.client_contact ? `${rawJob.client_contact.first_name || ''} ${rawJob.client_contact.last_name || ''}`.trim() : (rawJob.client_name || rawJob.client?.name || rawJob.account?.name)),
    client_company: safeString(rawJob.client_company?.name || rawJob.client_company || rawJob.client?.company || rawJob.account?.company),
    client_email: safeString(rawJob.client_contact?.email || rawJob.client_email || rawJob.client?.email || rawJob.account?.email),
    client_phone: safeString(rawJob.client_contact?.phone || rawJob.client_phone || rawJob.client?.phone || rawJob.account?.phone),
    client_address: rawJob.client_address || rawJob.client?.address || rawJob.account?.address,
    account_id: safeString(rawJob.account_id || rawJob.client_id),

    // Recipient/defendant - ServeManager uses recipient.name format
    recipient_name: safeString(rawJob.recipient?.name || rawJob.recipient_name || rawJob.defendant_name || rawJob.defendant?.name || rawJob.service_to) || `${safeString(rawJob.defendant_first_name)} ${safeString(rawJob.defendant_last_name)}`.trim(),
    defendant_name: safeString(rawJob.defendant_name || rawJob.recipient?.name || rawJob.recipient_name),
    defendant_first_name: safeString(rawJob.defendant_first_name || rawJob.first_name),
    defendant_last_name: safeString(rawJob.defendant_last_name || rawJob.last_name),
    // Address - ServeManager stores addresses in addresses array
    defendant_address: rawJob.addresses?.[0] || rawJob.defendant_address || rawJob.service_address || rawJob.address,
    service_address: rawJob.addresses?.[0] || rawJob.service_address || rawJob.defendant_address || rawJob.address,
    address: rawJob.addresses?.[0] || rawJob.address || rawJob.service_address || rawJob.defendant_address,
    
    // Server information - ServeManager uses employee_process_server
    server_id: safeString(rawJob.employee_process_server?.id || rawJob.server_id || rawJob.assigned_server_id),
    server_name: safeString(rawJob.employee_process_server ? `${rawJob.employee_process_server.first_name || ''} ${rawJob.employee_process_server.last_name || ''}`.trim() : (rawJob.server_name || rawJob.assigned_server || rawJob.server?.name)),
    assigned_server: safeString(rawJob.assigned_server || rawJob.server_name),
    assigned_to: safeString(rawJob.assigned_to || rawJob.server_name),
    
    // Financial - try all money fields, also check invoice data
    amount: parseFloat(rawJob.invoice?.total || rawJob.amount || rawJob.price || rawJob.cost || rawJob.fee || rawJob.total || 0),
    price: parseFloat(rawJob.price || rawJob.amount || 0),
    cost: parseFloat(rawJob.cost || rawJob.amount || 0),
    fee: parseFloat(rawJob.fee || rawJob.amount || 0),
    total: parseFloat(rawJob.total || rawJob.invoice?.total || rawJob.amount || 0),
    
    // Service details
    service_type: rawJob.service_type || rawJob.type || rawJob.document_type,
    type: rawJob.type || rawJob.service_type,
    document_type: rawJob.document_type || rawJob.service_type,
    description: rawJob.description || rawJob.service_instructions || rawJob.notes || rawJob.comments,
    notes: rawJob.notes || rawJob.description || rawJob.comments,
    instructions: rawJob.service_instructions || rawJob.instructions || rawJob.special_instructions,
    
    // Attempts
    attempts: rawJob.attempts || rawJob.service_attempts || [],
    attempt_count: rawJob.attempt_count || rawJob.attempts?.length || 0,
    last_attempt: rawJob.last_attempt || rawJob.last_attempt_date,
    last_attempt_date: rawJob.last_attempt_date || rawJob.last_attempt,
    
    // Documents
    documents: rawJob.documents || rawJob.documents_to_be_served || rawJob.files || [],
    attachments: rawJob.misc_attachments || rawJob.attachments || rawJob.files || [],
    affidavit: rawJob.affidavit || rawJob.proof_of_service,
    
    // Location
    gps_coordinates: rawJob.gps_coordinates || rawJob.coordinates,
    latitude: rawJob.latitude || rawJob.lat || rawJob.gps_coordinates?.lat,
    longitude: rawJob.longitude || rawJob.lng || rawJob.gps_coordinates?.lng,
    
    // Additional fields
    tags: rawJob.tags || [],
    badges: rawJob.badges || [],
    court: rawJob.court_case?.court || rawJob.court || rawJob.court_name,
    case_number: rawJob.court_case?.number || rawJob.case_number || rawJob.case_id,
    docket_number: rawJob.docket_number || rawJob.docket,
    plaintiff: rawJob.court_case?.plaintiff || rawJob.plaintiff || rawJob.plaintiff_name,
    attorney: rawJob.attorney || rawJob.attorney_name,
    law_firm: rawJob.law_firm || rawJob.firm_name,
    
    // Always preserve the raw data
    _raw: rawJob
  };
  
  return mapped;
}

export function mapClientFromServeManager(rawClient: any): any {
  if (!rawClient) return { _raw: rawClient };

  // Extract name from various possible formats
  const extractName = () => {
    if (rawClient.name) return rawClient.name;
    if (rawClient.client_name) return rawClient.client_name;
    if (rawClient.contact_name) return rawClient.contact_name;
    if (rawClient.first_name || rawClient.last_name) {
      return `${rawClient.first_name || ''} ${rawClient.last_name || ''}`.trim();
    }
    // Try to get primary contact name
    if (rawClient.contacts && Array.isArray(rawClient.contacts) && rawClient.contacts.length > 0) {
      const primaryContact = rawClient.contacts.find(c => c.primary) || rawClient.contacts[0];
      if (primaryContact.first_name || primaryContact.last_name) {
        return `${primaryContact.first_name || ''} ${primaryContact.last_name || ''}`.trim();
      }
    }
    return null;
  };

  // Extract company from various possible formats
  const extractCompany = () => {
    if (rawClient.company) return rawClient.company;
    if (rawClient.company_name) return rawClient.company_name;
    if (rawClient.business_name) return rawClient.business_name;
    if (rawClient.name && !rawClient.first_name) return rawClient.name; // Company name in name field
    return null;
  };

  // Extract email from various sources
  const extractEmail = () => {
    if (rawClient.email) return rawClient.email;
    if (rawClient.email_address) return rawClient.email_address;
    // Try to get primary contact email
    if (rawClient.contacts && Array.isArray(rawClient.contacts) && rawClient.contacts.length > 0) {
      const primaryContact = rawClient.contacts.find(c => c.primary) || rawClient.contacts[0];
      return primaryContact.email || primaryContact.email_address;
    }
    return null;
  };

  // Extract phone from various sources
  const extractPhone = () => {
    if (rawClient.phone) return rawClient.phone;
    if (rawClient.phone_number) return rawClient.phone_number;
    if (rawClient.telephone) return rawClient.telephone;
    // Try to get primary contact phone
    if (rawClient.contacts && Array.isArray(rawClient.contacts) && rawClient.contacts.length > 0) {
      const primaryContact = rawClient.contacts.find(c => c.primary) || rawClient.contacts[0];
      return primaryContact.phone || primaryContact.phone_number || primaryContact.telephone;
    }
    return null;
  };

  return {
    id: rawClient.id || rawClient.uuid || rawClient.client_id,
    name: extractName(),
    company: extractCompany(),
    email: extractEmail(),
    phone: extractPhone(),
    address: rawClient.address || rawClient.billing_address || rawClient.mailing_address,
    billing_address: rawClient.billing_address || rawClient.address,
    mailing_address: rawClient.mailing_address || rawClient.address,
    created_date: rawClient.created_at || rawClient.date_created || rawClient.created,
    updated_date: rawClient.updated_at || rawClient.date_updated,
    active: rawClient.active !== false, // Default to true unless explicitly false
    status: rawClient.status || (rawClient.active !== false ? 'active' : 'inactive'),
    _raw: rawClient
  };
}

export function mapServerFromServeManager(rawServer: any): any {
  if (!rawServer) return { _raw: rawServer };
  
  return {
    id: rawServer.id || rawServer.uuid || rawServer.server_id,
    name: rawServer.name || rawServer.server_name || 
          `${rawServer.first_name || ''} ${rawServer.last_name || ''}`.trim(),
    first_name: rawServer.first_name,
    last_name: rawServer.last_name,
    email: rawServer.email || rawServer.email_address,
    phone: rawServer.phone || rawServer.phone_number || rawServer.telephone,
    license_number: rawServer.license_number || rawServer.license || rawServer.badge_number,
    active: rawServer.active !== false,
    status: rawServer.status || (rawServer.active !== false ? 'active' : 'inactive'),
    territories: rawServer.territories || rawServer.zones || rawServer.areas || [],
    created_date: rawServer.created_at || rawServer.date_created || rawServer.created,
    _raw: rawServer
  };
}
