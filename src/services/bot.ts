import { BotConfig, SnapshotProposal, QueueItem, SpaceConfig } from '../types';
import { SnapshotService } from './snapshot';
import { TwitterService } from './twitter';
import { DatabaseService } from './database';
import { QueueService } from './queue';

export class BioDAOBot {
  private snapshotService: SnapshotService;
  private twitterService: TwitterService;
  private databaseService: DatabaseService;
  private queueService: QueueService;
  private config: BotConfig;
  private lastCheckTime: number = 0;

  constructor(config: BotConfig) {
    this.config = config;
    this.snapshotService = new SnapshotService(config);
    this.twitterService = new TwitterService(config);
    this.databaseService = new DatabaseService(config);
    this.queueService = new QueueService(
      this.twitterService,
      this.databaseService,
      config
    );
  }

  async initialize(): Promise<void> {
    console.log('🚀 Initializing bioDAO Multi-Space Snapshot Bot...');
    
    try {
      // Test Twitter connection
      await this.testTwitterConnection();
      
      // Test Snapshot connection
      await this.testSnapshotConnection();
      
      // Test Database connection
      await this.testDatabaseConnection();
      
      // Set initial check time to 24 hours ago to catch recent proposals
      this.lastCheckTime = Date.now() - (24 * 60 * 60 * 1000);
      
      console.log('✅ Bot initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize bot:', error);
      throw error;
    }
  }

  private async testTwitterConnection(): Promise<void> {
    try {
      await this.twitterService.checkRateLimit();
      console.log('✅ Twitter API connection successful');
    } catch (error) {
      console.error('❌ Twitter API connection failed:', error);
      throw new Error('Twitter API connection failed');
    }
  }

  private async testSnapshotConnection(): Promise<void> {
    try {
      // Test with the first active space
      const activeSpaces = await this.databaseService.getActiveSpaces();
      if (activeSpaces.length === 0) {
        console.log('⚠️ No active spaces found in database');
        return;
      }
      
      await this.snapshotService.getLatestProposals(activeSpaces[0].spaceId, 1);
      console.log('✅ Snapshot API connection successful');
    } catch (error) {
      console.error('❌ Snapshot API connection failed:', error);
      throw new Error('Snapshot API connection failed');
    }
  }

  private async testDatabaseConnection(): Promise<void> {
    try {
      await this.databaseService.getActiveSpaces();
      console.log('✅ Database connection successful');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw new Error('Database connection failed');
    }
  }

  async checkForNewProposals(): Promise<void> {
    console.log('🔍 Checking for new proposals across all spaces...');
    
    try {
      // Get all active spaces
      const activeSpaces = await this.databaseService.getActiveSpaces();
      
      if (activeSpaces.length === 0) {
        console.log('No active spaces found');
        return;
      }

      console.log(`Found ${activeSpaces.length} active spaces`);
      
      // Process each space
      for (const space of activeSpaces) {
        await this.checkSpaceForNewProposals(space);
      }
      
      // Update last check time
      this.lastCheckTime = Date.now();
      
    } catch (error) {
      console.error('Error checking for new proposals:', error);
    }
  }

