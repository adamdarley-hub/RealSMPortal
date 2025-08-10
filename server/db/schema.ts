import { sqliteTable, text, integer, real, blob } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Jobs table - stores all job data from ServeManager
export const jobs = sqliteTable('jobs', {
  // Primary key and identifiers
  id: text('id').primaryKey(),
  servemanager_id: text('servemanager_id').unique(),
  uuid: text('uuid'),
  job_number: text('job_number'),
  generated_job_id: text('generated_job_id'),
  reference: text('reference'),
  
  // Status and priority
  status: text('status'),
  job_status: text('job_status'),
  priority: text('priority'),
  urgency: text('urgency'),
  
  // Dates
  created_at: text('created_at'),
  updated_at: text('updated_at'),
  due_date: text('due_date'),
  service_date: text('service_date'),
  completed_date: text('completed_date'),
  received_date: text('received_date'),
  
  // Client information
  client_id: text('client_id'),
  client_name: text('client_name'),
  client_company: text('client_company'),
  client_email: text('client_email'),
  client_phone: text('client_phone'),
  client_address: text('client_address'), // JSON string
  account_id: text('account_id'),
  
  // Recipient information
  recipient_name: text('recipient_name'),
  defendant_name: text('defendant_name'),
  defendant_first_name: text('defendant_first_name'),
  defendant_last_name: text('defendant_last_name'),
  defendant_address: text('defendant_address'), // JSON string
  service_address: text('service_address'), // JSON string
  address: text('address'), // JSON string
  
  // Server information
  server_id: text('server_id'),
  server_name: text('server_name'),
  assigned_server: text('assigned_server'),
  assigned_to: text('assigned_to'),
  
  // Financial information
  amount: real('amount'),
  price: real('price'),
  cost: real('cost'),
  fee: real('fee'),
  total: real('total'),
  
  // Service information
  service_type: text('service_type'),
  type: text('type'),
  document_type: text('document_type'),
  description: text('description'),
  notes: text('notes'),
  instructions: text('instructions'),
  
  // Attempt information
  attempt_count: integer('attempt_count'),
  last_attempt: text('last_attempt'),
  last_attempt_date: text('last_attempt_date'),
  
  // Location data
  latitude: real('latitude'),
  longitude: real('longitude'),
  
  // Additional fields
  court: text('court'),
  case_number: text('case_number'),
  docket_number: text('docket_number'),
  plaintiff: text('plaintiff'),
  attorney: text('attorney'),
  law_firm: text('law_firm'),
  
  // Complex data as JSON
  attempts: text('attempts'), // JSON string
  documents: text('documents'), // JSON string
  attachments: text('attachments'), // JSON string
  gps_coordinates: text('gps_coordinates'), // JSON string
  tags: text('tags'), // JSON string
  badges: text('badges'), // JSON string
  
  // Metadata
  raw_data: text('raw_data'), // Complete original response
  last_synced: text('last_synced').default(sql`CURRENT_TIMESTAMP`),
  created_local: text('created_local').default(sql`CURRENT_TIMESTAMP`),
});

// Clients table
export const clients = sqliteTable('clients', {
  id: text('id').primaryKey(),
  servemanager_id: text('servemanager_id').unique(),
  name: text('name'),
  company: text('company'),
  email: text('email'),
  phone: text('phone'),
  address: text('address'), // JSON string
  billing_address: text('billing_address'), // JSON string
  mailing_address: text('mailing_address'), // JSON string
  created_date: text('created_date'),
  updated_date: text('updated_date'),
  active: integer('active', { mode: 'boolean' }),
  status: text('status'),
  raw_data: text('raw_data'),
  last_synced: text('last_synced').default(sql`CURRENT_TIMESTAMP`),
  created_local: text('created_local').default(sql`CURRENT_TIMESTAMP`),
});

// Servers/employees table
export const servers = sqliteTable('servers', {
  id: text('id').primaryKey(),
  servemanager_id: text('servemanager_id').unique(),
  name: text('name'),
  first_name: text('first_name'),
  last_name: text('last_name'),
  email: text('email'),
  phone: text('phone'),
  license_number: text('license_number'),
  active: integer('active', { mode: 'boolean' }),
  status: text('status'),
  territories: text('territories'), // JSON string
  created_date: text('created_date'),
  raw_data: text('raw_data'),
  last_synced: text('last_synced').default(sql`CURRENT_TIMESTAMP`),
  created_local: text('created_local').default(sql`CURRENT_TIMESTAMP`),
});

// Invoices table
export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey(),
  servemanager_id: text('servemanager_id').unique(),
  invoice_number: text('invoice_number'),
  client_id: text('client_id'),
  client_name: text('client_name'),
  client_company: text('client_company'),
  status: text('status'),
  subtotal: real('subtotal'),
  tax: real('tax'),
  total: real('total'),
  created_date: text('created_date'),
  due_date: text('due_date'),
  paid_date: text('paid_date'),
  jobs: text('jobs'), // JSON string of associated jobs
  raw_data: text('raw_data'),
  last_synced: text('last_synced').default(sql`CURRENT_TIMESTAMP`),
  created_local: text('created_local').default(sql`CURRENT_TIMESTAMP`),
});

// Contacts table
export const contacts = sqliteTable('contacts', {
  id: text('id').primaryKey(),
  servemanager_id: text('servemanager_id').unique(),
  name: text('name'),
  email: text('email'),
  phone: text('phone'),
  address: text('address'), // JSON string
  created_date: text('created_date'),
  raw_data: text('raw_data'),
  last_synced: text('last_synced').default(sql`CURRENT_TIMESTAMP`),
  created_local: text('created_local').default(sql`CURRENT_TIMESTAMP`),
});

// Sync tracking table
export const sync_log = sqliteTable('sync_log', {
  id: integer('id').primaryKey(),
  table_name: text('table_name').unique(),
  last_full_sync: text('last_full_sync'),
  last_incremental_sync: text('last_incremental_sync'),
  last_sync_status: text('last_sync_status'), // 'success', 'error', 'in_progress'
  last_sync_error: text('last_sync_error'),
  records_synced: integer('records_synced'),
  total_records: integer('total_records'),
  sync_duration_ms: integer('sync_duration_ms'),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});
