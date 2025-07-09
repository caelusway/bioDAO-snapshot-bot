# bioDAO Snapshot Twitter Bot

A TypeScript-based Twitter bot that monitors bioDAO Snapshot governance proposals and automatically tweets announcements when new proposals are created.

## Features

- 🔍 **Automated Monitoring**: Periodically checks bioDAO Snapshot for new governance proposals
- 🐦 **Twitter Integration**: Posts concise, engaging tweets with proposal details
- 🚦 **Rate Limiting**: Respects Twitter API free tier limits with intelligent queuing
- 📊 **Queue System**: Processes tweets in order with retry logic for failed posts
- 💾 **Persistent Storage**: Tracks processed proposals to avoid duplicates
- ⏰ **Scheduled Tasks**: Configurable check intervals and maintenance routines
- 🛡️ **Error Handling**: Robust error handling with graceful shutdown
- 📈 **Status Reporting**: Regular status updates and queue monitoring

## Prerequisites

- Node.js 18+ 
- Twitter Developer Account with API keys
- bioDAO Snapshot space access

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

# bioDAO Configuration
BIODAO_SNAPSHOT_SPACE=biodao.eth
SNAPSHOT_API_URL=https://hub.snapshot.org/graphql

# Bot Configuration
CHECK_INTERVAL_MINUTES=15
TWEET_QUEUE_DELAY_SECONDS=60
MAX_RETRIES=3
STORAGE_FILE=./data/processed_proposals.json
LOG_LEVEL=info
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
| `BIODAO_SNAPSHOT_SPACE` | bioDAO Snapshot space ID | `biodao.eth` |
| `SNAPSHOT_API_URL` | Snapshot GraphQL API URL | `https://hub.snapshot.org/graphql` |
| `CHECK_INTERVAL_MINUTES` | How often to check for new proposals | `15` |
| `TWEET_QUEUE_DELAY_SECONDS` | Delay between tweets | `60` |
| `MAX_RETRIES` | Maximum retry attempts for failed tweets | `3` |
| `STORAGE_FILE` | Path to store processed proposals | `./data/processed_proposals.json` |
| `LOG_LEVEL` | Logging level | `info` |

## Architecture

The bot is built with a modular architecture:

```
src/
├── types/           # TypeScript interfaces and types
├── utils/           # Utility functions (config, helpers)
├── services/        # Core services
│   ├── snapshot.ts  # Snapshot API integration
│   ├── twitter.ts   # Twitter API integration
│   ├── storage.ts   # Persistent storage management
│   ├── queue.ts     # Tweet queue management
│   └── bot.ts       # Main bot orchestration
└── index.ts         # Entry point and scheduling
```

### Key Components

1. **SnapshotService**: Fetches proposals from bioDAO Snapshot using GraphQL
2. **TwitterService**: Handles Twitter API interactions with rate limiting
3. **StorageService**: Manages persistent storage of processed proposals
4. **QueueService**: Manages tweet queue with retry logic
5. **BioDAOBot**: Main orchestration service

## Tweet Format

The bot generates tweets in this format:

```
🔴 New bioDAO Governance Proposal

📋 [Proposal Title]

⏰ [Time remaining/status]

🗳️ Vote now: [Snapshot URL]

#bioDAO #DeSci #Governance #Vote
```

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

## Storage

The bot uses JSON file storage by default, storing:
- Processed proposal IDs
- Tweet IDs for successful posts
- Retry counts for failed attempts
- Processing timestamps

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License

## Support

For issues and questions, please open an issue in the repository. 