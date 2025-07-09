import { loadConfig } from './utils/config';
import { createClient } from '@supabase/supabase-js';

async function verifyAnonAccess() {
  console.log('🧪 Verifying Anonymous Access to Governance Tables...\n');
  
  try {
    const config = loadConfig();
    console.log('📊 Using Supabase configuration:');
    console.log(`  URL: ${config.supabaseUrl}`);
    console.log(`  Key: ${config.supabaseKey ? '***' + config.supabaseKey.slice(-4) : 'NOT SET'}`);
    console.log('');
    
    // Create Supabase client with anon key
    const supabase = createClient(config.supabaseUrl, config.supabaseKey);
    
    // Test each table
    console.log('🔍 Testing table access...\n');
    
    // Test governance_snapshot_spaces
    console.log('1️⃣ Testing governance_snapshot_spaces...');
    const { data: spaces, error: spacesError } = await supabase
      .from('governance_snapshot_spaces')
      .select('*')
      .limit(5);
    
    if (spacesError) {
      console.error('❌ Error accessing spaces:', spacesError.message);
    } else {
      console.log(`✅ Successfully accessed governance_snapshot_spaces: ${spaces?.length || 0} rows`);
      if (spaces && spaces.length > 0) {
        console.log('   Sample data:');
        spaces.forEach((space, index) => {
          console.log(`   ${index + 1}. ${space.name} (${space.space_id}) - Active: ${space.active}`);
        });
      }
    }
    
    // Test governance_snapshot_proposals
    console.log('\n2️⃣ Testing governance_snapshot_proposals...');
    const { data: proposals, error: proposalsError } = await supabase
      .from('governance_snapshot_proposals')
      .select('*')
      .limit(3);
    
    if (proposalsError) {
      console.error('❌ Error accessing proposals:', proposalsError.message);
    } else {
      console.log(`✅ Successfully accessed governance_snapshot_proposals: ${proposals?.length || 0} rows`);
    }
    
    // Test governance_tweet_logs
    console.log('\n3️⃣ Testing governance_tweet_logs...');
    const { data: tweets, error: tweetsError } = await supabase
      .from('governance_tweet_logs')
      .select('*')
      .limit(3);
    
    if (tweetsError) {
      console.error('❌ Error accessing tweet logs:', tweetsError.message);
    } else {
      console.log(`✅ Successfully accessed governance_tweet_logs: ${tweets?.length || 0} rows`);
    }
    
    // Test governance_bot_status
    console.log('\n4️⃣ Testing governance_bot_status...');
    const { data: status, error: statusError } = await supabase
      .from('governance_bot_status')
      .select('*')
      .limit(3);
    
    if (statusError) {
      console.error('❌ Error accessing bot status:', statusError.message);
    } else {
      console.log(`✅ Successfully accessed governance_bot_status: ${status?.length || 0} rows`);
    }
    
    // Test write operations
    console.log('\n5️⃣ Testing write operations...');
    
    // Try to insert a test record (we'll delete it right after)
    const testSpaceData = {
      space_id: 'test-anon-access',
      name: 'Test Anonymous Access',
      description: 'Test space to verify anon write access',
      network: 11155111,
      active: true
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('governance_snapshot_spaces')
      .insert([testSpaceData])
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Error with write access:', insertError.message);
    } else {
      console.log('✅ Write access confirmed');
      
      // Clean up test data
      await supabase
        .from('governance_snapshot_spaces')
        .delete()
        .eq('space_id', 'test-anon-access');
      
      console.log('🧹 Test data cleaned up');
    }
    
    console.log('\n🎉 Anonymous access verification complete!');
    
    // Summary
    const hasSpacesAccess = !spacesError;
    const hasProposalsAccess = !proposalsError;
    const hasTweetsAccess = !tweetsError;
    const hasStatusAccess = !statusError;
    const hasWriteAccess = !insertError;
    
    console.log('\n📊 Access Summary:');
    console.log(`  Spaces: ${hasSpacesAccess ? '✅' : '❌'}`);
    console.log(`  Proposals: ${hasProposalsAccess ? '✅' : '❌'}`);
    console.log(`  Tweet Logs: ${hasTweetsAccess ? '✅' : '❌'}`);
    console.log(`  Bot Status: ${hasStatusAccess ? '✅' : '❌'}`);
    console.log(`  Write Access: ${hasWriteAccess ? '✅' : '❌'}`);
    
    if (hasSpacesAccess && hasProposalsAccess && hasTweetsAccess && hasStatusAccess && hasWriteAccess) {
      console.log('\n🚀 All tests passed! Your bot should work now.');
    } else {
      console.log('\n⚠️  Some tests failed. Make sure you ran the RLS fix SQL script.');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

verifyAnonAccess().catch(console.error); 