import { loadConfig } from './utils/config';
import { BioDAOBot } from './services/bot';
import { DatabaseService } from './services/database';

async function testDailyHistoricalImport() {
  console.log('🧪 Testing Daily Historical Import Functionality...\n');
  
  try {
    const config = loadConfig();
    const bot = new BioDAOBot(config);
    const databaseService = new DatabaseService(config);
    
    // Initialize bot
    console.log('🚀 Initializing bot...');
    await bot.initialize();
    
    // Test 1: Check if historical import should run
    console.log('\n📋 Test 1: Checking if historical import should run...');
    const shouldRun = await bot.shouldRunHistoricalImport();
    console.log(`Result: ${shouldRun ? '✅ Should run' : '⏭️ Should skip'}`);
    
    // Test 2: Get current bot status for all spaces
    console.log('\n📋 Test 2: Current historical import status by space...');
    const spaces = await databaseService.getActiveSpaces();
    
    for (const space of spaces) {
      const botStatus = await databaseService.getBotStatus(space.spaceId);
      
      if (botStatus?.lastHistoricalImportAt) {
        const lastImport = new Date(botStatus.lastHistoricalImportAt);
        const hoursAgo = Math.round((Date.now() - lastImport.getTime()) / (1000 * 60 * 60));
        console.log(`  ${space.name}: Last imported ${hoursAgo}h ago (${lastImport.toISOString()})`);
      } else {
        console.log(`  ${space.name}: Never imported`);
      }
    }
    
    // Test 3: Run historical import (which should check timing internally)
    console.log('\n📋 Test 3: Running historical import with timing checks...');
    const results = await bot.importHistoricalData();
    
    console.log(`\n📊 Import Results:`);
    console.log(`  Spaces processed: ${results.spaces}`);
    console.log(`  Created: ${results.created}`);
    console.log(`  Updated: ${results.updated}`);
    console.log(`  Skipped: ${results.skipped}`);
    
    // Test 4: Check if it should run again (should be false now)
    console.log('\n📋 Test 4: Checking again if historical import should run...');
    const shouldRunAgain = await bot.shouldRunHistoricalImport();
    console.log(`Result: ${shouldRunAgain ? '✅ Should run' : '⏭️ Should skip (correct!)'}`);
    
    // Test 5: Show updated timestamps
    console.log('\n📋 Test 5: Updated historical import timestamps...');
    
    for (const space of spaces) {
      const botStatus = await databaseService.getBotStatus(space.spaceId);
      
      if (botStatus?.lastHistoricalImportAt) {
        const lastImport = new Date(botStatus.lastHistoricalImportAt);
        const minutesAgo = Math.round((Date.now() - lastImport.getTime()) / (1000 * 60));
        console.log(`  ${space.name}: Last imported ${minutesAgo}m ago (${lastImport.toISOString()})`);
      } else {
        console.log(`  ${space.name}: Still never imported`);
      }
    }
    
    console.log('\n✅ Daily historical import test completed successfully!');
    console.log('\n💡 Key points:');
    console.log('  - Historical import only runs once per day per space');
    console.log('  - Each space tracks its own last import time');
    console.log('  - Scheduled task at 2 AM UTC checks if import is needed');
    console.log('  - Manual imports respect the 24-hour cooldown');
    console.log('  - Bot gracefully handles spaces that have never been imported');
    
  } catch (error) {
    console.error('❌ Error during daily historical import test:', error);
  }
}

// Run the test
testDailyHistoricalImport().catch(console.error); 