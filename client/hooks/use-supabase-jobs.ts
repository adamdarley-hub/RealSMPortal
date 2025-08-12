import { useState, useEffect, useCallback } from 'react';
import { SupabaseJob, JobFilters, PaginationOptions, JobsResponse } from '@shared/supabase';

interface UseSupabaseJobsResult {
  jobs: SupabaseJob[];
  loading: boolean;
  error: string | null;
  total: number;
  hasMore: boolean;
  currentPage: number;
  isRealTime: boolean;
  lastSync: Date | null;
  syncInProgress: boolean;
  loadJobs: (filters?: JobFilters, pagination?: PaginationOptions) => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  triggerSync: () => Promise<void>;
}

export function useSupabaseJobs(
  initialFilters: JobFilters = {},
  initialPagination: PaginationOptions = { page: 1, limit: 50 }
): UseSupabaseJobsResult {
  const [jobs, setJobs] = useState<SupabaseJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isRealTime, setIsRealTime] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [currentFilters, setCurrentFilters] = useState(initialFilters);
  const [currentPagination, setCurrentPagination] = useState(initialPagination);

  const buildQueryParams = useCallback((filters: JobFilters, pagination: PaginationOptions) => {
    const params = new URLSearchParams();
    
    params.set('page', pagination.page.toString());
    params.set('limit', pagination.limit.toString());
    
    if (pagination.sort_by) params.set('sort_by', pagination.sort_by);
    if (pagination.sort_order) params.set('sort_order', pagination.sort_order);
    
    if (filters.search) params.set('search', filters.search);
    if (filters.status?.length) filters.status.forEach(s => params.append('status', s));
    if (filters.priority?.length) filters.priority.forEach(p => params.append('priority', p));
    if (filters.client?.length) filters.client.forEach(c => params.append('client', c));
    if (filters.server?.length) filters.server.forEach(s => params.append('server', s));
    if (filters.date_from) params.set('date_from', filters.date_from);
    if (filters.date_to) params.set('date_to', filters.date_to);
    
    return params.toString();
  }, []);

  const loadJobs = useCallback(async (
    filters: JobFilters = currentFilters,
    pagination: PaginationOptions = currentPagination
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const queryParams = buildQueryParams(filters, pagination);
      const response = await fetch(`/api/v2/jobs?${queryParams}`);
      
      if (!response.ok) {
        // Fallback to legacy API
        console.log('⚠️ Supabase API failed, falling back to legacy...');
        const legacyResponse = await fetch('/api/jobs');
        if (!legacyResponse.ok) {
          throw new Error('Both Supabase and legacy APIs failed');
        }
        
        const legacyData = await legacyResponse.json();
        setJobs(legacyData.jobs || []);
        setTotal(legacyData.total || 0);
        setHasMore(false);
        setIsRealTime(false);
        return;
      }
      
      const data: JobsResponse & { 
        last_sync?: string; 
        sync_in_progress?: boolean;
        source?: string;
        duration_ms?: number;
      } = await response.json();
      
      // Handle pagination - append or replace
      if (pagination.page === 1) {
        setJobs(data.jobs);
      } else {
        setJobs(prev => [...prev, ...data.jobs]);
      }
      
      setTotal(data.total);
      setHasMore(data.has_more);
      setCurrentPage(pagination.page);
      setIsRealTime(data.source === 'supabase');
      
      if (data.last_sync) {
        setLastSync(new Date(data.last_sync));
      }
      
      setSyncInProgress(data.sync_in_progress || false);
      setCurrentFilters(filters);
      setCurrentPagination(pagination);
      
      console.log(`⚡ Loaded ${data.jobs.length} jobs from ${data.source} in ${data.duration_ms}ms`);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load jobs';
      setError(errorMessage);
      console.error('❌ Failed to load jobs:', err);
    } finally {
      setLoading(false);
    }
  }, [currentFilters, currentPagination, buildQueryParams]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    
    const nextPagination = {
      ...currentPagination,
      page: currentPage + 1
    };
    
    await loadJobs(currentFilters, nextPagination);
  }, [hasMore, loading, currentPagination, currentPage, currentFilters, loadJobs]);

  const refresh = useCallback(async () => {
    const refreshPagination = {
      ...currentPagination,
      page: 1
    };
    
    await loadJobs(currentFilters, refreshPagination);
  }, [currentFilters, currentPagination, loadJobs]);

  const triggerSync = useCallback(async () => {
    try {
      setSyncInProgress(true);
      const response = await fetch('/api/v2/sync', { method: 'POST' });
      
      if (!response.ok) {
        throw new Error('Failed to trigger sync');
      }
      
      // Wait a moment then refresh
      setTimeout(() => {
        refresh();
      }, 2000);
      
    } catch (err) {
      console.error('❌ Failed to trigger sync:', err);
      setSyncInProgress(false);
    }
  }, [refresh]);

  // Auto-load on mount
  useEffect(() => {
    loadJobs();
  }, []); // Only run once on mount

  // Set up real-time subscription if using Supabase
  useEffect(() => {
    if (!isRealTime) return;

    // Set up Supabase real-time subscription
    import('@shared/supabase').then(({ supabase }) => {
      const subscription = supabase
        .channel('jobs_realtime')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'jobs'
        }, () => {
          // Refresh data when changes occur
          console.log('🔔 Real-time update received, refreshing jobs...');
          refresh();
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    });
  }, [isRealTime, refresh]);

  return {
    jobs,
    loading,
    error,
    total,
    hasMore,
    currentPage,
    isRealTime,
    lastSync,
    syncInProgress,
    loadJobs,
    loadMore,
    refresh,
    triggerSync
  };
}
