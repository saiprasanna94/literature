import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const games = sqliteTable('games', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull(),
  size: integer('size').notNull(),
  startedAt: integer('started_at').notNull(),
  endedAt: integer('ended_at').notNull(),
  winner: text('winner').notNull(), // 'A' | 'B'
  teamASets: integer('team_a_sets').notNull(),
  teamBSets: integer('team_b_sets').notNull(),
});

export const gamePlayers = sqliteTable(
  'game_players',
  {
    gameId: text('game_id')
      .notNull()
      .references(() => games.id),
    playerId: text('player_id').notNull(),
    name: text('name').notNull(),
    team: text('team').notNull(), // 'A' | 'B'
    seat: integer('seat').notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.gameId, t.playerId] }) }),
);

export const gameEvents = sqliteTable(
  'game_events',
  {
    gameId: text('game_id')
      .notNull()
      .references(() => games.id),
    seq: integer('seq').notNull(),
    type: text('type').notNull(), // 'ask' | 'claim'
    payloadJson: text('payload_json').notNull(),
    at: integer('at').notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.gameId, t.seq] }) }),
);
