import { createClient } from '@supabase/supabase-js';

// Supabase configuration with safe defaults
export const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
export const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'placeholder-key';

// Create Supabase client with error handling
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return supabaseUrl !== 'https://placeholder.supabase.co' &&
         supabaseAnonKey !== 'placeholder-key' &&
         supabaseUrl.includes('supabase.co');
};

// Database table definitions (matching ServeManager structure)
export interface SupabaseJob {
  id: string;
  servemanager_id: number;
  job_number: string;
  client_company: string;
  client_name: string;
  recipient_name: string;
  service_address: string;
  status: string;
  service_status: string;
  priority: string;
  server_name: string;
  created_at: string;
  updated_at: string;
  due_date: string | null;
  amount: number | null;
  raw_data: any; // JSON field for complete ServeManager data
  sync_status: 'synced' | 'pending' | 'error';
  last_synced_at: string;
}

export interface SupabaseClient {
  id: string;
  servemanager_id: number;
  name: string;
  company: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  raw_data: any;
  created_at: string;
  updated_at: string;
  last_synced_at: string;
}

export interface SupabaseServer {
  id: string;
  servemanager_id: number;
  name: string;
  email: string | null;
  phone: string | null;
  raw_data: any;
  created_at: string;
  updated_at: string;
  last_synced_at: string;
}

export interface SupabaseAttempt {
  id: string;
  job_id: string; // Foreign key to jobs table
  servemanager_attempt_id: number;
  status: string;
  attempted_at: string;
  server_name: string;
  method: 'mobile' | 'manual';
  success: boolean;
  serve_type: string | null;
  recipient: string | null;
  address: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  gps_accuracy: number | null;
  raw_data: any;
  created_at: string;
  updated_at: string;
}

export interface SupabasePhoto {
  id: string;
  attempt_id: string; // Foreign key to attempts table
  servemanager_photo_id: number;
  name: string;
  url: string;
  type: string;
  size: number | null;
  raw_data: any;
  created_at: string;
  updated_at: string;
}

// Pagination and filtering types
export interface JobFilters {
  status?: string[];
  priority?: string[];
  client?: string[];
  server?: string[];
  search?: string;
  date_from?: string;
  date_to?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface JobsResponse {
  jobs: SupabaseJob[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

// Real-time subscription types
export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

export interface RealtimePayload<T = any> {
  eventType: RealtimeEvent;
  new: T;
  old: T;
  schema: string;
  table: string;
}
