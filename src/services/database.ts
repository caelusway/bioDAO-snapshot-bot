import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  BotConfig, 
  SpaceConfig, 
  DatabaseProposal, 
  TweetLog, 
  BotStatus, 
  SnapshotProposal 
} from '../types';

export class DatabaseService {
  private supabase: SupabaseClient;

  constructor(config: BotConfig) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
  }

  // ===============================
  // SPACES MANAGEMENT
  // ===============================

  async getActiveSpaces(): Promise<SpaceConfig[]> {
    console.log('🔍 Querying active spaces from database...');
    
    // First, let's get all spaces to debug
    const { data: allSpaces, error: allError } = await this.supabase
      .from('governance_snapshot_spaces')
      .select('*')
      .order('created_at');

    if (allError) {
      console.error('❌ Error fetching all spaces:', allError);
      throw new Error(`Failed to fetch all spaces: ${allError.message}`);
    }

    console.log(`📊 Found ${allSpaces?.length || 0} total spaces in database`);
    
    if (allSpaces && allSpaces.length > 0) {
      console.log('📋 All spaces:');
      allSpaces.forEach((space, index) => {
        console.log(`  ${index + 1}. ${space.name} (${space.space_id})`);
        console.log(`     Active: ${space.active} (type: ${typeof space.active})`);
        console.log(`     Network: ${space.network}`);
        console.log('');
      });
    }

    // Now get active spaces with explicit boolean check
    const { data, error } = await this.supabase
      .from('governance_snapshot_spaces')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Error fetching active spaces:', error);
      throw new Error(`Failed to fetch active spaces: ${error.message}`);
    }

    console.log(`✅ Found ${data?.length || 0} active spaces`);
    
    if (data && data.length > 0) {
      console.log('📋 Active spaces:');
      data.forEach((space, index) => {
        console.log(`  ${index + 1}. ${space.name} (${space.space_id}) - Active: ${space.active}`);
      });
    }

    // If no active spaces found, try alternative queries
    if (!data || data.length === 0) {
      console.log('🔍 No active spaces found with active=true, trying alternative queries...');
      
      // Try with string 'true'
      const { data: stringTrueData } = await this.supabase
        .from('governance_snapshot_spaces')
        .select('*')
        .eq('active', 'true')
        .order('created_at', { ascending: true });
      
      console.log(`🔍 Found ${stringTrueData?.length || 0} spaces with active='true'`);
      
      // Try with active IS NOT FALSE
      const { data: notFalseData } = await this.supabase
        .from('governance_snapshot_spaces')
        .select('*')
        .not('active', 'eq', false)
        .order('created_at', { ascending: true });
      
      console.log(`🔍 Found ${notFalseData?.length || 0} spaces with active IS NOT FALSE`);
      
      // Try without active filter at all
      const { data: noFilterData } = await this.supabase
        .from('governance_snapshot_spaces')
        .select('*')
        .order('created_at', { ascending: true });
      
      console.log(`🔍 Found ${noFilterData?.length || 0} spaces without active filter`);
      
      // If we found data with alternative queries, use that
      if (stringTrueData && stringTrueData.length > 0) {
        console.log('✅ Using spaces with active=\'true\' (string)');
        return stringTrueData.map(this.mapSpaceFromDB);
      }
      
      if (notFalseData && notFalseData.length > 0) {
        console.log('✅ Using spaces with active IS NOT FALSE');
        return notFalseData.map(this.mapSpaceFromDB);
      }
      
      // As a fallback, return all spaces if no active filter works
      if (noFilterData && noFilterData.length > 0) {
        console.log('⚠️ Falling back to all spaces (no active filter)');
        return noFilterData.map(this.mapSpaceFromDB);
      }
    }

    return data ? data.map(this.mapSpaceFromDB) : [];
  }

  async getSpaceById(spaceId: string): Promise<SpaceConfig | null> {
    const { data, error } = await this.supabase
      .from('governance_snapshot_spaces')
      .select('*')
      .eq('space_id', spaceId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to fetch space: ${error.message}`);
    }

    return this.mapSpaceFromDB(data);
  }

  async createSpace(spaceData: Partial<SpaceConfig>): Promise<SpaceConfig> {
    const { data, error } = await this.supabase
      .from('governance_snapshot_spaces')
      .insert([{
        space_id: spaceData.spaceId,
        name: spaceData.name,
        description: spaceData.description,
        network: spaceData.network || 11155111,
        active: spaceData.active ?? true
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create space: ${error.message}`);
    }

    return this.mapSpaceFromDB(data);
  }

  async updateSpace(spaceId: string, updates: Partial<SpaceConfig>): Promise<SpaceConfig> {
    const { data, error } = await this.supabase
      .from('governance_snapshot_spaces')
      .update({
        name: updates.name,
        description: updates.description,
        network: updates.network,
        active: updates.active
      })
      .eq('space_id', spaceId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update space: ${error.message}`);
    }

    return this.mapSpaceFromDB(data);
  }

  // ===============================
  // PROPOSALS MANAGEMENT
  // ===============================

  async getProposalsForSpace(spaceId: string, processed?: boolean): Promise<DatabaseProposal[]> {
    let query = this.supabase
      .from('governance_snapshot_proposals')
      .select(`
        *,
        governance_snapshot_spaces!inner(space_id)
      `)
      .eq('governance_snapshot_spaces.space_id', spaceId)
      .order('created_at_snapshot', { ascending: false });

    if (processed !== undefined) {
      query = query.eq('processed', processed);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch proposals: ${error.message}`);
    }

    return data.map(this.mapProposalFromDB);
  }

  async getProposalBySnapshotId(proposalId: string): Promise<DatabaseProposal | null> {
    const { data, error } = await this.supabase
      .from('governance_snapshot_proposals')
      .select('*')
      .eq('proposal_id', proposalId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to fetch proposal: ${error.message}`);
    }

    return this.mapProposalFromDB(data);
  }

  async createProposal(spaceId: string, proposal: SnapshotProposal): Promise<DatabaseProposal> {
    // First get the space's UUID
    const space = await this.getSpaceById(spaceId);
    if (!space) {
      throw new Error(`Space ${spaceId} not found`);
    }

    const { data, error } = await this.supabase
      .from('governance_snapshot_proposals')
      .insert([{
        space_id: space.id,
        proposal_id: proposal.id,
        title: proposal.title,
        body: proposal.body,
        author: proposal.author,
        created_at_snapshot: proposal.created,
        start_time: proposal.start,
        end_time: proposal.end,
        snapshot_block: parseInt(proposal.snapshot) || null,
        state: proposal.state,
        link: proposal.link,
        choices: proposal.choices,
        scores: proposal.scores,
        scores_total: proposal.scores_total,
        votes_count: proposal.votes,
        processed: false
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create proposal: ${error.message}`);
    }

    return this.mapProposalFromDB(data);
  }

  async updateProposal(proposalId: string, updates: Partial<DatabaseProposal>): Promise<DatabaseProposal> {
    const { data, error } = await this.supabase
      .from('governance_snapshot_proposals')
      .update({
        title: updates.title,
        body: updates.body,
        state: updates.state,
        scores: updates.scores,
        scores_total: updates.scoresTotal,
        votes_count: updates.votesCount,
        processed: updates.processed
      })
      .eq('proposal_id', proposalId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update proposal: ${error.message}`);
    }

    return this.mapProposalFromDB(data);
  }

  async markProposalAsProcessed(proposalId: string): Promise<void> {
    const { error } = await this.supabase
      .from('governance_snapshot_proposals')
      .update({ processed: true })
      .eq('proposal_id', proposalId);

    if (error) {
      throw new Error(`Failed to mark proposal as processed: ${error.message}`);
    }
  }

  async batchCreateProposals(spaceId: string, proposals: SnapshotProposal[]): Promise<{ created: number; updated: number; skipped: number }> {
    console.log(`📦 Starting batch import of ${proposals.length} proposals for space: ${spaceId}`);
    
    let created = 0;
    let updated = 0;
    let skipped = 0;
    
    // Get space info
    const space = await this.getSpaceById(spaceId);
    if (!space) {
      throw new Error(`Space ${spaceId} not found`);
    }

    // Process proposals in smaller batches to avoid overwhelming the database
    const batchSize = 50;
    for (let i = 0; i < proposals.length; i += batchSize) {
      const batch = proposals.slice(i, i + batchSize);
      console.log(`📋 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(proposals.length / batchSize)} (${batch.length} proposals)`);
      
      for (const proposal of batch) {
        try {
          // Check if proposal already exists
          const existingProposal = await this.getProposalBySnapshotId(proposal.id);
          
                     if (existingProposal) {
             // Update existing proposal with latest data
             await this.updateProposal(proposal.id, {
               title: proposal.title,
               body: proposal.body,
               state: proposal.state,
               startTime: proposal.start,
               endTime: proposal.end,
               snapshotBlock: proposal.snapshot ? parseInt(proposal.snapshot) : undefined,
               link: proposal.link,
               choices: proposal.choices || [],
               scores: proposal.scores || [],
               scoresTotal: proposal.scores_total || 0,
               votesCount: proposal.votes || 0,
               processed: existingProposal.processed // Keep existing processed status
             });
             updated++;
             console.log(`✅ Updated existing proposal: ${proposal.title.substring(0, 50)}...`);
           } else {
             // Create new proposal - mark as processed if it's not active/pending (historical)
             const isHistorical = proposal.state !== 'active' && proposal.state !== 'pending';
             
             // Create the proposal first
             const createdProposal = await this.createProposal(spaceId, proposal);
             
             // Mark as processed if it's historical (to avoid tweeting about old proposals)
             if (isHistorical) {
               await this.markProposalAsProcessed(proposal.id);
             }
             
             created++;
             console.log(`🆕 Created new proposal: ${proposal.title.substring(0, 50)}... (processed: ${isHistorical})`);
           }
        } catch (error) {
          console.error(`❌ Error processing proposal ${proposal.id}:`, error);
          skipped++;
        }
      }
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`🎉 Batch import complete! Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`);
    return { created, updated, skipped };
  }

  async getExistingProposalIds(spaceId: string): Promise<Set<string>> {
    // First get the space UUID from the space_id string
    const space = await this.getSpaceById(spaceId);
    if (!space) {
      throw new Error(`Space ${spaceId} not found`);
    }

    const { data, error } = await this.supabase
      .from('governance_snapshot_proposals')
      .select('proposal_id')
      .eq('space_id', space.id);

    if (error) {
      throw new Error(`Failed to fetch existing proposal IDs: ${error.message}`);
    }

    return new Set(data.map(item => item.proposal_id));
  }

  async getProposalStats(spaceId?: string): Promise<{
    total: number;
    processed: number;
    unprocessed: number;
    byState: Record<string, number>;
  }> {
    let query = this.supabase
      .from('governance_snapshot_proposals')
      .select('state, processed');

    if (spaceId) {
      // First get the space UUID from the space_id string
      const space = await this.getSpaceById(spaceId);
      if (!space) {
        throw new Error(`Space ${spaceId} not found`);
      }
      query = query.eq('space_id', space.id);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch proposal stats: ${error.message}`);
    }

    const stats = {
      total: data.length,
      processed: data.filter(p => p.processed).length,
      unprocessed: data.filter(p => !p.processed).length,
      byState: {} as Record<string, number>
    };

    // Count by state
    data.forEach(proposal => {
      stats.byState[proposal.state] = (stats.byState[proposal.state] || 0) + 1;
    });

    return stats;
  }

  // ===============================
  // TWEET LOGS MANAGEMENT
  // ===============================

  async createTweetLog(proposalId: string, tweetText: string): Promise<TweetLog> {
    // Get proposal and space info
    const proposal = await this.getProposalBySnapshotId(proposalId);
    if (!proposal) {
      throw new Error(`Proposal ${proposalId} not found`);
    }

    const { data, error } = await this.supabase
      .from('governance_tweet_logs')
      .insert([{
        proposal_id: proposal.id,
        space_id: proposal.spaceId,
        tweet_text: tweetText,
        status: 'pending',
        retry_count: 0
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create tweet log: ${error.message}`);
    }

    return this.mapTweetLogFromDB(data);
  }

  async updateTweetLog(logId: string, updates: Partial<TweetLog>): Promise<TweetLog> {
    const { data, error } = await this.supabase
      .from('governance_tweet_logs')
      .update({
        tweet_id: updates.tweetId,
        status: updates.status,
        error_message: updates.errorMessage,
        retry_count: updates.retryCount,
        posted_at: updates.postedAt
      })
      .eq('id', logId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update tweet log: ${error.message}`);
    }

    return this.mapTweetLogFromDB(data);
  }

  async getFailedTweetLogs(maxRetries: number = 3): Promise<TweetLog[]> {
    const { data, error } = await this.supabase
      .from('governance_tweet_logs')
      .select('*')
      .eq('status', 'failed')
      .lt('retry_count', maxRetries)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch failed tweet logs: ${error.message}`);
    }

    return data.map(this.mapTweetLogFromDB);
  }

  async getTweetLogsForProposal(proposalId: string): Promise<TweetLog[]> {
    const { data, error } = await this.supabase
      .from('governance_tweet_logs')
      .select('*')
      .eq('proposal_id', proposalId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch tweet logs for proposal: ${error.message}`);
    }

    return data.map(this.mapTweetLogFromDB);
  }

  // ===============================
  // BOT STATUS MANAGEMENT
  // ===============================

  async getBotStatus(spaceId: string): Promise<BotStatus | null> {
    const space = await this.getSpaceById(spaceId);
    if (!space) return null;

    const { data, error } = await this.supabase
      .from('governance_bot_status')
      .select('*')
      .eq('space_id', space.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to fetch bot status: ${error.message}`);
    }

    return this.mapBotStatusFromDB(data);
  }

  async updateBotStatus(spaceId: string, updates: Partial<BotStatus>): Promise<BotStatus> {
    const space = await this.getSpaceById(spaceId);
    if (!space) {
      throw new Error(`Space ${spaceId} not found`);
    }

    // First, try to get existing bot status
    const existingStatus = await this.getBotStatus(spaceId);
    
    if (existingStatus) {
      // Update existing record
      const { data, error } = await this.supabase
        .from('governance_bot_status')
        .update({
          last_check_at: updates.lastCheckAt,
          last_historical_import_at: updates.lastHistoricalImportAt,
          last_proposal_id: updates.lastProposalId,
          status: updates.status,
          error_message: updates.errorMessage,
          proposals_processed: updates.proposalsProcessed,
          tweets_posted: updates.tweetsPosted
        })
        .eq('space_id', space.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update bot status: ${error.message}`);
      }

      return this.mapBotStatusFromDB(data);
    } else {
      // Insert new record
      const { data, error } = await this.supabase
        .from('governance_bot_status')
        .insert([{
          space_id: space.id,
          last_check_at: updates.lastCheckAt || new Date().toISOString(),
          last_historical_import_at: updates.lastHistoricalImportAt,
          last_proposal_id: updates.lastProposalId,
          status: updates.status || 'running',
          error_message: updates.errorMessage,
          proposals_processed: updates.proposalsProcessed || 0,
          tweets_posted: updates.tweetsPosted || 0
        }])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create bot status: ${error.message}`);
      }

      return this.mapBotStatusFromDB(data);
    }
  }

  // ===============================
  // UTILITY METHODS
  // ===============================

  private mapSpaceFromDB(data: any): SpaceConfig {
    return {
      id: data.id,
      spaceId: data.space_id,
      name: data.name,
      description: data.description,
      network: data.network,
      active: data.active,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private mapProposalFromDB(data: any): DatabaseProposal {
    return {
      id: data.id,
      spaceId: data.space_id,
      proposalId: data.proposal_id,
      title: data.title,
      body: data.body,
      author: data.author,
      createdAtSnapshot: data.created_at_snapshot,
      startTime: data.start_time,
      endTime: data.end_time,
      snapshotBlock: data.snapshot_block,
      state: data.state,
      link: data.link,
      choices: data.choices,
      scores: data.scores,
      scoresTotal: data.scores_total,
      votesCount: data.votes_count,
      processed: data.processed,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private mapTweetLogFromDB(data: any): TweetLog {
    return {
      id: data.id,
      proposalId: data.proposal_id,
      spaceId: data.space_id,
      tweetId: data.tweet_id,
      tweetText: data.tweet_text,
      status: data.status,
      errorMessage: data.error_message,
      retryCount: data.retry_count,
      postedAt: data.posted_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private mapBotStatusFromDB(data: any): BotStatus {
    return {
      id: data.id,
      spaceId: data.space_id,
      lastCheckAt: data.last_check_at,
      lastHistoricalImportAt: data.last_historical_import_at,
      lastProposalId: data.last_proposal_id,
      status: data.status,
      errorMessage: data.error_message,
      proposalsProcessed: data.proposals_processed,
      tweetsPosted: data.tweets_posted,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
} 