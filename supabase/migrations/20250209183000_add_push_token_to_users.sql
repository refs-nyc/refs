ALTER TABLE users
  ADD COLUMN IF NOT EXISTS push_token TEXT;

CREATE INDEX IF NOT EXISTS users_push_token_idx ON users (push_token)
  WHERE push_token IS NOT NULL;
