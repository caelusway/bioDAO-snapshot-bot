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
} 