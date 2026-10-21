CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  TEXT NOT NULL,
  title       TEXT NOT NULL DEFAULT 'New chat',
  context     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations(session_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id              BIGSERIAL PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user','bot')),
  content         TEXT NOT NULL,
  intent          TEXT,
  confidence      REAL,
  entities        JSONB,
  sentiment       JSONB,
  source          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, id);
