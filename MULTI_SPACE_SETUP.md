# Multi-Space bioDAO Snapshot Bot Setup

This guide explains how to set up the multi-space version of the bioDAO Snapshot Bot that uses Supabase for data storage and supports tracking multiple Snapshot spaces.

## 🏗️ **Architecture Overview**

The bot now supports:
- **Multiple Snapshot spaces** tracking
- **Centralized Twitter account** (one Twitter bot for all spaces)
- **Supabase database** for persistent storage
- **Centralized configuration** via database
- **Comprehensive logging** and status tracking

## 🗄️ **Database Setup**

### 1. Create Supabase Project
1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Create a new project
3. Wait for the project to be ready

### 2. Run Database Schema
Copy the contents of `database/schema.sql` and run it in your Supabase SQL Editor:

```sql
-- Run all the commands from database/schema.sql
```

This creates:
- `governance_snapshot_spaces` - Configuration for each Snapshot space
- `governance_snapshot_proposals` - Tracked proposals from all spaces
- `governance_tweet_logs` - Log of all tweets posted
- `governance_bot_status` - Operational status per space
- Proper indexes and relationships

### 3. Get Supabase Credentials
From your Supabase project settings:
- **URL**: `https://your-project-id.supabase.co`
- **Anon Key**: Your public anon key (safe to use in client-side code)

## ⚙️ **Environment Configuration**

Create a `.env` file:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your_supabase_anon_key_here

# Snapshot Configuration
SNAPSHOT_API_URL=https://testnet.hub.snapshot.org/graphql

# Bot Configuration
CHECK_INTERVAL_MINUTES=15
TWEET_QUEUE_DELAY_SECONDS=60
MAX_RETRIES=3

# Logging
LOG_LEVEL=info
```

## 📋 **Space Configuration**

### Adding a New Space

Use the Supabase dashboard or SQL editor to add spaces:

```sql
INSERT INTO governance_snapshot_spaces (
  space_id,
  name,
  description,
  network,
  active
) VALUES (
  'biodao.eth',
  'bioDAO',
  'bioDAO main governance space',
  1, -- Ethereum mainnet
  true
);
```

### Configuration Fields

- **space_id**: The Snapshot space ID (e.g., `biodao.eth`)
- **name**: Display name for the space
- **description**: Optional description
- **network**: Ethereum network ID (1 = mainnet, 11155111 = Sepolia)
- **active**: Whether to track this space

**Note**: Twitter credentials and check intervals are configured once in the environment variables and used for all spaces.

## 🐦 **Twitter Configuration**

One centralized Twitter account posts about all spaces:

### 1. Create Twitter Developer Account
1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a new App for the bot
3. Get OAuth 1.0a credentials (API Key, API Secret, Access Token, Access Token Secret)

### 2. App Settings
- **App permissions**: Read and write
- **App type**: Automated App or Bot
- **Callback URL**: `http://localhost:3000/callback` (for testing)

### 3. Store Credentials in Environment
Add the credentials to your `.env` file as shown in the Environment Configuration section above.

## 🚀 **Installation & Running**

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Bot
```bash
npm run dev
```

### 3. Monitor Logs
The bot will:
- Check all active spaces for new proposals
- Post tweets from respective Twitter accounts
- Log all activities to the database
- Handle errors with retry logic

## 📊 **Database Tables**

### Governance Snapshot Spaces Table
Stores configuration for each tracked space:
- Space metadata (name, description, network)
- Active status (whether to track this space)
- Twitter credentials and check intervals are centralized in environment variables

### Governance Snapshot Proposals Table
Tracks all proposals from all spaces:
- Proposal data from Snapshot
- Processing status
- Timestamps and metadata

### Governance Tweet Logs Table
Logs all tweet activities:
- Tweet content and IDs
- Success/failure status
- Retry attempts
- Error messages

### Governance Bot Status Table
Tracks operational status:
- Last check times
- Processing statistics
- Error states

## 🔧 **Management Commands**

### View Active Spaces
```sql
SELECT * FROM governance_active_spaces_with_stats;
```

### Check Bot Status
```sql
SELECT 
  s.space_id,
  s.name,
  bs.status,
  bs.last_check_at,
  bs.proposals_processed,
  bs.tweets_posted
FROM governance_snapshot_spaces s
JOIN governance_bot_status bs ON s.id = bs.space_id
WHERE s.active = true;
```

### View Recent Proposals
```sql
SELECT 
  p.title,
  p.state,
  p.processed,
  s.space_id,
  p.created_at
FROM governance_snapshot_proposals p
JOIN governance_snapshot_spaces s ON p.space_id = s.id
ORDER BY p.created_at DESC
LIMIT 10;
```

### Check Tweet Logs
```sql
SELECT 
  tl.tweet_text,
  tl.status,
  tl.posted_at,
  tl.error_message,
  s.space_id
FROM governance_tweet_logs tl
JOIN governance_snapshot_spaces s ON tl.space_id = s.id
ORDER BY tl.created_at DESC
LIMIT 10;
```

## 🛠️ **Troubleshooting**

### Bot Not Finding Proposals
1. Check if space is active: `SELECT * FROM governance_snapshot_spaces WHERE active = true`
2. Verify space_id matches Snapshot space exactly
3. Check network configuration (mainnet vs testnet)
4. Review governance_bot_status table for errors

### Twitter Authentication Issues
1. Verify OAuth 1.0a credentials in spaces table
2. Check Twitter app permissions (must be Read and Write)
3. Ensure app type is "Automated App or Bot"
4. Test credentials with a simple API call

### Database Connection Issues
1. Verify Supabase URL and key in `.env`
2. Check Supabase project status
3. Verify Row Level Security policies if enabled
4. Test connection with a simple query

## 🔄 **Migration from Single Space**

If migrating from the old single-space version:

1. **Run the new database schema**
2. **Insert your existing space into the governance_snapshot_spaces table**
3. **Update your `.env` file** with Supabase credentials
4. **Remove old storage files** (`./data/processed_proposals.json`)
5. **Update bot configuration** to use the new system

## 📈 **Monitoring & Analytics**

The database provides rich analytics:
- Proposal processing rates
- Tweet success rates
- Space activity metrics
- Error tracking and patterns

Use the provided views and queries to monitor bot performance and track governance activity across all spaces.

## 🔐 **Security Considerations**

- **Twitter credentials** are stored in environment variables - keep them secure and never commit to version control
- **Supabase RLS** (Row Level Security) is enabled - configure policies as needed
- **Environment variables** should be secured and not committed to version control
- **API keys** should be rotated regularly

## 🎯 **Next Steps**

1. **Set up Supabase project**
2. **Run database schema**
3. **Configure spaces** with Twitter credentials
4. **Test with a single space** first
5. **Scale to multiple spaces**
6. **Monitor and optimize**

This architecture provides a robust foundation for managing multiple DAOs and their governance communications across Twitter. 