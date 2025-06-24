import { QueueJob, ScanJob } from '../types';
import { LightweightScraper } from '../scraper/LightweightScraper';

export class InMemoryQueue {
  private queue: Map<string, QueueJob> = new Map();
  private processing = false;
  private maxConcurrent = 1; // Single job at a time for free tier
  private scraper: LightweightScraper;

  constructor() {
    this.scraper = new LightweightScraper();
  }
  
  async add(jobData: ScanJob): Promise<string> {
    const jobId = crypto.randomUUID();
    
    this.queue.set(jobId, {
      id: jobId,
      data: jobData,
      status: 'pending',
      createdAt: new Date(),
      attempts: 0
    });
    
    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }
    
    return jobId;
  }
  
  getJobStatus(jobId: string): QueueJob | null {
    return this.queue.get(jobId) || null;
  }
  
  getQueueStats() {
    const jobs = Array.from(this.queue.values());
    return {
      total: jobs.length,
      pending: jobs.filter(job => job.status === 'pending').length,
      processing: jobs.filter(job => job.status === 'processing').length,
      completed: jobs.filter(job => job.status === 'completed').length,
      failed: jobs.filter(job => job.status === 'failed').length
    };
  }
  
  private async processQueue(): Promise<void> {
    this.processing = true;
    
    while (this.queue.size > 0) {
      const pendingJobs = Array.from(this.queue.values())
        .filter(job => job.status === 'pending')
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      
      if (pendingJobs.length === 0) break;
      
      const job = pendingJobs[0];
      job.status = 'processing';
      
      console.log(`Processing job ${job.id} for URL: ${job.data.url}`);
      
      try {
        await this.executeJob(job);
        job.status = 'completed';
        console.log(`Job ${job.id} completed successfully`);
        
        // Clean up completed job after 1 hour
        setTimeout(() => {
          this.queue.delete(job.id);
        }, 60 * 60 * 1000);
        
      } catch (error) {
        job.attempts++;
        console.error(`Job ${job.id} failed (attempt ${job.attempts}):`, error);
        
        if (job.attempts < 3) {
          job.status = 'pending';
          console.log(`Retrying job ${job.id} in 5 seconds...`);
          await this.delay(5000); // Wait 5s before retry
        } else {
          job.status = 'failed';
          console.error(`Job ${job.id} failed permanently after ${job.attempts} attempts`);
          
          // Clean up failed job after 1 hour
          setTimeout(() => {
            this.queue.delete(job.id);
          }, 60 * 60 * 1000);
        }
      }
    }
    
    this.processing = false;
    console.log('Queue processing completed');
  }
  
  private async executeJob(job: QueueJob): Promise<void> {
    await this.scraper.scanWebsite(job.data.url, job.data.sessionId);
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Clean up old completed/failed jobs
  cleanup(): void {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    Array.from(this.queue.entries()).forEach(([jobId, job]) => {
      if ((job.status === 'completed' || job.status === 'failed') && 
          job.createdAt.getTime() < oneHourAgo) {
        this.queue.delete(jobId);
      }
    });
  }
}