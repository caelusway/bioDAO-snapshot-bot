-- bioDAO Snapshot Bot Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Governance Snapshot Spaces table - stores tracked Snapshot spaces
CREATE TABLE governance_snapshot_spaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_id VARCHAR(255) UNIQUE NOT NULL, -- e.g., "biotester.eth"
  name VARCHAR(255) NOT NULL, -- e.g., "Biotester"
  description TEXT,
  network INTEGER NOT NULL DEFAULT 11155111, -- Ethereum network ID (11155111 = Sepolia)
  active BOOLEAN DEFAULT TRUE, -- Whether to track this space
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT governance_snapshot_spaces_space_id_key UNIQUE (space_id)
);

-- Governance Snapshot Proposals table - stores tracked proposals
CREATE TABLE governance_snapshot_proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_id UUID NOT NULL REFERENCES governance_snapshot_spaces(id) ON DELETE CASCADE,
  proposal_id VARCHAR(255) NOT NULL, -- Snapshot proposal ID
  title TEXT NOT NULL,
  body TEXT,
  author VARCHAR(255) NOT NULL, -- Ethereum address
  created_at_snapshot INTEGER NOT NULL, -- Unix timestamp from Snapshot
  start_time INTEGER NOT NULL, -- Voting start time
  end_time INTEGER NOT NULL, -- Voting end time
  snapshot_block INTEGER,
  state VARCHAR(50) NOT NULL, -- pending, active, closed
  link TEXT NOT NULL, -- Direct link to proposal
  choices JSONB, -- Voting choices array
  scores JSONB, -- Voting scores array
  scores_total NUMERIC DEFAULT 0,
  votes_count INTEGER DEFAULT 0,
  processed BOOLEAN DEFAULT FALSE, -- Whether we've processed this proposal
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT governance_snapshot_proposals_space_proposal_key UNIQUE (space_id, proposal_id)
);

-- Governance Tweet Logs table - tracks posted tweets
CREATE TABLE governance_tweet_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id UUID NOT NULL REFERENCES governance_snapshot_proposals(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES governance_snapshot_spaces(id) ON DELETE CASCADE,
  tweet_id VARCHAR(255), -- Twitter tweet ID (if successful)
  tweet_text TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, posted, failed
  error_message TEXT, -- Error details if failed
  retry_count INTEGER DEFAULT 0,
  posted_at TIMESTAMP WITH TIME ZONE, -- When successfully posted
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Governance Bot Status table - tracks bot operational status
CREATE TABLE governance_bot_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_id UUID NOT NULL REFERENCES governance_snapshot_spaces(id) ON DELETE CASCADE,
  last_check_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_proposal_id VARCHAR(255), -- Last processed proposal ID
  status VARCHAR(50) DEFAULT 'running', -- running, paused, error
  error_message TEXT,
  proposals_processed INTEGER DEFAULT 0,
  tweets_posted INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one status per space
  CONSTRAINT governance_bot_status_space_key UNIQUE (space_id)
);

-- Create indexes for better performance
CREATE INDEX idx_governance_snapshot_spaces_active ON governance_snapshot_spaces(active);
CREATE INDEX idx_governance_snapshot_spaces_space_id ON governance_snapshot_spaces(space_id);
CREATE INDEX idx_governance_snapshot_proposals_space_id ON governance_snapshot_proposals(space_id);
CREATE INDEX idx_governance_snapshot_proposals_processed ON governance_snapshot_proposals(processed);
CREATE INDEX idx_governance_snapshot_proposals_state ON governance_snapshot_proposals(state);
CREATE INDEX idx_governance_snapshot_proposals_created_at_snapshot ON governance_snapshot_proposals(created_at_snapshot);
CREATE INDEX idx_governance_tweet_logs_proposal_id ON governance_tweet_logs(proposal_id);
CREATE INDEX idx_governance_tweet_logs_status ON governance_tweet_logs(status);
CREATE INDEX idx_governance_bot_status_space_id ON governance_bot_status(space_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_governance_snapshot_spaces_updated_at BEFORE UPDATE ON governance_snapshot_spaces FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_governance_snapshot_proposals_updated_at BEFORE UPDATE ON governance_snapshot_proposals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_governance_tweet_logs_updated_at BEFORE UPDATE ON governance_tweet_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_governance_bot_status_updated_at BEFORE UPDATE ON governance_bot_status FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) - Optional but recommended
ALTER TABLE governance_snapshot_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_snapshot_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_tweet_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_bot_status ENABLE ROW LEVEL SECURITY;

-- Insert sample data for testing
INSERT INTO governance_snapshot_spaces (space_id, name, description, network, active) VALUES
('biotester.eth', 'Biotester', 'bioDAO testing space on Sepolia testnet', 11155111, TRUE),
('biodao.eth', 'bioDAO', 'bioDAO main governance space', 1, TRUE), -- Disabled for now
('athenadao.eth', 'AthenaDAO', 'AthenaDAO governance space', 1, TRUE),
('cerebrumdao.eth', 'CerebrumDAO', 'CerebrumDAO governance space', 1, TRUE),
('vote.cryodao.eth', 'CryoDAO', 'CryoDAO governance space', 1, TRUE),
('psydao.eth', 'PsyDAO', 'PsyDAO governance space', 1, TRUE),
('qbio.eth', 'QBio', 'QBio governance space', 1, TRUE),
('vote.vitadao.eth', 'VitaDAO', 'VitaDAO governance space', 1, TRUE),
('hairdao.eth', 'HairDAO', 'HairDAO governance space', 1, TRUE),
('longcovidlabs.eth', 'Long COVID Labs', 'Long COVID Labs governance space', 1, TRUE);

-- Insert bot status for each space
INSERT INTO governance_bot_status (space_id, status) 
SELECT id, 'running' FROM governance_snapshot_spaces WHERE active = TRUE;

-- Views for easier querying
CREATE VIEW governance_active_spaces_with_stats AS
SELECT 
  s.*,
  bs.last_check_at,
  bs.proposals_processed,
  bs.tweets_posted,
  bs.status as bot_status,
  COUNT(p.id) as total_proposals,
  COUNT(CASE WHEN p.processed = TRUE THEN 1 END) as processed_proposals,
  COUNT(CASE WHEN p.state = 'active' THEN 1 END) as active_proposals
FROM governance_snapshot_spaces s
LEFT JOIN governance_bot_status bs ON s.id = bs.space_id
LEFT JOIN governance_snapshot_proposals p ON s.id = p.space_id
WHERE s.active = TRUE
GROUP BY s.id, bs.last_check_at, bs.proposals_processed, bs.tweets_posted, bs.status;

-- Comments for documentation
COMMENT ON TABLE governance_snapshot_spaces IS 'Tracked Snapshot spaces with their configuration (Twitter credentials and check intervals are centralized in environment)';
COMMENT ON TABLE governance_snapshot_proposals IS 'Snapshot proposals from tracked spaces';
COMMENT ON TABLE governance_tweet_logs IS 'Log of all tweets posted by the centralized Twitter bot';
COMMENT ON TABLE governance_bot_status IS 'Operational status of the bot per space';
COMMENT ON VIEW governance_active_spaces_with_stats IS 'Active spaces with their processing statistics'; 