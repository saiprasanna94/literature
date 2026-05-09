import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';

const DB_PATH = process.env.DB_PATH ?? './literature.sqlite';

const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

// Lightweight idempotent schema bootstrap. Drizzle-kit migrations would be
// cleaner once the schema is more than a few tables, but for v1 this is fine.
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    size INTEGER NOT NULL,
    started_at INTEGER NOT NULL,
    ended_at INTEGER NOT NULL,
    winner TEXT NOT NULL,
    team_a_sets INTEGER NOT NULL,
    team_b_sets INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS game_players (
    game_id TEXT NOT NULL REFERENCES games(id),
    player_id TEXT NOT NULL,
    name TEXT NOT NULL,
    team TEXT NOT NULL,
    seat INTEGER NOT NULL,
    PRIMARY KEY (game_id, player_id)
  );

  CREATE TABLE IF NOT EXISTS game_events (
    game_id TEXT NOT NULL REFERENCES games(id),
    seq INTEGER NOT NULL,
    type TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    at INTEGER NOT NULL,
    PRIMARY KEY (game_id, seq)
  );

  CREATE INDEX IF NOT EXISTS idx_games_ended_at ON games(ended_at DESC);
  CREATE INDEX IF NOT EXISTS idx_game_players_game ON game_players(game_id);
  CREATE INDEX IF NOT EXISTS idx_game_events_game ON game_events(game_id, seq);
`);

export const db = drizzle(sqlite, { schema });
