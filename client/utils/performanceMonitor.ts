/**
 * Performance monitoring utility to track API call patterns and timeouts
 */

interface APICallLog {
  endpoint: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'pending' | 'success' | 'error' | 'timeout';
  error?: string;
}

class PerformanceMonitor {
  private apiCalls: Map<string, APICallLog> = new Map();
  private callCounts: Map<string, number> = new Map();
  private lastReported = Date.now();

  startCall(callId: string, endpoint: string): void {
    this.apiCalls.set(callId, {
      endpoint,
      startTime: Date.now(),
      status: 'pending'
    });

    // Track call frequency
    const count = this.callCounts.get(endpoint) || 0;
    this.callCounts.set(endpoint, count + 1);
  }

  endCall(callId: string, success: boolean, error?: string): void {
    const call = this.apiCalls.get(callId);
    if (!call) return;

    const endTime = Date.now();
    call.endTime = endTime;
    call.duration = endTime - call.startTime;
    call.status = success ? 'success' : 'error';
    if (error) call.error = error;

    this.apiCalls.set(callId, call);
  }

  timeoutCall(callId: string): void {
    const call = this.apiCalls.get(callId);
    if (!call) return;

    call.status = 'timeout';
    call.endTime = Date.now();
    call.duration = call.endTime - call.startTime;
    this.apiCalls.set(callId, call);
  }

  getReport(): {
    totalCalls: number;
    timeouts: number;
    errors: number;
    averageDuration: number;
    slowestCalls: APICallLog[];
    spammedEndpoints: { endpoint: string; count: number }[];
  } {
    const calls = Array.from(this.apiCalls.values());
    const completed = calls.filter(c => c.duration !== undefined);
    
    const timeouts = calls.filter(c => c.status === 'timeout').length;
    const errors = calls.filter(c => c.status === 'error').length;
    const avgDuration = completed.length > 0 
      ? completed.reduce((sum, c) => sum + (c.duration || 0), 0) / completed.length 
      : 0;

    const slowestCalls = completed
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, 5);

    const spammedEndpoints = Array.from(this.callCounts.entries())
      .filter(([_, count]) => count > 5)
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalCalls: calls.length,
      timeouts,
      errors,
      averageDuration: Math.round(avgDuration),
      slowestCalls,
      spammedEndpoints
    };
  }

  reportIfNeeded(): void {
    const now = Date.now();
    if (now - this.lastReported > 30000) { // Report every 30 seconds
      const report = this.getReport();
      
      if (report.totalCalls > 0) {
        console.log('📊 Performance Report:', {
          totalCalls: report.totalCalls,
          timeouts: report.timeouts,
          errors: report.errors,
          avgDuration: `${report.averageDuration}ms`
        });

        if (report.spammedEndpoints.length > 0) {
          console.warn('🚨 API Spam Detected:', report.spammedEndpoints);
        }

        if (report.slowestCalls.length > 0) {
          console.warn('🐌 Slowest Calls:', report.slowestCalls.map(c => 
            `${c.endpoint}: ${c.duration}ms`
          ));
        }
      }

      this.lastReported = now;
    }
  }

  clear(): void {
    this.apiCalls.clear();
    this.callCounts.clear();
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Auto-report every 30 seconds
setInterval(() => {
  performanceMonitor.reportIfNeeded();
}, 30000);
