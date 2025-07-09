import * as cron from 'node-cron';
import { loadConfig, validateConfig } from './utils/config';
import { BioDAOBot } from './services/bot';

async function main() {
  console.log('🧬 bioDAO Snapshot Twitter Bot Starting...');
  
  try {
    // Load and validate configuration
    const config = loadConfig();
    validateConfig(config);
    
    console.log(`⏰ Check interval: ${config.checkIntervalMinutes} minutes`);
    console.log(`🔄 Tweet queue delay: ${config.tweetQueueDelaySeconds} seconds`);
    
    // Initialize bot
    const bot = new BioDAOBot(config);
    await bot.initialize();
    
    // Set up scheduled tasks
    setupScheduledTasks(bot, config);
    
    // Initial check for new proposals
    await bot.checkForNewProposals();
    
    // Setup graceful shutdown
    setupGracefulShutdown(bot);
    
    console.log('✅ Bot is running! Press Ctrl+C to stop.');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

function setupScheduledTasks(bot: BioDAOBot, config: any) {
  // Check for new proposals every configured interval
  const checkInterval = `*/${config.checkIntervalMinutes} * * * *`;
  cron.schedule(checkInterval, async () => {
    console.log(`\n⏰ Scheduled check at ${new Date().toISOString()}`);
    await bot.checkForNewProposals();
  });
  
  // Check active proposals every hour
  cron.schedule('0 * * * *', async () => {
    console.log(`\n📊 Hourly active proposal check at ${new Date().toISOString()}`);
    await bot.checkActiveProposals();
  });
  
  // Daily historical data import at 2 AM UTC
  cron.schedule('0 2 * * *', async () => {
    console.log(`\n📚 Daily historical data import check at ${new Date().toISOString()}`);
    try {
      const shouldRun = await bot.shouldRunHistoricalImport();
      
      if (shouldRun) {
        console.log('🔄 Running historical data import...');
        const results = await bot.importHistoricalData();
        console.log(`✅ Daily historical import completed:`);
        console.log(`  Spaces processed: ${results.spaces}`);
        console.log(`  Created: ${results.created}`);
        console.log(`  Updated: ${results.updated}`);
        console.log(`  Skipped: ${results.skipped}`);
      } else {
        console.log('⏭️ Skipping historical import - all spaces recently imported');
      }
    } catch (error) {
      console.error('❌ Daily historical import failed:', error);
    }
  });
  
  // Perform maintenance every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log(`\n🧹 Maintenance check at ${new Date().toISOString()}`);
    await bot.performMaintenance();
  });
  
  // Status report every 30 minutes
  cron.schedule('*/30 * * * *', () => {
    const status = bot.getStatus();
    console.log(`\n📈 Status Report at ${new Date().toISOString()}`);
    console.log(`  Last check: ${new Date(status.lastCheckTime).toISOString()}`);
    console.log(`  Queue length: ${status.queueStatus.length}`);
    console.log(`  Processing: ${status.queueStatus.isProcessing ? 'Yes' : 'No'}`);
  });
  
  console.log('📅 Scheduled tasks configured:');
  console.log(`  - New proposals check: every ${config.checkIntervalMinutes} minutes`);
  console.log('  - Active proposals check: every hour');
  console.log('  - Daily historical import check: 2 AM UTC (only if needed)');
  console.log('  - Maintenance: every 6 hours');
  console.log('  - Status report: every 30 minutes');
}

function setupGracefulShutdown(bot: BioDAOBot) {
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
    
    try {
      await bot.stop();
      console.log('✅ Bot stopped successfully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };
  
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGQUIT', () => gracefulShutdown('SIGQUIT'));
  
  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
  });
}

// Start the bot
main().catch(console.error); 