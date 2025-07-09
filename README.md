# bioDAO Snapshot Twitter Bot

A TypeScript-based Twitter bot that monitors multiple DAO Snapshot governance proposals and automatically tweets announcements when new proposals are created. Built with multi-space architecture and Supabase database integration.

## Features

- 🔍 **Multi-Space Monitoring**: Monitors multiple DAO Snapshot spaces simultaneously
- 🐦 **Twitter Integration**: Posts engaging tweets with green emojis and time-based urgency
- 🚦 **Rate Limiting**: Respects Twitter API free tier limits with intelligent queuing
- 📊 **Queue System**: Processes tweets in order with retry logic for failed posts
- 🗄️ **Database Storage**: Supabase integration for persistent data storage
- ⏰ **Scheduled Tasks**: Configurable check intervals and maintenance routines
- 🛡️ **Error Handling**: Robust error handling with graceful shutdown
- 📈 **Status Reporting**: Regular status updates and queue monitoring
- 🏗️ **Scalable Architecture**: Built for multiple DAO spaces with proper database normalization

## Prerequisites

- Node.js 18+ 
- Twitter Developer Account with API keys
- Supabase account and project
- Access to desired DAO Snapshot spaces

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd biodao-snapshot-bot
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables by copying `env.example` to `.env`:
```bash
cp env.example .env
```

4. Configure your environment variables in `.env`:
```bash
# Twitter API Configuration
TWITTER_BEARER_TOKEN=your_bearer_token_here
TWITTER_APP_KEY=your_app_key_here
TWITTER_APP_SECRET=your_app_secret_here
TWITTER_ACCESS_TOKEN=your_access_token_here
TWITTER_ACCESS_SECRET=your_access_secret_here

# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_anon_key_here

# Bot Configuration
SNAPSHOT_API_URL=https://hub.snapshot.org/graphql
CHECK_INTERVAL_MINUTES=15
TWEET_QUEUE_DELAY_SECONDS=60
MAX_RETRIES=3
LOG_LEVEL=info
```

5. Set up the database schema in Supabase:
```bash
# Run the database schema
psql -f database/schema.sql
```

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

### Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Run the compiled bot
- `npm run dev` - Run in development mode with ts-node
- `npm run watch` - Watch for changes and recompile

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TWITTER_BEARER_TOKEN` | Twitter API v2 Bearer Token | Required |
| `TWITTER_APP_KEY` | Twitter API v1.1 App Key | Required |
| `TWITTER_APP_SECRET` | Twitter API v1.1 App Secret | Required |
| `TWITTER_ACCESS_TOKEN` | Twitter API v1.1 Access Token | Required |
| `TWITTER_ACCESS_SECRET` | Twitter API v1.1 Access Secret | Required |
| `SUPABASE_URL` | Supabase project URL | Required |
| `SUPABASE_KEY` | Supabase anon key | Required |
| `SNAPSHOT_API_URL` | Snapshot GraphQL API URL | `https://hub.snapshot.org/graphql` |
| `CHECK_INTERVAL_MINUTES` | How often to check for new proposals | `15` |
| `TWEET_QUEUE_DELAY_SECONDS` | Delay between tweets | `60` |
| `MAX_RETRIES` | Maximum retry attempts for failed tweets | `3` |
| `LOG_LEVEL` | Logging level | `info` |

## Architecture

The bot is built with a modular, multi-space architecture:

```
src/
├── types/           # TypeScript interfaces and types
├── utils/           # Utility functions (config, helpers)
├── services/        # Core services
│   ├── snapshot.ts  # Snapshot API integration
│   ├── twitter.ts   # Twitter API integration
│   ├── database.ts  # Supabase database integration
│   ├── queue.ts     # Tweet queue management
│   └── bot.ts       # Main bot orchestration
├── database/        # Database schema and migrations
│   ├── schema.sql   # Database schema
│   └── *.sql        # Database utilities
└── index.ts         # Entry point and scheduling
```

### Key Components

