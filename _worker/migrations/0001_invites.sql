-- Invitation requests from datumatelier.uk
CREATE TABLE IF NOT EXISTS invites (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  email             TEXT    NOT NULL UNIQUE,
  role              TEXT    NOT NULL CHECK (role IN ('owner', 'collector', 'workshop', 'other')),
  note              TEXT    NOT NULL DEFAULT '' CHECK (length(note) <= 500),
  marketing_consent INTEGER NOT NULL DEFAULT 0 CHECK (marketing_consent IN (0, 1)),
  consent_text      TEXT,
  created_at        TEXT    NOT NULL,
  updated_at        TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS invites_updated_at ON invites (updated_at);
