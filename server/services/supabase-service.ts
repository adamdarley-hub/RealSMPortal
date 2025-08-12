import { supabase, SupabaseJob, SupabaseClient, SupabaseServer, SupabaseAttempt, JobFilters, PaginationOptions, JobsResponse } from '../../shared/supabase';
import { Job, Client, Server } from '../../shared/servemanager';

export class SupabaseService {
  
  // Jobs operations
  async getJobs(filters: JobFilters = {}, pagination: PaginationOptions = { page: 1, limit: 50 }): Promise<JobsResponse> {
    try {
      const { page, limit, sort_by = 'created_at', sort_order = 'desc' } = pagination;
      const offset = (page - 1) * limit;

      // Build the query dynamically
      let query = supabase
        .from('jobs')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }
      
      if (filters.priority && filters.priority.length > 0) {
        query = query.in('priority', filters.priority);
      }
      
      if (filters.client && filters.client.length > 0) {
        query = query.in('client_company', filters.client);
      }
      
      if (filters.server && filters.server.length > 0) {
        query = query.in('server_name', filters.server);
      }
      
      if (filters.search) {
        query = query.or(`job_number.ilike.%${filters.search}%,client_company.ilike.%${filters.search}%,recipient_name.ilike.%${filters.search}%,service_address.ilike.%${filters.search}%`);
      }
      
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      // Apply sorting and pagination
      query = query
        .order(sort_by, { ascending: sort_order === 'asc' })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      return {
        jobs: data || [],
        total: count || 0,
        page,
        limit,
        has_more: (count || 0) > offset + limit
      };
    } catch (error) {
      console.error('Error fetching jobs from Supabase:', error);
      throw error;
    }
  }

  async getJobById(id: string): Promise<SupabaseJob | null> {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching job by ID:', error);
      throw error;
    }
  }

  async getJobByServeManagerId(serveManagerId: number): Promise<SupabaseJob | null> {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('servemanager_id', serveManagerId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching job by ServeManager ID:', error);
      throw error;
    }
  }

  async upsertJob(jobData: Partial<SupabaseJob>): Promise<SupabaseJob> {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .upsert({
          ...jobData,
          last_synced_at: new Date().toISOString(),
          sync_status: 'synced'
        }, {
          onConflict: 'servemanager_id'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error upserting job:', error);
      throw error;
    }
  }

  // Clients operations
  async getClients(): Promise<SupabaseClient[]> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching clients from Supabase:', error);
      throw error;
    }
  }

  async upsertClient(clientData: Partial<SupabaseClient>): Promise<SupabaseClient> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .upsert({
          ...clientData,
          last_synced_at: new Date().toISOString()
        }, {
          onConflict: 'servemanager_id'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error upserting client:', error);
      throw error;
    }
  }

  // Servers operations
  async getServers(): Promise<SupabaseServer[]> {
    try {
      const { data, error } = await supabase
        .from('servers')
        .select('*')
        .order('name');

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching servers from Supabase:', error);
      throw error;
    }
  }

  async upsertServer(serverData: Partial<SupabaseServer>): Promise<SupabaseServer> {
    try {
      const { data, error } = await supabase
        .from('servers')
        .upsert({
          ...serverData,
          last_synced_at: new Date().toISOString()
        }, {
          onConflict: 'servemanager_id'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error upserting server:', error);
      throw error;
    }
  }

  // Attempts operations
  async getAttemptsByJobId(jobId: string): Promise<SupabaseAttempt[]> {
    try {
      const { data, error } = await supabase
        .from('attempts')
        .select('*')
        .eq('job_id', jobId)
        .order('attempted_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching attempts:', error);
      throw error;
    }
  }

  async upsertAttempt(attemptData: Partial<SupabaseAttempt>): Promise<SupabaseAttempt> {
    try {
      const { data, error } = await supabase
        .from('attempts')
        .upsert(attemptData, {
          onConflict: 'job_id,servemanager_attempt_id'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error upserting attempt:', error);
      throw error;
    }
  }

  // Real-time subscriptions
  subscribeToJobs(callback: (payload: any) => void) {
    return supabase
      .channel('jobs_channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'jobs'
      }, callback)
      .subscribe();
  }

  subscribeToJobById(jobId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`job_${jobId}_channel`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'jobs',
        filter: `id=eq.${jobId}`
      }, callback)
      .subscribe();
  }

  // Data transformation helpers
  serveManagerJobToSupabase(job: Job): Partial<SupabaseJob> {
    return {
      servemanager_id: parseInt(job.id.toString()),
      job_number: job.job_number || job.generated_job_id || '',
      client_company: job.client_company || job.client_name || '',
      client_name: job.client_name || '',
      recipient_name: job.recipient_name || job.defendant_name || '',
      service_address: this.extractServiceAddress(job),
      status: job.status || job.job_status || 'pending',
      service_status: job.service_status || '',
      priority: job.priority || 'routine',
      server_name: job.server_name || job.process_server_name || '',
      due_date: job.due_date || null,
      amount: job.amount || job.total || job.fee || null,
      raw_data: job
    };
  }

  serveManagerClientToSupabase(client: Client): Partial<SupabaseClient> {
    return {
      servemanager_id: parseInt(client.id.toString()),
      name: client.name || '',
      company: client.company || client.name || '',
      email: client.email || null,
      phone: client.phone || null,
      address: client.address || null,
      raw_data: client
    };
  }

  serveManagerServerToSupabase(server: Server): Partial<SupabaseServer> {
    return {
      servemanager_id: parseInt(server.id.toString()),
      name: server.name || '',
      email: server.email || null,
      phone: server.phone || null,
      raw_data: server
    };
  }

  private extractServiceAddress(job: Job): string {
    const address = job.service_address || job.address || job.defendant_address;
    
    if (typeof address === 'string') return address;
    
    if (typeof address === 'object' && address) {
      const parts = [
        address.street || address.address1 || address.street1,
        address.street2 || address.address2
      ].filter(Boolean);
      
      const street = parts.join(' ');
      const cityState = [address.city, address.state].filter(Boolean).join(', ');
      const zip = address.zip || address.postal_code;
      
      return [street, cityState, zip].filter(Boolean).join(', ');
    }
    
    return '';
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('jobs')
        .select('id')
        .limit(1);
      
      return !error;
    } catch (error) {
      console.error('Supabase health check failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const supabaseService = new SupabaseService();
