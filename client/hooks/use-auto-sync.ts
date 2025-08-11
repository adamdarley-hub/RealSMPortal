import { useState, useEffect, useCallback, useRef } from 'react';

interface SyncStatus {
  isPolling: boolean;
  lastSync: Date | null;
  nextSync: Date | null;
  isSyncing: boolean;
  error: string | null;
  isOnline: boolean;
}

interface UseAutoSyncOptions {
  enabled?: boolean;
  interval?: number; // in milliseconds
  onDataUpdate?: () => void;
}

export function useAutoSync(options: UseAutoSyncOptions = {}) {
  const {
    enabled = true,
    interval = 30000, // 30 seconds default
    onDataUpdate
  } = options;

  const [status, setStatus] = useState<SyncStatus>({
    isPolling: false,
    lastSync: null,
    nextSync: null,
    isSyncing: false,
    error: null,
    isOnline: navigator.onLine
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const triggerSync = useCallback(async (showLoading = true) => {
    if (status.isSyncing) {
      console.log('⏭️ Skipping sync - already in progress');
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

    // Temporarily pause polling during sync to prevent timeouts
    if (intervalRef.current && !showLoading) {
      console.log('⏸️ Temporarily pausing auto-sync during background sync');
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (showLoading && mountedRef.current) {
      setStatus(prev => ({ ...prev, isSyncing: true, error: null }));
    }

    try {
      // Add timeout and better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort(new Error('Request timeout after 30 seconds'));
      }, 30000); // 30 second timeout for slow sync operations

      console.log('🔄 Starting auto-sync request...');

      // Check if fetch is available (could be blocked by extensions)
      if (typeof fetch === 'undefined') {
        throw new Error('Fetch API is not available');
      }

      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      }).catch((fetchError) => {
        // Handle network errors more gracefully
        if (fetchError.name === 'TypeError' && fetchError.message.includes('Failed to fetch')) {
          throw new Error('Network connection failed - using cached data');
        }
        throw fetchError;
      });

      clearTimeout(timeoutId);
      console.log('📡 Sync response status:', response.status);

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📊 Sync result:', result);

      if (mountedRef.current) {
        setStatus(prev => ({
          ...prev,
          lastSync: new Date(),
          nextSync: new Date(Date.now() + interval),
          isSyncing: false,
          error: null
        }));
      }

      // Restart polling if it was paused during background sync
      if (!showLoading && !intervalRef.current && enabled && mountedRef.current) {
        console.log('🔄 Restarting auto-sync polling after background sync');
        intervalRef.current = setInterval(() => {
          if (mountedRef.current) {
            triggerSync(false);
          }
        }, interval);
      }

      // Trigger data refresh in parent component
      if (onDataUpdate) {
        onDataUpdate();
      }

      console.log('🔄 Auto-sync completed:', result);

    } catch (error) {
      // Don't log network errors as errors since they're expected
      const isNetworkError = error instanceof Error &&
        (error.message.includes('Network connection failed') ||
         error.message.includes('Failed to fetch') ||
         error.message.includes('Server unavailable'));

      if (isNetworkError) {
        console.log('🌐 Auto-sync network issue:', error.message);
      } else {
        console.error('❌ Auto-sync failed:', error);
      }

      // Handle different types of errors gracefully
      let errorMessage = 'Sync failed';
      let shouldRetry = true;

      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.message.includes('aborted')) {
          errorMessage = 'Sync timeout - using cached data';
          console.log('🕐 Auto-sync request timed out after 30 seconds, using cached data');
        } else if (error.message.includes('Failed to fetch') || error.message.includes('Network connection failed')) {
          errorMessage = 'Server unavailable - using cached data';
          console.log('🌐 Network error detected, will continue with cached data');
        } else if (error.message.includes('Fetch API is not available')) {
          errorMessage = 'Browser fetch blocked - using cached data';
          shouldRetry = false; // Don't keep retrying if fetch is blocked
        } else {
          errorMessage = error.message;
        }
      }

      if (mountedRef.current) {
        setStatus(prev => ({
          ...prev,
          isSyncing: false,
          error: errorMessage
        }));
      }

      // Restart polling if it was paused during background sync (even on error)
      // But only if we should retry (don't retry if fetch is blocked)
      if (!showLoading && !intervalRef.current && enabled && mountedRef.current && shouldRetry) {
        // Use exponential backoff for network errors
        const isNetworkError = errorMessage.includes('Network connection failed') ||
                              errorMessage.includes('Failed to fetch') ||
                              errorMessage.includes('Server unavailable');

        const backoffDelay = isNetworkError ? Math.min(interval * 2, 120000) : interval; // Max 2 minutes

        console.log(`🔄 Restarting auto-sync polling after sync error (delay: ${backoffDelay/1000}s)`);

        intervalRef.current = setInterval(() => {
          if (mountedRef.current) {
            triggerSync(false);
          }
        }, backoffDelay);
      }

      // Don't let sync errors completely break the app
      // Still trigger data refresh to use cached data
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

    if (mountedRef.current) {
      setStatus(prev => ({
        ...prev,
        isPolling: true,
        nextSync: new Date(Date.now() + interval)
      }));
    }

    // Delay initial sync to let page load first
    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        triggerSync(false);
      }
    }, 5000); // Wait 5 seconds before first sync

    // Set up recurring sync
    intervalRef.current = setInterval(() => {
      if (mountedRef.current) {
        triggerSync(false);
      }
    }, interval);

    console.log(`🚀 Auto-sync started: every ${interval/1000}s (first sync in 5s)`);
  }, [enabled, interval, triggerSync]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setStatus(prev => ({
      ...prev,
      isPolling: false,
      isSyncing: false, // Reset syncing state when stopping
      nextSync: null
    }));

    console.log('⏹️ Auto-sync stopped');
  }, []);

  const manualSync = useCallback(() => {
    triggerSync(true);
  }, [triggerSync]);

  // Start/stop polling based on enabled state
  useEffect(() => {
    if (enabled) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => stopPolling();
  }, [enabled, startPolling, stopPolling]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Back online - resuming auto-sync');
      if (mountedRef.current) {
        setStatus(prev => ({ ...prev, isOnline: true, error: null }));
        // Trigger a sync when coming back online
        if (enabled) {
          setTimeout(() => triggerSync(false), 1000); // Small delay to ensure connection is stable
        }
      }
    };

    const handleOffline = () => {
      console.log('🌐 Gone offline - pausing auto-sync');
      if (mountedRef.current) {
        setStatus(prev => ({
          ...prev,
          isOnline: false,
          error: 'Offline - using cached data',
          isSyncing: false
        }));
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enabled, triggerSync]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      stopPolling();
    };
  }, [stopPolling]);

  return {
    status,
    manualSync,
    startPolling,
    stopPolling
  };
}
