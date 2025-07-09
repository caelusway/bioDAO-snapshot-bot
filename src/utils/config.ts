import { config } from 'dotenv';
import { BotConfig } from '../types';

config();

export function loadConfig(): BotConfig {
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_KEY',
    'TWITTER_API_KEY',
    'TWITTER_API_SECRET',
    'TWITTER_ACCESS_TOKEN',
    'TWITTER_ACCESS_TOKEN_SECRET',
    'SNAPSHOT_API_URL'
  ];

  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseKey: process.env.SUPABASE_KEY!,
    twitterApiKey: process.env.TWITTER_API_KEY!,
    twitterApiSecret: process.env.TWITTER_API_SECRET!,
    twitterAccessToken: process.env.TWITTER_ACCESS_TOKEN!,
    twitterAccessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
    snapshotApiUrl: process.env.SNAPSHOT_API_URL!,
    checkIntervalMinutes: parseInt(process.env.CHECK_INTERVAL_MINUTES || '5'),
    tweetQueueDelaySeconds: parseInt(process.env.TWEET_QUEUE_DELAY_SECONDS || '60'),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
    logLevel: process.env.LOG_LEVEL || 'info'
  };
}

export function validateConfig(config: BotConfig): void {
  if (config.checkIntervalMinutes < 1) {
    throw new Error('CHECK_INTERVAL_MINUTES must be at least 1');
  }
  
  if (config.tweetQueueDelaySeconds < 15) {
    throw new Error('TWEET_QUEUE_DELAY_SECONDS must be at least 15 (Twitter API rate limiting)');
  }
  
  if (config.maxRetries < 1) {
    throw new Error('MAX_RETRIES must be at least 1');
  }
} 