import { loadConfig } from './utils/config';
import { DatabaseService } from './services/database';
import { TwitterService } from './services/twitter';
import { QueueService } from './services/queue';

async function debugTweetIssue() {
  console.log('🔍 Debugging Tweet Issue...\n');
  
  try {
    const config = loadConfig();
    console.log('📊 Configuration Check:');
    console.log(`  ✅ Supabase URL: ${config.supabaseUrl ? 'SET' : 'NOT SET'}`);
    console.log(`  ✅ Supabase Key: ${config.supabaseKey ? 'SET' : 'NOT SET'}`);
    console.log(`  ✅ Twitter API Key: ${config.twitterApiKey ? 'SET' : 'NOT SET'}`);
    console.log(`  ✅ Twitter API Secret: ${config.twitterApiSecret ? 'SET' : 'NOT SET'}`);
    console.log(`  ✅ Twitter Access Token: ${config.twitterAccessToken ? 'SET' : 'NOT SET'}`);
    console.log(`  ✅ Twitter Access Secret: ${config.twitterAccessTokenSecret ? 'SET' : 'NOT SET'}`);
    console.log(`  ✅ Tweet Queue Delay: ${config.tweetQueueDelaySeconds}s`);
    console.log(`  ✅ Max Retries: ${config.maxRetries}`);
    console.log('');
    
    // Check for missing Twitter config
    if (!config.twitterApiKey || !config.twitterApiSecret || !config.twitterAccessToken || !config.twitterAccessTokenSecret) {
      console.error('❌ CRITICAL: Twitter API credentials are not fully configured!');
      console.error('   This will prevent tweets from being posted.');
      console.error('   Please set all required Twitter environment variables:');
      console.error('   - TWITTER_API_KEY');
      console.error('   - TWITTER_API_SECRET');
      console.error('   - TWITTER_ACCESS_TOKEN');
      console.error('   - TWITTER_ACCESS_TOKEN_SECRET');
      return;
    }
    
    // Initialize services
    const databaseService = new DatabaseService(config);
    const twitterService = new TwitterService(config);
    const queueService = new QueueService(twitterService, databaseService, config);
    
    // Test Twitter connection
    console.log('🐦 Testing Twitter Connection...');
    try {
      await twitterService.checkRateLimit();
      console.log('✅ Twitter API connection successful');
    } catch (error) {
      console.error('❌ Twitter API connection failed:', error);
      console.error('   This will prevent tweets from being posted.');
      return;
    }
    console.log('');
    
    // Get active spaces
    console.log('🏢 Checking Active Spaces...');
    const activeSpaces = await databaseService.getActiveSpaces();
    console.log(`Found ${activeSpaces.length} active spaces:`);
    
    for (const space of activeSpaces) {
      console.log(`  - ${space.name} (${space.spaceId})`);
    }
    
    if (activeSpaces.length === 0) {
      console.error('❌ No active spaces found! This could be the issue.');
      return;
    }
    console.log('');
    
    // Check proposals for each space
    console.log('📋 Checking Proposals...');
    for (const space of activeSpaces) {
      console.log(`\n📍 Space: ${space.name} (${space.spaceId})`);
      
      // Get all proposals for this space
      const allProposals = await databaseService.getProposalsForSpace(space.spaceId);
      console.log(`  Total proposals in database: ${allProposals.length}`);
      
      // Get unprocessed proposals
      const unprocessedProposals = await databaseService.getProposalsForSpace(space.spaceId, false);
      console.log(`  Unprocessed proposals: ${unprocessedProposals.length}`);
      
      // Check each unprocessed proposal
      for (const proposal of unprocessedProposals) {
        console.log(`\n    📝 Proposal: ${proposal.title}`);
        console.log(`       ID: ${proposal.proposalId}`);
        console.log(`       State: ${proposal.state}`);
        console.log(`       Processed: ${proposal.processed}`);
        console.log(`       Created: ${new Date(proposal.createdAtSnapshot * 1000).toLocaleString()}`);
        console.log(`       Start: ${new Date(proposal.startTime * 1000).toLocaleString()}`);
        console.log(`       End: ${new Date(proposal.endTime * 1000).toLocaleString()}`);
        
        // Check if this proposal should be tweeted
        if (proposal.state === 'active' || proposal.state === 'pending') {
          console.log('       ✅ This proposal SHOULD be tweeted (state is active/pending)');
          
          // Check tweet logs
          const tweetLogs = await databaseService.getTweetLogsForProposal(proposal.id);
          console.log(`       Tweet logs: ${tweetLogs.length}`);
          
          for (const log of tweetLogs) {
            console.log(`         - Status: ${log.status}, Created: ${new Date(log.createdAt).toLocaleString()}`);
            if (log.errorMessage) {
              console.log(`         - Error: ${log.errorMessage}`);
            }
            if (log.tweetId) {
              console.log(`         - Tweet ID: ${log.tweetId}`);
            }
          }
          
          // Generate tweet text to see what it would look like
          const tweetText = twitterService.createProposalTweet({
            id: proposal.proposalId,
            title: proposal.title,
            body: proposal.body || '',
            author: proposal.author,
            created: proposal.createdAtSnapshot,
            start: proposal.startTime,
            end: proposal.endTime,
            snapshot: proposal.snapshotBlock?.toString() || '0',
            state: proposal.state,
            link: proposal.link,
            space: {
              id: space.spaceId,
              name: space.name
            },
            choices: proposal.choices || [],
            scores: proposal.scores || [],
            scores_total: proposal.scoresTotal || 0,
            votes: proposal.votesCount || 0
          }, space.name);
          
          console.log(`       Tweet text (${tweetText.length} chars):`);
          console.log(`       "${tweetText}"`);
          
        } else {
          console.log(`       ❌ This proposal will NOT be tweeted (state is ${proposal.state})`);
        }
      }
    }
    
    // Check queue status
    console.log('\n📤 Checking Queue Status...');
    const queueStatus = queueService.getQueueStatus();
    console.log(`  Queue length: ${queueStatus.length}`);
    console.log(`  Is processing: ${queueStatus.isProcessing}`);
    
    // Check failed tweet logs
    console.log('\n❌ Checking Failed Tweet Logs...');
    const failedLogs = await databaseService.getFailedTweetLogs(config.maxRetries);
    console.log(`  Failed tweet logs: ${failedLogs.length}`);
    
    for (const log of failedLogs) {
      console.log(`    - Proposal: ${log.proposalId}`);
      console.log(`      Error: ${log.errorMessage}`);
      console.log(`      Retry count: ${log.retryCount}`);
      console.log(`      Last updated: ${new Date(log.updatedAt).toLocaleString()}`);
    }
    
    console.log('\n🎯 Summary and Recommendations:');
    console.log('='.repeat(50));
    
    // Provide specific recommendations
    let issuesFound = false;
    
    if (activeSpaces.length === 0) {
      console.log('❌ No active spaces found - check your database');
      issuesFound = true;
    }
    
    let totalUnprocessed = 0;
    let totalTweetable = 0;
    
    for (const space of activeSpaces) {
      const unprocessed = await databaseService.getProposalsForSpace(space.spaceId, false);
      totalUnprocessed += unprocessed.length;
      
      const tweetable = unprocessed.filter(p => p.state === 'active' || p.state === 'pending');
      totalTweetable += tweetable.length;
    }
    
    console.log(`📊 Total unprocessed proposals: ${totalUnprocessed}`);
    console.log(`📊 Total tweetable proposals: ${totalTweetable}`);
    
    if (totalTweetable === 0) {
      console.log('❌ No tweetable proposals found - all proposals may be in wrong state or already processed');
      issuesFound = true;
    }
    
    if (failedLogs.length > 0) {
      console.log(`❌ ${failedLogs.length} failed tweet logs found - check Twitter API issues`);
      issuesFound = true;
    }
    
    if (queueStatus.length > 0) {
      console.log(`⚠️  ${queueStatus.length} items in queue - queue may be stuck`);
    }
    
    if (!issuesFound && totalTweetable > 0) {
      console.log('🤔 Everything looks configured correctly, but tweets still not posting.');
      console.log('   Possible causes:');
      console.log('   1. Queue processing is not running (check main bot process)');
      console.log('   2. Twitter API rate limits are being hit');
      console.log('   3. Silent failures in queue processing');
      console.log('   4. Bot main process is not running the scheduled tasks');
      console.log('\n   Try:');
      console.log('   - Restart the bot main process');
      console.log('   - Check bot logs for errors');
      console.log('   - Manually trigger queue processing');
    }
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
  }
}

// Run the debug script
debugTweetIssue(); 