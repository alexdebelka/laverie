-- Machines: one row per physical machine. Status is derived at read time from the
-- timestamps below (see src/status.ts), so a machine never gets "stuck".
CREATE TABLE IF NOT EXISTS machines (
  id              INTEGER PRIMARY KEY,
  kind            TEXT    NOT NULL CHECK (kind IN ('washer', 'dryer')),
  label           TEXT    NOT NULL,
  capacity_kg     INTEGER,
  -- A running or finished cycle. NULL when the machine is free.
  started_at      INTEGER,            -- unix seconds
  ends_at         INTEGER,            -- unix seconds
  -- Broken flag. NULL when not reported broken.
  broken_at       INTEGER,            -- unix seconds of the latest report
  broken_reports  INTEGER NOT NULL DEFAULT 0,
  broken_note     TEXT,
  updated_at      INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Anonymous events, used only for the busy-hours chart. No IP, no device id, no user.
CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  machine_id  INTEGER NOT NULL REFERENCES machines(id),
  action      TEXT    NOT NULL CHECK (action IN ('start', 'collect', 'cancel', 'broken', 'fixed')),
  minutes     INTEGER,               -- cycle length for 'start' events
  at          INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS events_at ON events(at);

-- Anonymous free-text feedback. Read it with `npm run db:feedback`.
CREATE TABLE IF NOT EXISTS feedback (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  message     TEXT    NOT NULL,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);
