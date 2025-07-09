export interface SnapshotProposal {
  id: string;
  title: string;
  body: string;
  author: string;
  created: number;
  start: number;
  end: number;
  snapshot: string;
  state: 'pending' | 'active' | 'closed';
  link: string;
  space: {
    id: string;
    name: string;
  };
  choices: string[];
  scores: number[];
  scores_total: number;
  votes: number;
}

export interface ProcessedProposal {
  id: string;
  title: string;
  tweetId?: string;
  processedAt: number;
  status: 'queued' | 'tweeted' | 'failed';
  retryCount: number;
}

export interface TweetData {
  text: string;
  proposal: SnapshotProposal;
}

export interface BotConfig {
  // Global Supabase configuration
  supabaseUrl: string;
  supabaseKey: string;
  
  // Global Twitter configuration (centralized for all spaces)
  twitterApiKey: string;
  twitterApiSecret: string;
  twitterAccessToken: string;
  twitterAccessTokenSecret: string;
  
  // Global Snapshot configuration
  snapshotApiUrl: string;
  
  // Global bot configuration
  checkIntervalMinutes: number;
  tweetQueueDelaySeconds: number;
  maxRetries: number;
  logLevel: string;
}

export interface SpaceConfig {
  id: string;
  spaceId: string;
  name: string;
  description?: string;
  network: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QueueItem {
  id: string;
  proposal: SnapshotProposal;
  tweet: TweetData;
  createdAt: number;
  retryCount: number;
}

export interface DatabaseProposal {
  id: string;
  spaceId: string;
  proposalId: string;
  title: string;
  body?: string;
  author: string;
  createdAtSnapshot: number;
  startTime: number;
  endTime: number;
  snapshotBlock?: number;
  state: string;
  link: string;
  choices?: string[];
  scores?: number[];
  scoresTotal?: number;
  votesCount?: number;
  processed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TweetLog {
  id: string;
  proposalId: string;
  spaceId: string;
  tweetId?: string;
  tweetText: string;
  status: 'pending' | 'posted' | 'failed';
  errorMessage?: string;
  retryCount: number;
  postedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BotStatus {
  id: string;
  spaceId: string;
  lastCheckAt: string;
  lastHistoricalImportAt?: string;
  lastProposalId?: string;
  status: 'running' | 'paused' | 'error';
  errorMessage?: string;
  proposalsProcessed: number;
  tweetsPosted: number;
  createdAt: string;
  updatedAt: string;
} 