  private async checkSpaceForNewProposals(space: SpaceConfig): Promise<void> {
    console.log(`🔍 Checking space: ${space.name} (${space.spaceId})`);
    
    try {
      // Get all recent proposals from Snapshot
      const snapshotProposals = await this.snapshotService.getProposals(space.spaceId);
      
      if (snapshotProposals.length === 0) {
        console.log(`No proposals found for ${space.name}`);
        return;
      }

      console.log(`Found ${snapshotProposals.length} proposals from Snapshot for ${space.name}`);
      
      // Filter out already processed proposals
      const unprocessedProposals = [];
      for (const proposal of snapshotProposals) {
        const existingProposal = await this.databaseService.getProposalBySnapshotId(proposal.id);
        if (!existingProposal || !existingProposal.processed) {
          unprocessedProposals.push(proposal);
        }
      }
      
      if (unprocessedProposals.length === 0) {
        console.log(`No new proposals found for ${space.name}`);
        return;
      }

      console.log(`Found ${unprocessedProposals.length} new proposals for ${space.name}`);
      
      // Process each new proposal
      for (const proposal of unprocessedProposals) {
        await this.processProposal(space, proposal);
      }
      
      // Update bot status
      await this.updateBotStatus(space.spaceId);
      
    } catch (error) {
      console.error(`Error checking space ${space.name}:`, error);
      await this.updateBotStatus(space.spaceId, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async processProposal(space: SpaceConfig, proposal: SnapshotProposal): Promise<void> {
    console.log(`📋 Processing proposal: ${proposal.title} for ${space.name}`);
    
    try {
      // Only tweet for active proposals or proposals that just started
      if (proposal.state !== 'active' && proposal.state !== 'pending') {
        console.log(`Skipping proposal ${proposal.id} - state is ${proposal.state}`);
        return;
      }

      // Save proposal to database
      let dbProposal = await this.databaseService.getProposalBySnapshotId(proposal.id);
      if (!dbProposal) {
        dbProposal = await this.databaseService.createProposal(space.spaceId, proposal);
      }

      // Create tweet text
      const tweetText = this.twitterService.createProposalTweet(proposal);
      
      // Add to tweet queue
      const queueItem: QueueItem = {
        id: proposal.id,
        proposal,
        tweet: {
          text: tweetText,
          proposal
        },
        createdAt: Date.now(),
        retryCount: 0
      };

      await this.queueService.addToQueue(queueItem);
      
    } catch (error) {
      console.error(`Error processing proposal ${proposal.id}:`, error);
    }
  }

  async checkActiveProposals(): Promise<void> {
    console.log('🔍 Checking active proposals for updates...');
    
    try {
      const activeSpaces = await this.databaseService.getActiveSpaces();
      
      for (const space of activeSpaces) {
        const activeProposals = await this.snapshotService.getActiveProposals(space.spaceId);
        
        console.log(`Found ${activeProposals.length} active proposals for ${space.name}`);
        
        // Update proposals in database
        for (const proposal of activeProposals) {
          try {
            await this.databaseService.updateProposal(proposal.id, {
              state: proposal.state,
              scores: proposal.scores,
              scoresTotal: proposal.scores_total,
              votesCount: proposal.votes
            });
          } catch (error) {
            console.error(`Error updating proposal ${proposal.id}:`, error);
          }
        }
        
        // Log active proposals
        for (const proposal of activeProposals) {
          const timeUntilEnd = proposal.end * 1000 - Date.now();
          const hoursUntilEnd = Math.ceil(timeUntilEnd / (1000 * 60 * 60));
          
          console.log(`  📊 [${space.name}] ${proposal.title} - ${hoursUntilEnd}h remaining`);
        }
      }
      
    } catch (error) {
      console.error('Error checking active proposals:', error);
    }
  }

  async performMaintenance(): Promise<void> {
    console.log('🧹 Performing maintenance...');
    
    try {
      // Retry failed tweet logs
      await this.queueService.retryFailedProposals();
      
      console.log('✅ Maintenance completed');
    } catch (error) {
      console.error('Error during maintenance:', error);
    }
  }

  async shouldRunHistoricalImport(): Promise<boolean> {
    console.log('🔍 Checking if historical import should run...');
    
    try {
      const spaces = await this.databaseService.getActiveSpaces();
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      // Check if any space needs historical import (hasn't been done in 24h)
      for (const space of spaces) {
        const botStatus = await this.databaseService.getBotStatus(space.spaceId);
        
        if (!botStatus?.lastHistoricalImportAt) {
          console.log(`📚 Space ${space.name} has never had historical import`);
          return true;
        }
        
        const lastImport = new Date(botStatus.lastHistoricalImportAt);
        if (lastImport < oneDayAgo) {
          console.log(`📚 Space ${space.name} last imported ${Math.round((now.getTime() - lastImport.getTime()) / (1000 * 60 * 60))}h ago`);
          return true;
        }
      }
      
      console.log('⏭️ All spaces have recent historical imports (within 24h)');
      return false;
      
    } catch (error) {
      console.error('❌ Error checking historical import status:', error);
      return false;
    }
  }

  async importHistoricalData(spaceId?: string): Promise<{
    spaces: number;
    created: number;
    updated: number;
    skipped: number;
  }> {
    console.log('📚 Starting historical data import...');
    
    try {
      // Get spaces to process
      let spaces: SpaceConfig[] = [];
      if (spaceId) {
        const space = await this.databaseService.getSpaceById(spaceId);
        if (space) {
          spaces = [space];
        }
      } else {
        spaces = await this.databaseService.getActiveSpaces();
      }
      
      if (spaces.length === 0) {
        console.log('No spaces found for historical import');
        return { spaces: 0, created: 0, updated: 0, skipped: 0 };
      }

      console.log(`Found ${spaces.length} spaces for historical import`);
      
      let totalResults = {
        spaces: 0,
        created: 0,
        updated: 0,
        skipped: 0
      };

      const now = new Date().toISOString();
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Process each space
      for (const space of spaces) {
        try {
          // Check if this space needs historical import (if we're doing all spaces)
          if (!spaceId) {
            const botStatus = await this.databaseService.getBotStatus(space.spaceId);
            if (botStatus?.lastHistoricalImportAt) {
              const lastImport = new Date(botStatus.lastHistoricalImportAt);
              if (lastImport > oneDayAgo) {
                console.log(`⏭️ Skipping ${space.name} - imported ${Math.round((Date.now() - lastImport.getTime()) / (1000 * 60 * 60))}h ago`);
                continue;
              }
            }
          }
          
          console.log(`\n📚 Importing historical data for: ${space.name} (${space.spaceId})`);
          
          // Get all historical proposals
          const proposals = await this.snapshotService.getAllHistoricalProposals(space.spaceId);
          
          if (proposals.length === 0) {
            console.log(`No proposals found for space ${space.spaceId}`);
            // Still update the timestamp even if no proposals found
            await this.databaseService.updateBotStatus(space.spaceId, {
              lastHistoricalImportAt: now
            });
            continue;
          }
          
          // Batch import to database
          const results = await this.databaseService.batchCreateProposals(space.spaceId, proposals);
          
          // Update totals
          totalResults.created += results.created;
          totalResults.updated += results.updated;
          totalResults.skipped += results.skipped;
          totalResults.spaces++;
          
          // Update bot status with successful import time
          await this.databaseService.updateBotStatus(space.spaceId, {
            lastHistoricalImportAt: now
          });
          
          console.log(`✅ Imported ${results.created} new proposals for ${space.name}`);
          
        } catch (error) {
          console.error(`❌ Error importing historical data for ${space.spaceId}:`, error);
          totalResults.skipped++;
        }
      }
      
      console.log(`\n📊 Historical import complete:`);
      console.log(`  Spaces processed: ${totalResults.spaces}/${spaces.length}`);
      console.log(`  Created: ${totalResults.created}`);
      console.log(`  Updated: ${totalResults.updated}`);
      console.log(`  Skipped: ${totalResults.skipped}`);
      
      return totalResults;
      
    } catch (error) {
      console.error('❌ Error during historical data import:', error);
      throw error;
    }
  }

  private async updateBotStatus(spaceId: string, errorMessage?: string): Promise<void> {
    try {
      const status = await this.databaseService.getBotStatus(spaceId);
      const updates = {
        lastCheckAt: new Date().toISOString(),
        status: errorMessage ? 'error' as const : 'running' as const,
        errorMessage
      };
      
      if (status) {
        await this.databaseService.updateBotStatus(spaceId, updates);
      }
    } catch (error) {
      console.error(`Error updating bot status for space ${spaceId}:`, error);
    }
  }

  getStatus(): {
    lastCheckTime: number;
    queueStatus: { length: number; isProcessing: boolean };
  } {
    return {
      lastCheckTime: this.lastCheckTime,
      queueStatus: this.queueService.getQueueStatus()
    };
  }

  async manualTweetProposal(proposalId: string): Promise<void> {
    console.log(`🎯 Manually tweeting proposal: ${proposalId}`);
    
    try {
      // Find the proposal in database
      const dbProposal = await this.databaseService.getProposalBySnapshotId(proposalId);
      if (!dbProposal) {
        throw new Error(`Proposal ${proposalId} not found in database`);
      }

      // Get the space
      const space = await this.databaseService.getSpaceById(dbProposal.spaceId);
      if (!space) {
        throw new Error(`Space not found for proposal ${proposalId}`);
      }

      // Get fresh data from Snapshot
      const proposal = await this.snapshotService.getProposalById(proposalId, space.spaceId);
      if (!proposal) {
        throw new Error(`Proposal ${proposalId} not found on Snapshot`);
      }

      await this.processProposal(space, proposal);
      
    } catch (error) {
      console.error(`Error manually tweeting proposal ${proposalId}:`, error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    console.log('🛑 Stopping bot...');
    
    try {
      await this.queueService.stop();
      console.log('✅ Bot stopped successfully');
    } catch (error) {
      console.error('❌ Error stopping bot:', error);
      throw error;
    }
  }
} 