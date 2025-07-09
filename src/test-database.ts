import { loadConfig } from './utils/config';
import { DatabaseService } from './services/database';

async function testDatabase() {
  console.log('🧪 Testing Database Connection and RLS Policies...\n');
  
  try {
    const config = loadConfig();
    const databaseService = new DatabaseService(config);
    
    console.log('📊 Database Configuration:');
    console.log(`  Supabase URL: ${config.supabaseUrl}`);
    console.log(`  Supabase Key: ${config.supabaseKey ? '***' + config.supabaseKey.slice(-4) : 'NOT SET'}`);
    console.log('');
    
    // Test direct Supabase client access
    console.log('🔍 Testing direct Supabase client access...');
    const supabase = (databaseService as any).supabase;
    
    // Test 1: Check if we can access the table at all
    console.log('\n1️⃣ Testing basic table access...');
    const { data: basicData, error: basicError } = await supabase
      .from('governance_snapshot_spaces')
      .select('count(*)')
      .single();
    
    if (basicError) {
      console.error('❌ Basic table access failed:', basicError);
      console.log('   This suggests RLS is blocking access');
    } else {
      console.log('✅ Basic table access works, count:', basicData);
    }
    
    // Test 2: Try with RLS bypass (if using service role)
    console.log('\n2️⃣ Testing RLS bypass...');
    const { data: rlsBypassData, error: rlsBypassError } = await supabase
      .from('governance_snapshot_spaces')
      .select('*')
      .limit(5);
    
    if (rlsBypassError) {
      console.error('❌ RLS bypass failed:', rlsBypassError);
    } else {
      console.log(`✅ RLS bypass works, found ${rlsBypassData?.length || 0} spaces`);
    }
    
    // Test 3: Check RLS policies
    console.log('\n3️⃣ Checking RLS policies...');
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'governance_snapshot_spaces');
    
    if (policiesError) {
      console.error('❌ Could not check policies:', policiesError);
    } else {
      console.log(`📋 Found ${policies?.length || 0} RLS policies for governance_snapshot_spaces`);
      if (policies && policies.length > 0) {
        policies.forEach((policy: any, index: number) => {
          console.log(`  ${index + 1}. ${policy.policyname} - ${policy.cmd} - ${policy.roles}`);
        });
      } else {
        console.log('⚠️  No RLS policies found - this is likely the issue!');
      }
    }
    
    // Test 4: Check current user/role
    console.log('\n4️⃣ Checking current user/role...');
    const { data: userData, error: userError } = await supabase
      .rpc('auth.uid');
    
    if (userError) {
      console.log('❌ Could not get user info:', userError);
    } else {
      console.log('👤 Current user:', userData);
    }
    
    // Test 5: Try raw SQL query
    console.log('\n5️⃣ Testing raw SQL query...');
    const { data: rawData, error: rawError } = await supabase
      .rpc('get_spaces_count');
    
    if (rawError) {
      console.log('❌ Raw SQL failed (expected):', rawError.message);
    } else {
      console.log('✅ Raw SQL works:', rawData);
    }
    
    // Test the getActiveSpaces method
    console.log('\n6️⃣ Testing getActiveSpaces()...');
    const activeSpaces = await databaseService.getActiveSpaces();
    
    console.log('\n📋 Final Result:');
    console.log(`Found ${activeSpaces.length} active spaces`);
    
    if (activeSpaces.length > 0) {
      console.log('\n✅ Active Spaces:');
      activeSpaces.forEach((space, index) => {
        console.log(`  ${index + 1}. ${space.name}`);
        console.log(`     Space ID: ${space.spaceId}`);
        console.log(`     Network: ${space.network}`);
        console.log(`     Active: ${space.active}`);
        console.log(`     Description: ${space.description || 'None'}`);
        console.log('');
      });
    } else {
      console.log('❌ No active spaces found');
      console.log('\n🔧 SOLUTIONS:');
      console.log('1. Use SERVICE_ROLE key instead of ANON key in your .env');
      console.log('2. Or add RLS policies to allow access');
      console.log('3. Or disable RLS on the tables');
    }
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
  }
}

testDatabase().catch(console.error); 