import { promises as fs } from 'fs';
import { dirname } from 'path';
import { ProcessedProposal } from '../types';

export class StorageService {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async ensureDirectoryExists(): Promise<void> {
    const dir = dirname(this.filePath);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  async loadProcessedProposals(): Promise<ProcessedProposal[]> {
    try {
      await this.ensureDirectoryExists();
      const data = await fs.readFile(this.filePath, 'utf8');
      return JSON.parse(data);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, return empty array
        return [];
      }
      throw new Error(`Failed to load processed proposals: ${error.message}`);
    }
  }

  async saveProcessedProposals(proposals: ProcessedProposal[]): Promise<void> {
    try {
      await this.ensureDirectoryExists();
      const data = JSON.stringify(proposals, null, 2);
      await fs.writeFile(this.filePath, data, 'utf8');
    } catch (error: any) {
      throw new Error(`Failed to save processed proposals: ${error.message}`);
    }
  }

  async addProcessedProposal(proposal: ProcessedProposal): Promise<void> {
    const proposals = await this.loadProcessedProposals();
    
    // Check if proposal already exists
    const existingIndex = proposals.findIndex(p => p.id === proposal.id);
    
    if (existingIndex >= 0) {
      // Update existing proposal
      proposals[existingIndex] = proposal;
    } else {
      // Add new proposal
      proposals.push(proposal);
    }
    
    await this.saveProcessedProposals(proposals);
  }

  async getProcessedProposal(proposalId: string): Promise<ProcessedProposal | null> {
    const proposals = await this.loadProcessedProposals();
    return proposals.find(p => p.id === proposalId) || null;
  }

  async isProposalProcessed(proposalId: string): Promise<boolean> {
    const proposal = await this.getProcessedProposal(proposalId);
    return proposal !== null && proposal.status === 'tweeted';
  }

  async markProposalAsTweeted(proposalId: string, tweetId: string): Promise<void> {
    const proposal = await this.getProcessedProposal(proposalId);
    
    if (proposal) {
      proposal.tweetId = tweetId;
      proposal.status = 'tweeted';
      proposal.processedAt = Date.now();
      await this.addProcessedProposal(proposal);
    }
  }

  async markProposalAsFailed(proposalId: string, retryCount: number): Promise<void> {
    const proposal = await this.getProcessedProposal(proposalId);
    
    if (proposal) {
      proposal.status = 'failed';
      proposal.retryCount = retryCount;
      proposal.processedAt = Date.now();
      await this.addProcessedProposal(proposal);
    }
  }

  async getFailedProposals(): Promise<ProcessedProposal[]> {
    const proposals = await this.loadProcessedProposals();
    return proposals.filter(p => p.status === 'failed');
  }

  async cleanupOldProposals(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
    const proposals = await this.loadProcessedProposals();
    const cutoffTime = Date.now() - maxAge;
    
    const recentProposals = proposals.filter(p => p.processedAt > cutoffTime);
    
    if (recentProposals.length < proposals.length) {
      console.log(`Cleaned up ${proposals.length - recentProposals.length} old proposals`);
      await this.saveProcessedProposals(recentProposals);
    }
  }
} 