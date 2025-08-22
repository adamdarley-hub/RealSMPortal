import { useState, useEffect, useCallback, useRef } from 'react';

interface SyncStatus {
  isPolling: boolean;
  lastSync: Date | null;
  nextSync: Date | null;
  isSyncing: boolean;
  error: string | null;
  isOnline: boolean;
  consecutiveFailures: number;
  circuitBreakerOpen: boolean;
}

interface UseAutoSyncOptions {
  enabled?: boolean;
  interval?: number; // in milliseconds
  onDataUpdate?: () => void;
}

export function useAutoSync(options: UseAutoSyncOptions = {}) {
  const {
    enabled = false, // Disabled by default to prevent timeout issues
    interval = 60000, // 60 seconds default (increased from 30s to reduce server load)
    onDataUpdate
  } = options;

  const [status, setStatus] = useState<SyncStatus>({
    isPolling: false,
    lastSync: null,
    nextSync: null,
    isSyncing: false,
    error: null,
    isOnline: navigator.onLine,
    consecutiveFailures: 0,
    circuitBreakerOpen: false
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const triggerSync = useCallback(async (showLoading = true) => {
    if (status.isSyncing) {
      console.log('⏭️ Skipping sync - already in progress');
      return;
    }

    // Circuit breaker pattern - if too many failures, temporarily disable
    if (status.circuitBreakerOpen) {
      console.log('🔌 Circuit breaker open - skipping sync');
      if (mountedRef.current) {
        setStatus(prev => ({
          ...prev,
          error: 'Auto-sync temporarily disabled due to repeated failures',
          nextSync: new Date(Date.now() + interval * 2) // Double the interval when circuit breaker is open
        }));
      }
      return;
    }

    // Check network connectivity first
    if (!navigator.onLine) {
      console.log('🌐 Offline - skipping sync, using cached data');
      if (mountedRef.current) {
        setStatus(prev => ({
          ...prev,
          isOnline: false,
          error: 'Offline - using cached data'
        }));
      }
      if (onDataUpdate) {
        onDataUpdate(); // Still trigger data refresh with cached data
      }
      return;
    }

    // Update online status
    if (mountedRef.current) {
      setStatus(prev => ({ ...prev, isOnline: true }));
    }

    if (showLoading && mountedRef.current) {
      setStatus(prev => ({ ...prev, isSyncing: true, error: null }));
    }

    try {
      // Add timeout and better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort(new Error('Request timeout after 60 seconds'));
      }, 60000); // 60 second timeout for slow sync operations

      console.log('🔄 Starting auto-sync request...');

      // Check if fetch is available (could be blocked by extensions)
      if (typeof fetch === 'undefined') {
        throw new Error('Fetch API is not available');
      }

      // Try multiple health check endpoints in order of preference
      const healthEndpoints = [
        '/api/v2/jobs?limit=1',   // Supabase (ultra-fast)
        '/api/jobs?limit=1',      // Cached backend
        '/api/sync/status',       // Sync status check
      ];

      let healthCheckPassed = false;
      
      for (const endpoint of healthEndpoints) {
        try {
          console.log(`🏥 Health check trying: ${endpoint}`);
          const healthController = new AbortController();
          const healthTimeoutId = setTimeout(() => {
            healthController.abort(new Error('Health check timeout after 10 seconds'));
          }, 10000);

          const healthCheck = await fetch(endpoint, {
            method: 'GET',
            signal: healthController.signal,
            cache: 'no-cache',
            headers: {
              'Cache-Control': 'no-cache',
              'Accept': 'application/json'
            },
            redirect: 'follow',
            mode: 'cors'
          });

          clearTimeout(healthTimeoutId);
          
          if (healthCheck.ok) {
            console.log(`✅ Health check passed with: ${endpoint}`);
            healthCheckPassed = true;
            break;
          }
        } catch (endpointError) {
          console.log(`❌ Health check failed for ${endpoint}:`, endpointError);
          continue; // Try next endpoint
        }
      }
      
      if (!healthCheckPassed) {
        throw new Error('All health check endpoints failed');
      }

      // Perform actual sync
      const syncResponse = await fetch('/api/sync', {
        method: 'POST',
        signal: controller.signal,
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Accept': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      let result = { success: false, message: 'Unknown error' };
      
      if (syncResponse.ok) {
        result = await syncResponse.json();
      } else {
        result = { success: false, message: `HTTP ${syncResponse.status}` };
      }

      if (mountedRef.current) {
        setStatus(prev => ({
          ...prev,
          isSyncing: false,
          lastSync: new Date(),
          nextSync: new Date(Date.now() + interval),
          error: result.success ? null : result.message,
          consecutiveFailures: result.success ? 0 : prev.consecutiveFailures + 1,
          circuitBreakerOpen: prev.consecutiveFailures >= 4 // Open circuit breaker after 5 failures
        }));
      }

      if (result.success && onDataUpdate) {
        onDataUpdate();
      }

      console.log('🔄 Auto-sync completed:', result);

    } catch (error) {
      console.log('❌ Auto-sync failed:', error);
      
      const isNetworkError = error instanceof Error && (
        error.name === 'TypeError' ||
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError') ||
        error.message.includes('fetch')
      );

      if (mountedRef.current) {
        setStatus(prev => ({
          ...prev,
          isSyncing: false,
          error: isNetworkError ? 'Network error - using cached data' : error instanceof Error ? error.message : 'Sync failed',
          consecutiveFailures: prev.consecutiveFailures + 1,
          circuitBreakerOpen: prev.consecutiveFailures >= 4
        }));
      }

      // Still trigger data refresh with cached data if available
      if (onDataUpdate && !showLoading) {
        console.log('📦 Triggering data refresh with cached data due to sync error');
        onDataUpdate();
      }
    }
  }, [status.isSyncing, interval, onDataUpdate]);

  const startPolling = useCallback(() => {
    if (intervalRef.current || !enabled || !mountedRef.current) {
      console.log('⏭️ Skipping start polling - already running or disabled or unmounted');
      return;
    }

    console.log(`🔄 Starting auto-sync polling every ${interval}ms`);
    
    if (mountedRef.current) {
      setStatus(prev => ({ 
        ...prev, 
        isPolling: true,
        nextSync: new Date(Date.now() + interval)
      }));
    }

    // Initial sync
    triggerSync(false);

    // Set up interval
    intervalRef.current = setInterval(() => {
      if (mountedRef.current) {
        triggerSync(false);
      }
    }, interval);
  }, [enabled, interval, triggerSync]);

  const stopPolling = useCallback(() => {
    console.log('⏹️ Stopping auto-sync polling');
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (mountedRef.current) {
      setStatus(prev => ({ 
        ...prev, 
        isPolling: false,
        isSyncing: false,
        nextSync: null
      }));
    }
  }, []);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Back online - resuming auto-sync');
      if (mountedRef.current) {
        setStatus(prev => ({ ...prev, isOnline: true, error: null }));
      }
      if (enabled && intervalRef.current) {
        triggerSync(false);
      }
    };

    const handleOffline = () => {
      console.log('🌐 Gone offline - pausing auto-sync');
      if (mountedRef.current) {
        setStatus(prev => ({ ...prev, isOnline: false, error: 'Offline - using cached data' }));
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enabled, triggerSync]);

  // Start/stop polling based on enabled state
  useEffect(() => {
    if (enabled) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [enabled, startPolling, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      stopPolling();
    };
  }, [stopPolling]);

  return {
    status,
    triggerSync: () => triggerSync(true),
    startPolling,
    stopPolling
  };
}
