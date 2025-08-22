import { EventEmitter } from 'events';

interface JobChange {
  jobId: string;
  changeType: 'new_attempt' | 'status_change' | 'document_added' | 'job_updated';
  data: any;
  timestamp: Date;
}

class ChangeDetector extends EventEmitter {
  private jobSnapshots: Map<string, any> = new Map();
  private isMonitoring = false;
  private monitorInterval: NodeJS.Timeout | null = null;

  async startMonitoring(jobIds: string[] = []) {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('🔍 Starting intelligent change detection...');

    // Take initial snapshots
    await this.takeSnapshots(jobIds);

    // Check for changes every 10 seconds (balanced between responsiveness and API load)
    this.monitorInterval = setInterval(async () => {
      await this.detectChanges(jobIds);
    }, 10000);
  }

  async stopMonitoring() {
    this.isMonitoring = false;
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    console.log('🛑 Stopped change detection');
  }

  private async takeSnapshots(jobIds: string[]) {
    console.log('📸 Serverless mode: Skipping snapshots to prevent API spam');
    // In serverless mode, we don't need snapshots since we fetch fresh data every time
    return;
  }

  private async detectChanges(jobIds: string[]) {
    console.log('🔍 Serverless mode: Skipping change detection to prevent API spam');
    // In serverless mode, we don't need change detection since we fetch fresh data every time
    return;
  }

  private async _detectChanges_disabled(jobIds: string[]) {
    try {
      const { makeServeManagerRequest } = await import('../routes/servemanager');

      // Only check a few jobs at a time to avoid overwhelming the API
      const jobsToCheck = Array.from(this.jobSnapshots.entries()).slice(0, 5);

      for (const [jobId, snapshot] of jobsToCheck) {
        try {
          const freshJob = await makeServeManagerRequest(`/jobs/${jobId}`);
          const currentState = {
            attemptCount: freshJob.attempts?.length || 0,
            lastUpdated: freshJob.updated_at,
            status: freshJob.service_status,
            lastAttemptId: freshJob.attempts?.[freshJob.attempts.length - 1]?.id,
            documentCount: freshJob.documents_to_be_served?.length || 0
          };

          // Detect specific changes
          const changes: JobChange[] = [];

          // New attempt detected
          if (currentState.attemptCount > snapshot.attemptCount) {
            const newAttempts = freshJob.attempts?.slice(snapshot.attemptCount) || [];
            changes.push({
              jobId,
              changeType: 'new_attempt',
              data: { newAttempts, job: freshJob },
              timestamp: new Date()
            });
            console.log(`🎉 New attempt detected for job ${jobId}!`);
          }

          // Status change
          if (currentState.status !== snapshot.status) {
            changes.push({
              jobId,
              changeType: 'status_change',
              data: { oldStatus: snapshot.status, newStatus: currentState.status, job: freshJob },
              timestamp: new Date()
            });
            console.log(`📈 Status change for job ${jobId}: ${snapshot.status} → ${currentState.status}`);
          }

          // New documents
          if (currentState.documentCount > snapshot.documentCount) {
            changes.push({
              jobId,
              changeType: 'document_added',
              data: { job: freshJob },
              timestamp: new Date()
            });
            console.log(`📄 New document for job ${jobId}`);
          }

          // Job updated (catch-all for other changes)
          if (currentState.lastUpdated !== snapshot.lastUpdated) {
            changes.push({
              jobId,
              changeType: 'job_updated',
              data: { job: freshJob },
              timestamp: new Date()
            });
          }

          // Emit changes and update snapshot
          for (const change of changes) {
            this.emit('change', change);
          }

          if (changes.length > 0) {
            this.jobSnapshots.set(jobId, currentState);
            
            // Update local cache immediately
            await this.updateLocalCache(jobId, freshJob);
          }

        } catch (error) {
          console.log(`⚠️ Could not check job ${jobId} for changes:`, error.message);
        }
      }
    } catch (error) {
      console.error('❌ Change detection failed:', error);
    }
  }

  private async updateLocalCache(jobId: string, freshJobData: any) {
    try {
      const { cacheService } = await import('./cache-service');
      
      // Update just this one job in the cache
      await cacheService.updateSingleJob(jobId, freshJobData);
      console.log(`💾 Updated cache for job ${jobId}`);
    } catch (error) {
      console.error(`❌ Failed to update cache for job ${jobId}:`, error);
    }
  }

  // Add a job to monitoring
  addJobToMonitoring(jobId: string) {
    if (!this.jobSnapshots.has(jobId)) {
      this.takeSnapshots([jobId]);
    }
  }

  // Get current monitored jobs
  getMonitoredJobs(): string[] {
    return Array.from(this.jobSnapshots.keys());
  }
}

// Singleton instance
export const changeDetector = new ChangeDetector();
