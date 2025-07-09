-- bioDAO Snapshot Bot - Fix RLS Issues for Anonymous Access
-- Run this in your Supabase SQL Editor

-- Enable RLS and create policies for ANONYMOUS ACCESS
-- This allows the bot to work with the anon key

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for service role" ON governance_snapshot_spaces;
DROP POLICY IF EXISTS "Enable all access for service role" ON governance_snapshot_spaces;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON governance_snapshot_spaces;
DROP POLICY IF EXISTS "Enable read access for anon" ON governance_snapshot_spaces;
DROP POLICY IF EXISTS "Enable all access for anon" ON governance_snapshot_spaces;

DROP POLICY IF EXISTS "Enable read access for service role" ON governance_snapshot_proposals;
DROP POLICY IF EXISTS "Enable all access for service role" ON governance_snapshot_proposals;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON governance_snapshot_proposals;
DROP POLICY IF EXISTS "Enable read access for anon" ON governance_snapshot_proposals;
DROP POLICY IF EXISTS "Enable all access for anon" ON governance_snapshot_proposals;

DROP POLICY IF EXISTS "Enable read access for service role" ON governance_tweet_logs;
DROP POLICY IF EXISTS "Enable all access for service role" ON governance_tweet_logs;
DROP POLICY IF EXISTS "Enable read access for anon" ON governance_tweet_logs;
DROP POLICY IF EXISTS "Enable all access for anon" ON governance_tweet_logs;

DROP POLICY IF EXISTS "Enable read access for service role" ON governance_bot_status;
DROP POLICY IF EXISTS "Enable all access for service role" ON governance_bot_status;
DROP POLICY IF EXISTS "Enable read access for anon" ON governance_bot_status;
DROP POLICY IF EXISTS "Enable all access for anon" ON governance_bot_status;

-- ENABLE FULL ANONYMOUS ACCESS FOR ALL GOVERNANCE TABLES
-- This allows the bot to work with anon key

-- Policies for governance_snapshot_spaces
CREATE POLICY "Enable all access for anon" ON governance_snapshot_spaces
  FOR ALL
  USING (true);

-- Policies for governance_snapshot_proposals  
CREATE POLICY "Enable all access for anon" ON governance_snapshot_proposals
  FOR ALL
  USING (true);

-- Policies for governance_tweet_logs
CREATE POLICY "Enable all access for anon" ON governance_tweet_logs
  FOR ALL
  USING (true);

-- Policies for governance_bot_status
CREATE POLICY "Enable all access for anon" ON governance_bot_status
  FOR ALL
  USING (true);

-- Verify RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('governance_snapshot_spaces', 'governance_snapshot_proposals', 'governance_tweet_logs', 'governance_bot_status');

-- Check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN ('governance_snapshot_spaces', 'governance_snapshot_proposals', 'governance_tweet_logs', 'governance_bot_status')
ORDER BY tablename, policyname;

-- Test query to verify access
SELECT 'governance_snapshot_spaces' as table_name, count(*) as row_count FROM governance_snapshot_spaces
UNION ALL
SELECT 'governance_snapshot_proposals' as table_name, count(*) as row_count FROM governance_snapshot_proposals  
UNION ALL
SELECT 'governance_tweet_logs' as table_name, count(*) as row_count FROM governance_tweet_logs
UNION ALL
SELECT 'governance_bot_status' as table_name, count(*) as row_count FROM governance_bot_status; 