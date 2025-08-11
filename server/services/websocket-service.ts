import { WebSocketServer, WebSocket } from 'ws';
import { changeDetector } from './change-detector';

interface ClientConnection {
  ws: WebSocket;
  subscribedJobs: Set<string>;
  clientId: string;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ClientConnection> = new Map();
  private server: any = null;

  init(server: any) {
    try {
      this.server = server;
      this.wss = new WebSocketServer({ server });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientId = this.generateClientId();
      console.log(`🔌 Client ${clientId} connected`);

      const client: ClientConnection = {
        ws,
        subscribedJobs: new Set(),
        clientId
      };

      this.clients.set(clientId, client);

      // Handle messages from client
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(clientId, message);
        } catch (error) {
          console.error('❌ Invalid WebSocket message:', error);
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        console.log(`🔌 Client ${clientId} disconnected`);
        this.clients.delete(clientId);
      });

      // Send welcome message
      this.sendToClient(clientId, {
        type: 'connected',
        clientId,
        message: 'Real-time updates enabled'
      });
    });

    // Listen for changes from change detector
    changeDetector.on('change', (change) => {
      this.broadcastChange(change);
    });

      console.log('🌐 WebSocket service initialized');
    } catch (error) {
      console.warn('⚠️ WebSocket service initialization failed:', error.message);
      console.log('🔄 Real-time updates will be disabled');
    }
  }

  private handleClientMessage(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'subscribe_job':
        if (message.jobId) {
          client.subscribedJobs.add(message.jobId);
          // Add this job to change detection
          changeDetector.addJobToMonitoring(message.jobId);
          console.log(`📡 Client ${clientId} subscribed to job ${message.jobId}`);
          
          // Send confirmation
          this.sendToClient(clientId, {
            type: 'subscribed',
            jobId: message.jobId
          });
        }
        break;

      case 'unsubscribe_job':
        if (message.jobId) {
          client.subscribedJobs.delete(message.jobId);
          console.log(`📡 Client ${clientId} unsubscribed from job ${message.jobId}`);
        }
        break;

      case 'ping':
        this.sendToClient(clientId, { type: 'pong' });
        break;
    }
  }

  private broadcastChange(change: any) {
    const message = {
      type: 'job_change',
      ...change
    };

    // Send to all clients subscribed to this job
    for (const [clientId, client] of this.clients.entries()) {
      if (client.subscribedJobs.has(change.jobId)) {
        this.sendToClient(clientId, message);
      }
    }

    console.log(`📡 Broadcasted ${change.changeType} for job ${change.jobId} to ${this.getSubscribedClientCount(change.jobId)} clients`);
  }

  private sendToClient(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`❌ Failed to send message to client ${clientId}:`, error);
      }
    }
  }

  private getSubscribedClientCount(jobId: string): number {
    let count = 0;
    for (const client of this.clients.values()) {
      if (client.subscribedJobs.has(jobId)) {
        count++;
      }
    }
    return count;
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public methods
  getConnectedClients(): number {
    return this.clients.size;
  }

  getMonitoredJobs(): string[] {
    const jobIds = new Set<string>();
    for (const client of this.clients.values()) {
      for (const jobId of client.subscribedJobs) {
        jobIds.add(jobId);
      }
    }
    return Array.from(jobIds);
  }

  // Force broadcast a change (for manual triggers)
  forceChangeNotification(jobId: string, changeType: string, data: any) {
    this.broadcastChange({
      jobId,
      changeType,
      data,
      timestamp: new Date()
    });
  }
}

// Singleton instance
export const webSocketService = new WebSocketService();
