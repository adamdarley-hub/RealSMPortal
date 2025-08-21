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

    // Check circuit breaker
    if (status.circuitBreakerOpen) {
      console.log('🚫 Circuit breaker is open, skipping auto-sync');
      if (mountedRef.current) {
        setStatus(prev => ({
          ...prev,
          error: 'Auto-sync temporarily disabled due to repeated failures',
          nextSync: new Date(Date.now() + interval * 2) // Double the interval when circuit breaker is open
        }));
      }
      return;
    }

    if (showLoading && mountedRef.current) {
      setStatus(prev => ({ ...prev, isSyncing: true, error: null }));
    }

    try {
      // Add timeout and better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort(new Error('Request timeout after 60 seconds'));
      }, 60000); // 60 second timeout for slow sync operations (increased from 30s)

      console.log('🔄 Starting auto-sync request...');

      // Check if fetch is available (could be blocked by extensions)
      if (typeof fetch === 'undefined') {
        throw new Error('Fetch API is not available');
      }

      // Check for FullStory interference and warn user
      const isFullStoryPresent = window.FS || document.querySelector('script[src*="fullstory"]');
      if (isFullStoryPresent && status.consecutiveFailures > 0) {
        console.warn('���� FullStory detected and causing fetch issues. Consider disabling auto-sync.');
      }

      // Quick health check to see if server is reachable
      try {
        // Create a separate shorter timeout for health check
        const healthController = new AbortController();
        const healthTimeoutId = setTimeout(() => {
          healthController.abort();
        }, 5000); // Reduced to 5 second timeout for health check

        // Use native fetch to avoid FullStory interference
        const nativeFetch = window.fetch.bind(window);
        const healthCheck = await nativeFetch('/api/jobs?limit=1', {
          method: 'GET',
          signal: healthController.signal,
          // Add cache-busting to prevent cached responses from hiding real issues
          cache: 'no-cache',
          // Add timeout to prevent hanging requests
          headers: {
            'Cache-Control': 'no-cache',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest' // Help identify AJAX requests
          },
          // Ensure fetch uses standard implementation, not FullStory intercepted version
          redirect: 'follow',
          mode: 'cors',
          credentials: 'same-origin'
        });

        clearTimeout(healthTimeoutId);

        // Only treat 5xx errors as serious issues, 4xx might be auth/permissions
        if (!healthCheck.ok && healthCheck.status >= 500) {
          console.warn('⚠️ Server returned error status:', healthCheck.status);
          throw new Error(`Server unavailable (${healthCheck.status})`);
        }
      } catch (healthError) {
        // Check if this is an abort error (timeout)
        if (healthError.name === 'AbortError') {
          console.warn('⏰ Health check timed out after 5 seconds, continuing with cached data');
          if (mountedRef.current) {
            setStatus(prev => ({
              ...prev,
              isSyncing: false,
              error: 'Health check timed out - using cached data',
              lastSync: prev.lastSync || new Date()
            }));
          }
          clearTimeout(timeoutId);
          return { success: false, error: 'Health check timeout' };
        }

        // Check if this is a network/fetch error vs server error
        const isNetworkError = healthError.name === 'TypeError' ||
                              healthError.message.includes('Failed to fetch') ||
                              healthError.message.includes('NetworkError') ||
                              healthError.message.includes('fetch');

        if (isNetworkError) {
          console.warn('⚠️ Network connectivity issue, will retry with exponential backoff:', {
            error: healthError.message,
            type: 'network_error',
            consecutiveFailures: status.consecutiveFailures + 1
          });
        } else {
          console.warn('⚠️ Server health check failed, skipping sync:', {
            error: healthError.message,
            name: healthError.name
          });
        }

        // Don't throw, just skip sync and continue with cached data
        if (mountedRef.current) {
          setStatus(prev => ({
            ...prev,
            isSyncing: false,
            error: 'Server unavailable - using cached data',
            lastSync: prev.lastSync || new Date()
          }));
        }
        clearTimeout(timeoutId);
        return { success: false, error: 'Health check failed' };
      }

      // Use native fetch to avoid FullStory interference
      const nativeFetch = window.fetch.bind(window);
      const response = await nativeFetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Requested-With': 'XMLHttpRequest'
        },
        signal: controller.signal,
        // Add retry logic by disabling cache
        cache: 'no-cache',
        credentials: 'same-origin'
      }).catch((fetchError) => {
        console.warn('🌐 Network error during sync:', {
          message: fetchError.message,
          name: fetchError.name,
          stack: fetchError.stack?.substring(0, 200) // Truncated stack trace
        });

        // Check if this might be FullStory interference
        const isFullStoryError = fetchError.stack?.includes('fullstory') ||
                                fetchError.stack?.includes('fs.js') ||
                                (fetchError.name === 'TypeError' && fetchError.message === 'Failed to fetch');

        // Handle different types of network errors
        if (fetchError.name === 'TypeError' && fetchError.message.includes('Failed to fetch')) {
          // Check if FullStory is likely the cause
          const errorMessage = isFullStoryError
            ? 'FullStory interference detected - using cached data'
            : 'Network connection failed - using cached data';

          // Network connection issue - don't crash, just skip sync
          if (mountedRef.current) {
            setStatus(prev => ({
              ...prev,
              isSyncing: false,
              error: errorMessage
            }));
          }
          return null; // Signal to skip processing
        }

        // Check if it's an abort error
        if (fetchError.name === 'AbortError') {
          if (mountedRef.current) {
            setStatus(prev => ({
              ...prev,
              isSyncing: false,
              error: 'Request timeout - using cached data'
            }));
          }
          return null; // Signal to skip processing
        }

        throw new Error(`Network error: ${fetchError.message}`);
      });

      clearTimeout(timeoutId);

      // Handle case where fetch was caught and returned null
      if (!response) {
        console.log('⚠️ Sync skipped due to network error');
        return { success: false, error: 'Network error - using cached data' };
      }

      console.log('📡 Sync response status:', response.status);

      if (!response.ok) {
        const errorMessage = `Sync failed: ${response.status} ${response.statusText}`;
        console.warn('❌ Sync request failed:', errorMessage);

        if (mountedRef.current) {
          setStatus(prev => {
            const newFailures = prev.consecutiveFailures + 1;
            const shouldOpenCircuitBreaker = newFailures >= 3; // Open circuit after 3 consecutive failures

            return {
              ...prev,
              isSyncing: false,
              error: errorMessage,
              consecutiveFailures: newFailures,
              circuitBreakerOpen: shouldOpenCircuitBreaker
            };
          });
        }
        return { success: false, error: errorMessage };
      }

      const result = await response.json();
      console.log('📊 Sync result:', result);

      if (mountedRef.current) {
        setStatus(prev => ({
          ...prev,
          lastSync: new Date(),
          nextSync: new Date(Date.now() + interval),
          isSyncing: false,
          error: null,
          consecutiveFailures: 0, // Reset failure count on success
          circuitBreakerOpen: false // Close circuit breaker on success
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
         error.message.includes('Request timeout') ||
         error.message.includes('Network error') ||
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
          console.log('�� Auto-sync request timed out after 30 seconds, using cached data');
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
        setStatus(prev => {
          const newFailures = prev.consecutiveFailures + 1;
          const shouldOpenCircuitBreaker = newFailures >= 3; // Open circuit after 3 consecutive failures

          return {
            ...prev,
            isSyncing: false,
            error: errorMessage,
            consecutiveFailures: newFailures,
            circuitBreakerOpen: shouldOpenCircuitBreaker
          };
        });
      }

      // Restart polling if it was paused during background sync (even on error)
      // But only if we should retry (don't retry if fetch is blocked)
      if (!showLoading && !intervalRef.current && enabled && mountedRef.current && shouldRetry) {
        // Use exponential backoff for network errors
        const isNetworkError = errorMessage.includes('Network connection failed') ||
                              errorMessage.includes('Failed to fetch') ||
                              errorMessage.includes('Server unavailable');

        const backoffDelay = isNetworkError ? Math.min(interval * 2, 120000) : interval; // Max 2 minutes

        console.log(`��� Restarting auto-sync polling after sync error (delay: ${backoffDelay/1000}s)`);

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

    // Check if FullStory is causing too many issues and disable auto-sync
    if (status.consecutiveFailures >= 3) {
      const isFullStoryPresent = window.FS || document.querySelector('script[src*="fullstory"]');
      if (isFullStoryPresent) {
        console.warn('🔍 Auto-sync disabled due to FullStory interference. Too many consecutive failures.');
        return;
      }
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
        // Trigger a sync when coming back online and restart normal polling
        if (enabled) {
          // Clear any existing intervals with backoff delays
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }

          // Immediate sync attempt
          setTimeout(() => triggerSync(false), 1000); // Small delay to ensure connection is stable

          // Resume normal polling interval
          setTimeout(() => {
            if (mountedRef.current && enabled && !intervalRef.current) {
              intervalRef.current = setInterval(() => {
                if (mountedRef.current) {
                  triggerSync(false);
                }
              }, interval);
            }
          }, 2000);
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
