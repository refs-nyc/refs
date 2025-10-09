-- Ensure extensions for UUIDs and consistent timestamps
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create the community_subscriptions table if it does not exist
CREATE TABLE IF NOT EXISTS community_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  ref_id TEXT NOT NULL,
  community TEXT,
  inserted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Backfill inserted_at when it is missing (from legacy columns or with NOW())
UPDATE community_subscriptions
SET inserted_at = COALESCE(inserted_at, created, created_at, NOW())
WHERE inserted_at IS NULL;

-- Drop legacy timestamp columns to avoid ambiguity
ALTER TABLE community_subscriptions DROP COLUMN IF EXISTS created;
ALTER TABLE community_subscriptions DROP COLUMN IF EXISTS created_at;

-- Ensure inserted_at keeps a default value
ALTER TABLE community_subscriptions ALTER COLUMN inserted_at SET DEFAULT NOW();

-- Add useful indexes
CREATE INDEX IF NOT EXISTS community_subscriptions_inserted_at_idx 
  ON community_subscriptions (inserted_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS community_subscriptions_user_ref_community_uidx 
  ON community_subscriptions (user_id, ref_id, COALESCE(community, ''));
