import {
  AskRecord,
  ClaimRecord,
  HistoryEvent,
  HistoryGameDetail,
  HistoryGameSummary,
  TeamId,
} from '@literature/shared';
import { desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { Room } from '../rooms/manager.js';
import { db } from './index.js';
import { gameEvents, gamePlayers, games } from './schema.js';

/**
 * Persist a finished game to the DB. Returns the new game id, or null if
 * the room isn't in a finished state with a winner.
 */
export function saveFinishedGame(room: Room): string | null {
  const game = room.game;
  if (!game || game.status !== 'finished' || !game.winner) return null;

  const id = nanoid(16);
  const teamASets = game.claimedSets.filter((cs) => cs.team === 'A').length;
  const teamBSets = game.claimedSets.filter((cs) => cs.team === 'B').length;
  const startedAt = earliestEventAt(game.asks, game.claims) ?? Date.now();
  const endedAt = Date.now();

  db.transaction((tx) => {
    tx.insert(games)
      .values({
        id,
        roomId: room.roomId,
        size: room.size,
        startedAt,
        endedAt,
        winner: game.winner!,
        teamASets,
        teamBSets,
      })
      .run();

    for (const player of game.players) {
      tx.insert(gamePlayers)
        .values({
          gameId: id,
          playerId: player.id,
          name: player.name,
          team: player.team,
          seat: player.seat,
        })
        .run();
    }

    const events: { seq: number; type: 'ask' | 'claim'; payload: AskRecord | ClaimRecord; at: number }[] = [
      ...game.asks.map((rec) => ({ seq: rec.seq, type: 'ask' as const, payload: rec, at: rec.at })),
      ...game.claims.map((rec) => ({
        seq: rec.seq,
        type: 'claim' as const,
        payload: rec,
        at: rec.at,
      })),
    ];

    for (const ev of events) {
      tx.insert(gameEvents)
        .values({
          gameId: id,
          seq: ev.seq,
          type: ev.type,
          payloadJson: JSON.stringify(ev.payload),
          at: ev.at,
        })
        .run();
    }
  });

  return id;
}

export function listFinishedGames(limit = 50): HistoryGameSummary[] {
  const gameRows = db
    .select()
    .from(games)
    .orderBy(desc(games.endedAt))
    .limit(limit)
    .all();

  if (gameRows.length === 0) return [];

  const ids = gameRows.map((g) => g.id);
  const playerRows = db.select().from(gamePlayers).all();
  const playersByGame = new Map<string, typeof playerRows>();
  for (const p of playerRows) {
    if (!ids.includes(p.gameId)) continue;
    const arr = playersByGame.get(p.gameId) ?? [];
    arr.push(p);
    playersByGame.set(p.gameId, arr);
  }

  return gameRows.map((g) => toSummary(g, playersByGame.get(g.id) ?? []));
}

export function getFinishedGame(gameId: string): HistoryGameDetail | null {
  const gameRow = db.select().from(games).where(eq(games.id, gameId)).get();
  if (!gameRow) return null;

  const players = db
    .select()
    .from(gamePlayers)
    .where(eq(gamePlayers.gameId, gameId))
    .all();

  const eventRows = db
    .select()
    .from(gameEvents)
    .where(eq(gameEvents.gameId, gameId))
    .orderBy(gameEvents.seq)
    .all();

  const events: HistoryEvent[] = eventRows.map((e) => {
    const rec = JSON.parse(e.payloadJson);
    if (e.type === 'ask') return { type: 'ask', rec };
    return { type: 'claim', rec };
  });

  return { ...toSummary(gameRow, players), events };
}

function toSummary(
  g: typeof games.$inferSelect,
  players: (typeof gamePlayers.$inferSelect)[],
): HistoryGameSummary {
  return {
    id: g.id,
    roomId: g.roomId,
    size: g.size as 6 | 8,
    startedAt: g.startedAt,
    endedAt: g.endedAt,
    winner: g.winner as TeamId,
    teamASets: g.teamASets,
    teamBSets: g.teamBSets,
    players: players
      .sort((a, b) => a.seat - b.seat)
      .map((p) => ({
        playerId: p.playerId,
        name: p.name,
        team: p.team as TeamId,
        seat: p.seat,
      })),
  };
}

function earliestEventAt(asks: AskRecord[], claims: ClaimRecord[]): number | undefined {
  let min: number | undefined;
  for (const a of asks) if (min === undefined || a.at < min) min = a.at;
  for (const c of claims) if (min === undefined || c.at < min) min = c.at;
  return min;
}
