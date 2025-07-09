import { loadConfig } from './utils/config';
import { DatabaseService } from './services/database';
import { SnapshotService } from './services/snapshot';

async function importHistoricalData() {
  console.log('🚀 Starting Historical Data Import...\n');
  
  try {
    const config = loadConfig();
    const databaseService = new DatabaseService(config);
    const snapshotService = new SnapshotService(config);
    
    // Get all active spaces
    console.log('📊 Fetching active spaces...');
    const spaces = await databaseService.getActiveSpaces();
    
    if (spaces.length === 0) {
      console.log('⚠️ No active spaces found. Please add spaces to the database first.');
      return;
    }
    
    console.log(`✅ Found ${spaces.length} active spaces:`);
    spaces.forEach((space, index) => {
      console.log(`  ${index + 1}. ${space.name} (${space.spaceId})`);
    });
    
    let totalResults = {
      created: 0,
      updated: 0,
      skipped: 0,
      spaces: 0
    };
    
    // Process each space
    for (const space of spaces) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🏛️ Processing space: ${space.name} (${space.spaceId})`);
      console.log(`${'='.repeat(60)}`);
      
      try {
        // Get current stats for this space
        const beforeStats = await databaseService.getProposalStats(space.spaceId);
        console.log(`📊 Current database stats for ${space.name}:`);
        console.log(`  Total proposals: ${beforeStats.total}`);
        console.log(`  Processed: ${beforeStats.processed}`);
        console.log(`  Unprocessed: ${beforeStats.unprocessed}`);
        console.log(`  By state: ${JSON.stringify(beforeStats.byState)}`);
        
        // Fetch all historical proposals from Snapshot
        const proposals = await snapshotService.getAllHistoricalProposals(space.spaceId);
        
        if (proposals.length === 0) {
          console.log(`⚠️ No proposals found for space ${space.spaceId}`);
          continue;
        }
        
        // Batch import to database
        const results = await databaseService.batchCreateProposals(space.spaceId, proposals);
        
        // Update totals
        totalResults.created += results.created;
        totalResults.updated += results.updated;
        totalResults.skipped += results.skipped;
        totalResults.spaces++;
        
        // Get updated stats
        const afterStats = await databaseService.getProposalStats(space.spaceId);
        
        console.log(`\n📈 Results for ${space.name}:`);
        console.log(`  🆕 Created: ${results.created}`);
        console.log(`  ✅ Updated: ${results.updated}`);
        console.log(`  ⏭️ Skipped: ${results.skipped}`);
        console.log(`  📊 Total in database: ${afterStats.total} (was ${beforeStats.total})`);
        
        // Show breakdown by state
        console.log(`\n📊 Final proposal breakdown by state:`);
        Object.entries(afterStats.byState)
          .sort((a, b) => b[1] - a[1])
          .forEach(([state, count]) => {
            console.log(`  ${state}: ${count}`);
          });
        
      } catch (error) {
        console.error(`❌ Error processing space ${space.spaceId}:`, error);
        totalResults.skipped++;
      }
    }
    
    // Final summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎉 HISTORICAL IMPORT COMPLETE!`);
    console.log(`${'='.repeat(60)}`);
    console.log(`📊 Overall Results:`);
    console.log(`  🏛️ Spaces processed: ${totalResults.spaces}/${spaces.length}`);
    console.log(`  🆕 Total created: ${totalResults.created}`);
    console.log(`  ✅ Total updated: ${totalResults.updated}`);
    console.log(`  ⏭️ Total skipped: ${totalResults.skipped}`);
    
    // Get overall stats
    const overallStats = await databaseService.getProposalStats();
    console.log(`\n📈 Database Summary:`);
    console.log(`  📊 Total proposals: ${overallStats.total}`);
    console.log(`  ✅ Processed: ${overallStats.processed}`);
    console.log(`  ⏳ Unprocessed: ${overallStats.unprocessed}`);
    console.log(`\n🏷️ Breakdown by state:`);
    Object.entries(overallStats.byState)
      .sort((a, b) => b[1] - a[1])
      .forEach(([state, count]) => {
        console.log(`  ${state}: ${count}`);
      });
    
    console.log(`\n✅ Historical data import completed successfully!`);
    console.log(`💡 Historical proposals are marked as processed to avoid tweeting.`);
    console.log(`🐦 Only new active/pending proposals will be tweeted about.`);
    
  } catch (error) {
    console.error('❌ Error during historical data import:', error);
    process.exit(1);
  }
}

// Run the import
importHistoricalData().catch(console.error); 