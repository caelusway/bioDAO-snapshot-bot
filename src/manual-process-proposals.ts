import { loadConfig } from './utils/config';
import { BioDAOBot } from './services/bot';

async function manualProcessProposals() {
  console.log('🔄 Manually Processing Existing Proposals...\n');
  
  try {
    const config = loadConfig();
    const bot = new BioDAOBot(config);
    
    // Initialize the bot
    console.log('🚀 Initializing bot...');
    await bot.initialize();
    
    // Check for new proposals (this will process existing unprocessed proposals)
    console.log('🔍 Checking for new proposals...');
    await bot.checkForNewProposals();
    
    console.log('\n✅ Manual processing completed!');
    console.log('📝 Check the queue and tweet logs to see if proposals were processed.');
    
  } catch (error) {
    console.error('❌ Error during manual processing:', error);
  }
}

// Run the manual processing
manualProcessProposals(); 