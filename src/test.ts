import { loadConfig } from './utils/config';
import { SnapshotService } from './services/snapshot';
import { DatabaseService } from './services/database';

async function main() {
  console.log('🧬 bioDAO Snapshot Bot Test\n');
  
  const config = loadConfig();
  const testSpaceId = 'biotester.eth'; // Use test space for testing
  console.log(`🏛️ Monitoring space: ${testSpaceId}`);

  const snapshotService = new SnapshotService(config);
  const databaseService = new DatabaseService(config);

  try {
    // Test getting proposals
    console.log('📋 Testing proposal fetching...');
    const proposals = await snapshotService.getLatestProposals(testSpaceId, 5);
    console.log(`Found ${proposals.length} proposals for ${testSpaceId}`);

    if (proposals.length > 0) {
      console.log('\n📊 Recent proposals:');
      proposals.forEach((proposal, index) => {
        console.log(`${index + 1}. ${proposal.title}`);
        console.log(`   State: ${proposal.state}`);
        console.log(`   Created: ${new Date(proposal.created * 1000).toISOString()}`);
        console.log(`   Votes: ${proposal.votes}`);
        console.log(`   Link: ${proposal.link}`);
        console.log('');
      });
    }

    // Test getting active proposals
    console.log('📊 Testing active proposals...');
    const activeProposals = await snapshotService.getActiveProposals(testSpaceId);
    console.log(`Found ${activeProposals.length} active proposals`);

    if (activeProposals.length > 0) {
      console.log('\n🔴 Active proposals:');
      activeProposals.forEach(proposal => {
        const timeUntilEnd = proposal.end * 1000 - Date.now();
        const hoursUntilEnd = Math.ceil(timeUntilEnd / (1000 * 60 * 60));
        console.log(`  - ${proposal.title} (${hoursUntilEnd}h remaining)`);
      });
    }

    // Test database operations
    console.log('\n💾 Testing database operations...');
    
    // Get active spaces
    const activeSpaces = await databaseService.getActiveSpaces();
    console.log(`Found ${activeSpaces.length} active spaces in database`);
    
    activeSpaces.forEach(space => {
      console.log(`  - ${space.name} (${space.spaceId})`);
    });

    // Test with a specific proposal if available
    if (proposals.length > 0) {
      const testProposal = proposals[0];
      console.log(`\n🔍 Testing proposal operations with: ${testProposal.id}`);
      
      // Check if proposal exists in database
      const dbProposal = await databaseService.getProposalBySnapshotId(testProposal.id);
      if (dbProposal) {
        console.log('✅ Proposal found in database');
        console.log(`   Processed: ${dbProposal.processed}`);
        console.log(`   State: ${dbProposal.state}`);
      } else {
        console.log('❌ Proposal not found in database');
      }
    }

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

main().catch(console.error); 