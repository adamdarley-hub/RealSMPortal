import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from './use-toast';

interface JobChange {
  jobId: string;
  changeType: 'new_attempt' | 'status_change' | 'document_added' | 'job_updated';
  data: any;
  timestamp: string;
}

interface UseRealTimeJobOptions {
  jobId: string;
  onJobUpdate?: (updatedJob: any) => void;
  onNewAttempt?: (newAttempts: any[]) => void;
  onStatusChange?: (oldStatus: string, newStatus: string) => void;
}

export function useRealTimeJob(options: UseRealTimeJobOptions) {
  const { jobId, onJobUpdate, onNewAttempt, onStatusChange } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      // Create WebSocket connection
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const isDev = import.meta.env.DEV;

      // In development, connect directly to backend (since Vite proxy doesn't handle WebSocket to root)
      // In production, use the same host as the frontend
      const wsUrl = isDev
        ? `${protocol}//localhost:3001`
        : `${protocol}//${window.location.host}`;

      console.log(`🔌 Connecting to real-time updates for job ${jobId} at ${wsUrl}...`);
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('🔌 Real-time connection established');
        setIsConnected(true);
        
        // Subscribe to job updates
        wsRef.current?.send(JSON.stringify({
          type: 'subscribe_job',
          jobId
        }));
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('❌ Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('🔌 Real-time connection closed');
        setIsConnected(false);
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Attempting to reconnect...');
          connect();
        }, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setIsConnected(false);
      };

    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      setIsConnected(false);
    }
  }, [jobId]);

  const handleMessage = useCallback((message: any) => {
    console.log('📡 Received real-time update:', message);
    setLastUpdate(new Date());

    switch (message.type) {
      case 'connected':
        console.log('✅ Real-time updates enabled');
        break;

      case 'subscribed':
        console.log(`📡 Subscribed to job ${message.jobId} updates`);
        break;

      case 'job_change':
        handleJobChange(message as JobChange);
        break;

      case 'pong':
        // Keep-alive response
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }, [onJobUpdate, onNewAttempt, onStatusChange]);

  const handleJobChange = useCallback((change: JobChange) => {
    console.log(`🎉 Job change detected: ${change.changeType}`, change);

    switch (change.changeType) {
      case 'new_attempt':
        if (onNewAttempt && change.data.newAttempts) {
          onNewAttempt(change.data.newAttempts);
        }
        if (onJobUpdate && change.data.job) {
          onJobUpdate(change.data.job);
        }
        toast({
          title: "New Service Attempt!",
          description: `${change.data.newAttempts?.length || 1} new attempt(s) added`,
        });
        break;

      case 'status_change':
        if (onStatusChange) {
          onStatusChange(change.data.oldStatus, change.data.newStatus);
        }
        if (onJobUpdate && change.data.job) {
          onJobUpdate(change.data.job);
        }
        toast({
          title: "Status Updated",
          description: `Job status changed to ${change.data.newStatus}`,
        });
        break;

      case 'document_added':
        if (onJobUpdate && change.data.job) {
          onJobUpdate(change.data.job);
        }
        toast({
          title: "New Document",
          description: "A new document has been added to this job",
        });
        break;

      case 'job_updated':
        if (onJobUpdate && change.data.job) {
          onJobUpdate(change.data.job);
        }
        toast({
          title: "Job Updated",
          description: "Job information has been updated",
        });
        break;
    }
  }, [onJobUpdate, onNewAttempt, onStatusChange, toast]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      // Unsubscribe from job updates
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'unsubscribe_job',
          jobId
        }));
      }
      
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    console.log(`🔌 Disconnected from real-time updates for job ${jobId}`);
  }, [jobId]);

  const sendKeepAlive = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ping' }));
    }
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();
    
    // Send keep-alive every 30 seconds
    const keepAliveInterval = setInterval(sendKeepAlive, 30000);
    
    return () => {
      clearInterval(keepAliveInterval);
      disconnect();
    };
  }, [connect, disconnect, sendKeepAlive]);

  return {
    isConnected,
    lastUpdate,
    reconnect: connect,
    disconnect
  };
}
