import { useState, useEffect, useCallback, useRef } from 'react';

interface SyncStatus {
  isPolling: boolean;
  lastSync: Date | null;
  nextSync: Date | null;
  isSyncing: boolean;
  error: string | null;
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
    error: null
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerSync = useCallback(async (showLoading = true) => {
    if (status.isSyncing) return;

    if (showLoading) {
      setStatus(prev => ({ ...prev, isSyncing: true, error: null }));
    }

    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }

      const result = await response.json();
      
      setStatus(prev => ({
        ...prev,
        lastSync: new Date(),
        nextSync: new Date(Date.now() + interval),
        isSyncing: false,
        error: null
      }));

      // Trigger data refresh in parent component
      if (onDataUpdate) {
        onDataUpdate();
      }

      console.log('🔄 Auto-sync completed:', result);

    } catch (error) {
      console.error('❌ Auto-sync failed:', error);
      setStatus(prev => ({
        ...prev,
        isSyncing: false,
        error: error instanceof Error ? error.message : 'Sync failed'
      }));
    }
  }, [status.isSyncing, interval, onDataUpdate]);

  const startPolling = useCallback(() => {
    if (intervalRef.current || !enabled) return;

    setStatus(prev => ({ 
      ...prev, 
      isPolling: true,
      nextSync: new Date(Date.now() + interval)
    }));

    // Initial sync
    triggerSync(false);

    // Set up recurring sync
    intervalRef.current = setInterval(() => {
      triggerSync(false);
    }, interval);

    console.log(`🚀 Auto-sync started: every ${interval/1000}s`);
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
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
