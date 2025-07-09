import { loadConfig } from './utils/config';
import { SnapshotService } from './services/snapshot';
import { DatabaseService } from './services/database';

async function main() {
  console.log('🧬 bioDAO Snapshot Debug Tool\n');
  
  const config = loadConfig();
  const testSpaceId = 'biotester.eth'; // Use test space for debugging
  console.log(`🏛️ Space ID: ${testSpaceId}\n`);

  const snapshotService = new SnapshotService(config);
  const databaseService = new DatabaseService(config);

  try {
    // Test database connection
    console.log('🔗 Testing database connection...');
    const activeSpaces = await databaseService.getActiveSpaces();
    console.log(`✅ Database connected. Found ${activeSpaces.length} active spaces`);
    
    // List active spaces
    console.log('\n📋 Active spaces:');
    activeSpaces.forEach(space => {
      console.log(`  - ${space.name} (${space.spaceId})`);
    });

    // Test Snapshot API
    console.log('\n🔗 Testing Snapshot API...');
    const query = `
      query {
        space(id: "${testSpaceId}") {
          id
          name
          about
          network
          symbol
          strategies {
            name
            params
          }
          admins
          members
          filters {
            minScore
            onlyMembers
          }
          plugins
        }
      }
    `;

    console.log('📊 Query:');
    console.log(query);

    const response = await fetch(config.snapshotApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    const result = await response.json() as { data?: any; errors?: any[] };
    
    if (result.errors) {
      console.error('❌ Snapshot API errors:', result.errors);
    } else {
      console.log('\n✅ Snapshot API Response:');
      console.log(JSON.stringify(result.data, null, 2));
    }

    // Test getting proposals
    console.log('\n📋 Testing proposal fetching...');
    const proposals = await snapshotService.getLatestProposals(testSpaceId, 5);
    console.log(`Found ${proposals.length} proposals for ${testSpaceId}`);

    if (proposals.length > 0) {
      console.log('\n📊 Recent proposals:');
      proposals.forEach((proposal, index) => {
        console.log(`${index + 1}. ${proposal.title}`);
        console.log(`   ID: ${proposal.id}`);
        console.log(`   Author: ${proposal.author}`);
        console.log(`   State: ${proposal.state}`);
        console.log(`   Created: ${new Date(proposal.created * 1000).toISOString()}`);
        console.log(`   Link: ${proposal.link}`);
        console.log('');
      });
    }

    // Test getting specific proposal
    if (proposals.length > 0) {
      const firstProposal = proposals[0];
      console.log(`\n🔍 Testing specific proposal fetch: ${firstProposal.id}`);
      
      const specificProposal = await snapshotService.getProposalById(firstProposal.id, testSpaceId);
      
      if (specificProposal) {
        console.log('✅ Successfully fetched specific proposal:');
        console.log(`   Title: ${specificProposal.title}`);
        console.log(`   Votes: ${specificProposal.votes}`);
        console.log(`   Score Total: ${specificProposal.scores_total}`);
      } else {
        console.log('❌ Failed to fetch specific proposal');
      }
    }

    // Test database operations
    console.log('\n💾 Testing database operations...');
    
    // Try to get or create the test space
    let testSpace = await databaseService.getSpaceById(testSpaceId);
    if (!testSpace) {
      console.log('Creating test space in database...');
      testSpace = await databaseService.createSpace({
        spaceId: testSpaceId,
        name: 'BioDAO Test Space',
        description: 'Test space for debugging',
        network: 11155111,
        active: true
      });
      console.log('✅ Test space created');
    } else {
      console.log('✅ Test space found in database');
    }

    // Test proposal operations
    if (proposals.length > 0) {
      const testProposal = proposals[0];
      console.log(`\nTesting proposal operations with: ${testProposal.id}`);
      
      let dbProposal = await databaseService.getProposalBySnapshotId(testProposal.id);
      if (!dbProposal) {
        console.log('Creating proposal in database...');
        dbProposal = await databaseService.createProposal(testSpaceId, testProposal);
        console.log('✅ Proposal created in database');
      } else {
        console.log('✅ Proposal found in database');
      }
    }

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  }
}

main().catch(console.error); 