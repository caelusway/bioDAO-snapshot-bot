import axios from 'axios';
import { SnapshotProposal, BotConfig } from '../types';

export class SnapshotService {
  private apiUrl: string;

  constructor(config: BotConfig) {
    this.apiUrl = config.snapshotApiUrl;
  }

  async getLatestProposals(spaceId: string, limit: number = 10): Promise<SnapshotProposal[]> {
    const query = `
      query Proposals($space: String!, $first: Int!) {
        proposals(
          where: { space: $space }
          first: $first
          orderBy: "created"
          orderDirection: desc
        ) {
          id
          title
          body
          author
          created
          start
          end
          snapshot
          state
          link
          space {
            id
            name
          }
          choices
          scores
          scores_total
          votes
        }
      }
    `;

    const variables = {
      space: spaceId,
      first: limit
    };

    try {
      const response = await axios.post(this.apiUrl, {
        query,
        variables
      });

      if (response.data.errors) {
        throw new Error(`Snapshot API error: ${JSON.stringify(response.data.errors)}`);
      }

      return response.data.data.proposals.map((proposal: any) => ({
        ...proposal,
        link: `https://snapshot.org/#/${spaceId}/proposal/${proposal.id}`
      }));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch proposals: ${error.message}`);
      }
      throw error;
    }
  }

  async getProposalById(proposalId: string, spaceId: string): Promise<SnapshotProposal | null> {
    const query = `
      query Proposal($id: String!) {
        proposal(id: $id) {
          id
          title
          body
          author
          created
          start
          end
          snapshot
          state
          link
          space {
            id
            name
          }
          choices
          scores
          scores_total
          votes
        }
      }
    `;

    const variables = {
      id: proposalId
    };

    try {
      const response = await axios.post(this.apiUrl, {
        query,
        variables
      });

      if (response.data.errors) {
        throw new Error(`Snapshot API error: ${JSON.stringify(response.data.errors)}`);
      }

      const proposal = response.data.data.proposal;
      if (!proposal) {
        return null;
      }

      return {
        ...proposal,
        link: `https://snapshot.org/#/${spaceId}/proposal/${proposal.id}`
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch proposal: ${error.message}`);
      }
      throw error;
    }
  }

  async getActiveProposals(spaceId: string): Promise<SnapshotProposal[]> {
    const proposals = await this.getLatestProposals(spaceId, 50);
    return proposals.filter(proposal => proposal.state === 'active');
  }

  async getNewProposals(spaceId: string, lastChecked: number): Promise<SnapshotProposal[]> {
    const proposals = await this.getLatestProposals(spaceId, 20);
    return proposals.filter(proposal => proposal.created > lastChecked);
  }

  async getProposals(spaceId: string): Promise<SnapshotProposal[]> {
    return this.getLatestProposals(spaceId, 20);
  }

  async getAllHistoricalProposals(spaceId: string, batchSize: number = 100): Promise<SnapshotProposal[]> {
    console.log(`🔍 Fetching all historical proposals for space: ${spaceId}`);
    
    const allProposals: SnapshotProposal[] = [];
    let skip = 0;
    let hasMore = true;
    let batchCount = 0;

    while (hasMore) {
      console.log(`📦 Fetching batch ${batchCount + 1} (skip: ${skip}, first: ${batchSize})`);
      
      const batch = await this.getProposalsBatch(spaceId, batchSize, skip);
      
      if (batch.length === 0) {
        hasMore = false;
        console.log('✅ No more proposals found, stopping pagination');
      } else {
        allProposals.push(...batch);
        skip += batchSize;
        batchCount++;
        
        console.log(`📊 Batch ${batchCount} complete. Found ${batch.length} proposals. Total: ${allProposals.length}`);
        
        // Add a small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Stop if we get less than the batch size (last batch)
        if (batch.length < batchSize) {
          hasMore = false;
          console.log('✅ Last batch detected (fewer than batch size), stopping pagination');
        }
      }
    }

    console.log(`🎉 Historical import complete! Found ${allProposals.length} total proposals for ${spaceId}`);
    return allProposals;
  }

  private async getProposalsBatch(spaceId: string, first: number, skip: number): Promise<SnapshotProposal[]> {
    const query = `
      query Proposals($space: String!, $first: Int!, $skip: Int!) {
        proposals(
          where: { space: $space }
          first: $first
          skip: $skip
          orderBy: "created"
          orderDirection: desc
        ) {
          id
          title
          body
          author
          created
          start
          end
          snapshot
          state
          link
          space {
            id
            name
          }
          choices
          scores
          scores_total
          votes
        }
      }
    `;

    const variables = {
      space: spaceId,
      first,
      skip
    };

    try {
      const response = await axios.post(this.apiUrl, {
        query,
        variables
      });

      if (response.data.errors) {
        throw new Error(`Snapshot API error: ${JSON.stringify(response.data.errors)}`);
      }

      return response.data.data.proposals.map((proposal: any) => ({
        ...proposal,
        link: `https://snapshot.org/#/${spaceId}/proposal/${proposal.id}`
      }));
    } catch (error) {
      console.error(`❌ Error fetching batch (skip: ${skip}):`, error);
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch proposals batch: ${error.message}`);
      }
      throw error;
    }
  }
} 