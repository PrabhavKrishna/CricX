-- ──────────────────────────────────────────────
-- cricX – Supabase Schema
-- Run this in the Supabase SQL Editor
-- ──────────────────────────────────────────────

-- =============================================
-- USERS
-- =============================================
CREATE TABLE users (
  id        TEXT PRIMARY KEY,
  email     TEXT UNIQUE NOT NULL,
  name      TEXT NOT NULL,
  avatar    TEXT,
  role      TEXT NOT NULL DEFAULT 'VIEWER'
    CHECK (role IN ('SUPER_ADMIN', 'SCORER', 'VIEWER', 'HOST', 'ADMIN'))
);

-- =============================================
-- TEAMS
-- =============================================
CREATE TABLE teams (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  short_name TEXT NOT NULL,
  logo       TEXT
);

-- =============================================
-- PLAYERS
-- =============================================
CREATE TABLE players (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  avatar         TEXT,
  batting_style  TEXT NOT NULL DEFAULT 'RIGHT_HANDED',
  bowling_style  TEXT NOT NULL DEFAULT 'RIGHT_ARM_FAST',
  team_id        TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE
);

-- =============================================
-- TOURNAMENTS
-- =============================================
CREATE TABLE tournaments (
  id                   TEXT PRIMARY KEY,
  name                 TEXT NOT NULL,
  host_id              TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  format               TEXT NOT NULL DEFAULT 'LEAGUE'
    CHECK (format IN ('LEAGUE', 'KNOCKOUT', 'PLAYOFFS')),
  start_date           TEXT NOT NULL,
  end_date             TEXT NOT NULL,
  overs_per_match      INTEGER NOT NULL DEFAULT 10,
  balls_per_over       INTEGER NOT NULL DEFAULT 6,
  runs_per_wide        INTEGER NOT NULL DEFAULT 1,
  runs_per_no_ball     INTEGER NOT NULL DEFAULT 1,
  points_for_win       INTEGER NOT NULL DEFAULT 2,
  points_for_tie       INTEGER NOT NULL DEFAULT 1,
  points_for_loss      INTEGER NOT NULL DEFAULT 0,
  max_bouncers_per_over INTEGER NOT NULL DEFAULT 1,
  waist_height_limit_cm INTEGER NOT NULL DEFAULT 90,
  custom_ball_rules    JSONB NOT NULL DEFAULT '[]',
  squads               JSONB NOT NULL DEFAULT '{}',
  members              JSONB NOT NULL DEFAULT '[]'
);

-- =============================================
-- TOURNAMENT STANDINGS
-- =============================================
CREATE TABLE tournament_standings (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id       TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  played        INTEGER NOT NULL DEFAULT 0,
  won           INTEGER NOT NULL DEFAULT 0,
  lost          INTEGER NOT NULL DEFAULT 0,
  tied          INTEGER NOT NULL DEFAULT 0,
  points        INTEGER NOT NULL DEFAULT 0,
  net_run_rate  REAL NOT NULL DEFAULT 0,
  UNIQUE(tournament_id, team_id)
);

-- =============================================
-- MATCHES
-- =============================================
CREATE TABLE matches (
  id              TEXT PRIMARY KEY,
  tournament_id   TEXT REFERENCES tournaments(id) ON DELETE SET NULL,
  home_team_id    TEXT NOT NULL REFERENCES teams(id),
  away_team_id    TEXT NOT NULL REFERENCES teams(id),
  status          TEXT NOT NULL DEFAULT 'UPCOMING'
    CHECK (status IN ('UPCOMING', 'LIVE', 'COMPLETED', 'ABANDONED')),
  venue           TEXT NOT NULL DEFAULT '',
  date            TEXT NOT NULL,
  toss_winner_id  TEXT REFERENCES teams(id),
  toss_decision   TEXT CHECK (toss_decision IN ('BAT', 'BOWL')),
  overs_count     INTEGER NOT NULL DEFAULT 10,
  current_innings INTEGER NOT NULL DEFAULT 1,
  scorer_id       TEXT REFERENCES users(id),
  winner_id       TEXT,
  innings         JSONB NOT NULL DEFAULT '[]'
);

-- =============================================
-- COMMENTARY
-- =============================================
CREATE TABLE commentary (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  match_id      TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  over_number   INTEGER NOT NULL,
  ball_number   INTEGER NOT NULL,
  text          TEXT NOT NULL,
  is_wicket     BOOLEAN NOT NULL DEFAULT FALSE,
  is_boundary   BOOLEAN NOT NULL DEFAULT FALSE,
  timestamp     TEXT NOT NULL DEFAULT (now()::TEXT)
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_players_team_id ON players(team_id);
CREATE INDEX idx_matches_tournament_id ON matches(tournament_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_tournament_standings_tournament ON tournament_standings(tournament_id);
CREATE INDEX idx_commentary_match_id ON commentary(match_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE commentary ENABLE ROW LEVEL SECURITY;

-- Allow public read, restrict writes
CREATE POLICY "Allow public read" ON users FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON teams FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON players FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON tournaments FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON tournament_standings FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON matches FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON commentary FOR SELECT USING (true);

-- Allow all operations for now (dev mode). Lock down in production.
CREATE POLICY "Allow all" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON tournaments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON tournament_standings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON matches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON commentary FOR ALL USING (true) WITH CHECK (true);