1. **SnapshotService**: Fetches proposals from multiple DAO spaces using GraphQL
2. **TwitterService**: Handles Twitter API interactions with improved tweet formatting
3. **DatabaseService**: Manages Supabase database operations for all data persistence
4. **QueueService**: Manages tweet queue with retry logic and database logging
5. **BioDAOBot**: Main orchestration service handling multiple spaces

### Database Schema

- **governance_snapshot_spaces**: Stores DAO space configurations
- **governance_snapshot_proposals**: Stores proposal data from all spaces
- **governance_tweet_logs**: Tracks all tweet attempts and success/failure
- **governance_bot_status**: Maintains bot operational status per space

## Tweet Format

The bot generates tweets in this improved format:

```
🟢 New Governance Proposal [DAO Name]

✨ [Proposal Title]

⏰ [Time remaining with urgency text]

🗳️ Vote: [Snapshot URL]

#DAO #DeSci #Vote
```

### Format Features

- **🟢 Green emoji** for active proposals (positive and engaging)
- **✨ Sparkles** for eye-catching proposal titles
- **⏰ Time-based urgency** text (e.g., "48h remaining - Don't miss out!")
- **🗳️ Simple voting** call-to-action
- **🏷️ Clean hashtags** for better discoverability
- **📏 Automatic title truncation** to fit character limits
- **📊 Always under 280 characters**

## Scheduling

The bot runs several scheduled tasks:

- **New Proposals**: Every 15 minutes (configurable)
- **Active Proposals Check**: Every hour
- **Maintenance**: Every 6 hours
- **Status Report**: Every 30 minutes

## Free Tier Limitations

The bot is designed to work within Twitter API free tier limits:

- **Tweet Rate Limit**: 300 tweets per 15-minute window
- **Queue Delay**: Minimum 60 seconds between tweets
- **Rate Limit Handling**: Automatic backoff and retry logic

## Error Handling

- Comprehensive error handling for API failures
- Retry logic for failed tweets
- Graceful shutdown on system signals
- Persistent storage of failed attempts

## Database Storage

The bot uses Supabase PostgreSQL for persistent storage:

### Data Stored
- **DAO Space Configurations**: Active spaces to monitor
- **Proposal Data**: Complete proposal information from all spaces
- **Tweet Logs**: All tweet attempts with success/failure status
- **Bot Status**: Operational status and health monitoring per space
- **Processing Timestamps**: Track when proposals were last processed

### Benefits
- **Scalability**: Handle multiple DAO spaces simultaneously
- **Reliability**: ACID compliance and data consistency
- **Monitoring**: Comprehensive logging and status tracking
- **Performance**: Efficient queries and data retrieval

## Multi-Space Setup

The bot supports monitoring multiple DAO spaces. To add new spaces:

1. **Add to Database**: Insert space configuration in `governance_snapshot_spaces` table
2. **Space Configuration**: 
   ```sql
   INSERT INTO governance_snapshot_spaces (space_id, name, is_active) 
   VALUES ('newdao.eth', 'New DAO', true);
   ```
3. **Automatic Processing**: The bot will automatically start monitoring new active spaces

### Supported Spaces
- bioDAO (bioxyz.eth)
- CerebrumDAO (cerebrumdao.eth)
- Any Snapshot space can be added

## Troubleshooting

### Common Issues

1. **No tweets being posted**: Check if proposals exist in database but have no tweet logs
2. **Database connection errors**: Verify Supabase URL and key are correct
3. **Rate limiting**: Bot automatically handles Twitter API rate limits
4. **Missing proposals**: Check if spaces are marked as `is_active = true`

### Debug Scripts

- `src/debug-tweet-issue.ts`: Diagnose tweet posting problems
- `src/manual-process-proposals.ts`: Manually trigger proposal processing
- `src/verify-anon-access.ts`: Test database access permissions

### Logs

Check logs for:
- Database connection status
- Twitter API responses
- Queue processing status
- Error messages with stack traces

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License

## Support

For issues and questions, please open an issue in the repository. Common issues include database connectivity, Twitter API rate limits, and multi-space configuration problems.