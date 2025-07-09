import { loadConfig } from './utils/config';
import { TwitterService } from './services/twitter';

async function testSimpleFormat() {
  console.log('🎯 Testing Simple Tweet Format (No Descriptions)...\n');
  
  try {
    const config = loadConfig();
    const twitterService = new TwitterService(config);
    
    // Test with current time so voting is active
    const now = Math.floor(Date.now() / 1000);
    
    const sampleProposal = {
      id: '0x776fc9ab9ec3eea06f053b5316d8ebc3cd2a3285f2d8e698d1b5dbbf6dc3e0a6',
      title: 'BIOPSY-23: Establishing a Simple Meta-Governance Framework for BioDAO Token Holdings',
      body: 'This proposal establishes a comprehensive meta-governance framework for BioDAO token holdings...',
      author: '0x456...',
      created: now - 3600, // 1 hour ago
      start: now - 3600,   // 1 hour ago  
      end: now + (48 * 3600), // 48 hours from now
      snapshot: '21234568',
      state: 'active' as const,
      link: 'https://snapshot.org/#/bioxyz.eth/proposal/0x776fc9ab9ec3eea06f053b5316d8ebc3cd2a3285f2d8e698d1b5dbbf6dc3e0a6',
      space: {
        id: 'bioxyz.eth',
        name: 'bioDAO'
      },
      choices: ['For', 'Against'],
      scores: [200, 75],
      scores_total: 275,
      votes: 45
    };

    const shortProposal = {
      ...sampleProposal,
      title: 'CDP-18: Fund NEURON Wallet Development',
    };

    console.log('📱 SIMPLE TWEET FORMAT:\n');
    
    console.log('1️⃣ Long Title:');
    console.log('─'.repeat(50));
    const longTweet = twitterService.createProposalTweet(sampleProposal, 'bioDAO');
    console.log(longTweet);
    console.log(`\n📊 Characters: ${longTweet.length}/280\n`);
    
    console.log('2️⃣ Short Title:');
    console.log('─'.repeat(50));
    const shortTweet = twitterService.createProposalTweet(shortProposal, 'bioDAO');
    console.log(shortTweet);
    console.log(`\n📊 Characters: ${shortTweet.length}/280\n`);
    
    console.log('✅ KEY FEATURES:');
    console.log('─'.repeat(50));
    console.log('🟢 Green emoji for active proposals (positive & engaging)');
    console.log('✨ Sparkles for eye-catching proposal titles');
    console.log('⏰ Time-based urgency text');
    console.log('🗳️ Simple voting call-to-action');
    console.log('🏷️ Clean hashtags: #DAO #DeSci #Vote');
    console.log('📏 Automatic title truncation if too long');
    console.log('📊 Always under 280 characters');
    
  } catch (error) {
    console.error('❌ Error testing simple format:', error);
  }
}

// Run the test
testSimpleFormat(); 