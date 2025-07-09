import { QueueItem, BotConfig } from '../types';
import { TwitterService } from './twitter';
import { DatabaseService } from './database';

export class QueueService {
  private queue: QueueItem[] = [];
  private isProcessing = false;
  private shouldStop = false;
  private twitterService: TwitterService;
  private databaseService: DatabaseService;
  private config: BotConfig;

  constructor(
    twitterService: TwitterService,
    databaseService: DatabaseService,
    config: BotConfig
  ) {
    this.twitterService = twitterService;
    this.databaseService = databaseService;
    this.config = config;
  }

  async addToQueue(item: QueueItem): Promise<void> {
    // Check if item already exists in queue
    const existingIndex = this.queue.findIndex(qItem => qItem.id === item.id);
    
    if (existingIndex >= 0) {
      console.log(`Proposal ${item.id} already in queue, skipping`);
      return;
    }

    // Check if already processed
    const dbProposal = await this.databaseService.getProposalBySnapshotId(item.id);
    if (dbProposal && dbProposal.processed) {
      console.log(`Proposal ${item.id} already processed, skipping`);
      return;
    }

    this.queue.push(item);
    console.log(`Added proposal ${item.id} to queue. Queue size: ${this.queue.length}`);

    // Create tweet log entry
    if (dbProposal) {
      await this.databaseService.createTweetLog(item.id, item.tweet.text);
    }

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    console.log('Starting queue processing...');

    while (this.queue.length > 0 && !this.shouldStop) {
      const item = this.queue.shift()!;
      
      try {
        await this.processItem(item);
        // Wait between tweets to respect rate limits
        await this.delay(this.config.tweetQueueDelaySeconds * 1000);
      } catch (error) {
        console.error(`Error processing item ${item.id}:`, error);
        await this.handleFailedItem(item, error as Error);
      }
    }

    this.isProcessing = false;
    console.log('Queue processing completed');
  }

  private async processItem(item: QueueItem): Promise<void> {
    console.log(`Processing proposal: ${item.proposal.title}`);

    // Check Twitter rate limits before posting
    await this.twitterService.waitForRateLimit();

    try {
      const result = await this.twitterService.postTweet(item.tweet.text);
      
      // Get the proposal from database
      const dbProposal = await this.databaseService.getProposalBySnapshotId(item.id);
      if (!dbProposal) {
        throw new Error(`Proposal ${item.id} not found in database`);
      }

      // Update tweet log with success
      const tweetLogs = await this.databaseService.getTweetLogsForProposal(dbProposal.id);
      const latestTweetLog = tweetLogs[tweetLogs.length - 1];
      
      if (latestTweetLog) {
        await this.databaseService.updateTweetLog(latestTweetLog.id, {
          tweetId: result.id,
          status: 'posted',
          postedAt: new Date().toISOString()
        });
      }

      // Mark proposal as processed
      await this.databaseService.markProposalAsProcessed(item.id);
      
      console.log(`Successfully tweeted proposal ${item.id}. Tweet ID: ${result.id}`);
    } catch (error: any) {
      if (error.message.includes('rate limit')) {
        // If rate limited, put item back in queue for retry
        console.log(`Rate limited, requeuing item ${item.id}`);
        item.retryCount++;
        this.queue.unshift(item);
        
        // Wait longer before retrying
        await this.delay(15 * 60 * 1000); // Wait 15 minutes
        throw error;
      }
      
      throw error;
    }
  }

  private async handleFailedItem(item: QueueItem, error: Error): Promise<void> {
    item.retryCount++;
    
    if (item.retryCount < this.config.maxRetries) {
      console.log(`Retrying item ${item.id} (attempt ${item.retryCount + 1}/${this.config.maxRetries})`);
      
      // Add delay before retry based on attempt number
      const delayMs = Math.min(
        this.config.tweetQueueDelaySeconds * 1000 * Math.pow(2, item.retryCount),
        5 * 60 * 1000 // Max 5 minutes
      );
      
      await this.delay(delayMs);
      this.queue.push(item);
    } else {
      console.error(`Failed to process item ${item.id} after ${this.config.maxRetries} attempts`);
      
      // Update tweet log with failure
      const dbProposal = await this.databaseService.getProposalBySnapshotId(item.id);
      if (dbProposal) {
        const tweetLogs = await this.databaseService.getTweetLogsForProposal(dbProposal.id);
        const latestTweetLog = tweetLogs[tweetLogs.length - 1];
        
        if (latestTweetLog) {
          await this.databaseService.updateTweetLog(latestTweetLog.id, {
            status: 'failed',
            errorMessage: error.message,
            retryCount: item.retryCount
          });
        }
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getQueueStatus(): { length: number; isProcessing: boolean } {
    return {
      length: this.queue.length,
      isProcessing: this.isProcessing
    };
  }

  async retryFailedProposals(): Promise<void> {
    console.log('Checking for failed proposals to retry...');
    
    const failedTweetLogs = await this.databaseService.getFailedTweetLogs(this.config.maxRetries);
    
    for (const tweetLog of failedTweetLogs) {
      // Only retry if it's been more than 1 hour since last attempt
      const timeSinceLastAttempt = Date.now() - new Date(tweetLog.updatedAt).getTime();
      const oneHour = 60 * 60 * 1000;
      
      if (timeSinceLastAttempt > oneHour) {
        console.log(`Retrying failed tweet log: ${tweetLog.id}`);
        
        // Reset the tweet log for retry
        await this.databaseService.updateTweetLog(tweetLog.id, {
          status: 'pending',
          errorMessage: undefined,
          retryCount: 0
        });
      }
    }
  }

  async stop(): Promise<void> {
    console.log('Stopping queue service...');
    this.shouldStop = true;
    
    // Wait for current processing to complete
    while (this.isProcessing) {
      await this.delay(1000);
    }
    
    this.queue = [];
    console.log('Queue service stopped');
  }

  clearQueue(): void {
    this.queue = [];
    console.log('Queue cleared');
  }
} 