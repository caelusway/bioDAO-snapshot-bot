-- Migration: Add historical import tracking to bot status
-- Run this SQL in your Supabase SQL Editor

-- Add column to track last historical import time
ALTER TABLE governance_bot_status 
ADD COLUMN last_historical_import_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN governance_bot_status.last_historical_import_at IS 'Timestamp of the last successful historical data import for this space';

-- Update the view to include the new field
DROP VIEW IF EXISTS governance_active_spaces_with_stats;

CREATE VIEW governance_active_spaces_with_stats AS
SELECT 
  s.*,
  bs.last_check_at,
  bs.last_historical_import_at,
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
GROUP BY s.id, bs.last_check_at, bs.last_historical_import_at, bs.proposals_processed, bs.tweets_posted, bs.status; 