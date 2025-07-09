import { TwitterApi } from 'twitter-api-v2';
import { BotConfig, SnapshotProposal } from '../types';

export class TwitterService {
  private client: TwitterApi;
  
  constructor(config: BotConfig) {
    // Use OAuth 1.0a for posting tweets
    this.client = new TwitterApi({
      appKey: config.twitterApiKey,
      appSecret: config.twitterApiSecret,
      accessToken: config.twitterAccessToken,
      accessSecret: config.twitterAccessTokenSecret,
    });
  }

  async postTweet(text: string): Promise<{ id: string; text: string }> {
    try {
      const response = await this.client.v2.tweet(text);
      return {
        id: response.data.id,
        text: response.data.text
      };
    } catch (error: any) {
      if (error.code === 429) {
        throw new Error('Twitter API rate limit exceeded');
      }
      throw new Error(`Failed to post tweet: ${error.message}`);
    }
  }

  createProposalTweet(proposal: SnapshotProposal, spaceName?: string): string {
    const title = this.truncateTitle(proposal.title, 80);
    const stateEmoji = this.getStateEmoji(proposal.state);
    const voteText = this.getVoteText(proposal);
    const spaceTag = spaceName ? ` ${spaceName}` : '';
    
    // Simple tweet format
    const tweet = `${stateEmoji} New Governance Proposal${spaceTag}

✨ ${title}

${voteText}

🗳️ Vote: ${proposal.link}

#DAO #DeSci #Vote`;

    // Ensure tweet is under 280 characters
    if (tweet.length > 280) {
      return this.createShorterTweet(proposal, title, spaceName);
    }

    return tweet;
  }

  private createShorterTweet(proposal: SnapshotProposal, title: string, spaceName?: string): string {
    const shortenedTitle = this.truncateTitle(proposal.title, 70);
    const stateEmoji = this.getStateEmoji(proposal.state);
    const spaceTag = spaceName ? ` ${spaceName}` : '';
    
    return `${stateEmoji} New Governance Proposal${spaceTag}

✨ ${shortenedTitle}

🗳️ Vote: ${proposal.link}

#DAO #DeSci #Vote`;
  }

  private truncateTitle(title: string, maxLength: number): string {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength - 3) + '...';
  }



  private getStateEmoji(state: string): string {
    switch (state) {
      case 'active':
        return '🟢';  // Green for active - positive and engaging
      case 'pending':
        return '🟡';  // Yellow for pending - caution/waiting
      case 'closed':
        return '✅';  // Checkmark for closed - completed
      default:
        return '📊';  // Chart for other states
    }
  }

  private getVoteText(proposal: SnapshotProposal): string {
    const now = Date.now() / 1000;
    const startTime = proposal.start;
    const endTime = proposal.end;

    if (now < startTime) {
      const hoursUntilStart = Math.ceil((startTime - now) / 3600);
      return `⏱️ Voting begins in ${hoursUntilStart}h - Get ready!`;
    } else if (now < endTime) {
      const hoursUntilEnd = Math.ceil((endTime - now) / 3600);
      if (hoursUntilEnd <= 24) {
        return `⚡ URGENT: Only ${hoursUntilEnd}h left to vote!`;
      } else {
        return `⏰ ${hoursUntilEnd}h remaining - Don't miss out!`;
      }
    } else {
      return `✅ Voting has ended`;
    }
  }

  async checkRateLimit(): Promise<{ remaining: number; reset: number }> {
    try {
      // For v2 API, we'll rely on the queue delay system rather than checking rate limits
      // Twitter v2 API allows 300 tweets per 15 minutes for free tier
      return {
        remaining: 300, // Assume we have remaining tweets
        reset: Date.now() + 900000 // 15 minutes from now
      };
    } catch (error: any) {
      if (error.code === 429) {
        return {
          remaining: 0,
          reset: Date.now() + 900000 // 15 minutes default
        };
      }
      
      // If we can't check rate limits, assume we have some remaining
      return {
        remaining: 10,
        reset: Date.now() + 900000
      };
    }
  }

  async waitForRateLimit(): Promise<void> {
    const rateLimit = await this.checkRateLimit();
    
    if (rateLimit.remaining === 0) {
      const waitTime = (rateLimit.reset - Date.now()) + 5000; // Add 5 seconds buffer
      console.log(`Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
} 