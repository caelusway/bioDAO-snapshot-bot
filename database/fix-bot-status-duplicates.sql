-- Fix Bot Status Duplicate Records
-- Run this in your Supabase SQL Editor to clean up any duplicate bot status records

-- Step 1: Check for duplicate bot status records
SELECT 
  space_id, 
  COUNT(*) as record_count
FROM governance_bot_status 
GROUP BY space_id 
HAVING COUNT(*) > 1;

-- Step 2: Remove duplicate bot status records (keep only the most recent one)
-- This CTE finds duplicates and keeps only the most recent record per space
WITH duplicates AS (
  SELECT 
    id,
    space_id,
    ROW_NUMBER() OVER (PARTITION BY space_id ORDER BY updated_at DESC, created_at DESC) as rn
  FROM governance_bot_status
)
DELETE FROM governance_bot_status 
WHERE id IN (
  SELECT id 
  FROM duplicates 
  WHERE rn > 1
);

-- Step 3: Verify no more duplicates exist
SELECT 
  space_id, 
  COUNT(*) as record_count
FROM governance_bot_status 
GROUP BY space_id 
HAVING COUNT(*) > 1;

-- Step 4: Show current bot status records
SELECT 
  gbs.id,
  gss.space_id,
  gss.name,
  gbs.status,
  gbs.last_check_at,
  gbs.proposals_processed,
  gbs.tweets_posted,
  gbs.created_at,
  gbs.updated_at
FROM governance_bot_status gbs
JOIN governance_snapshot_spaces gss ON gbs.space_id = gss.id
ORDER BY gss.name; 