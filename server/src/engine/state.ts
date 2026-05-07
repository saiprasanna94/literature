import { GameState, Player, TeamId } from '@literature/shared';
import { deal, RNG } from './deck.js';

export type PlayerInit = { id: string; name: string };

/**
 * Create a new in-progress game state. Players are assigned to teams in
 * alternating order: seats 0,2,4,(6) → A; seats 1,3,5,(7) → B.
 *
 * The first player to act is the player at seat 0.
 */
export function createGame(
  roomId: string,
  size: 6 | 8,
  playerInits: PlayerInit[],
  rng: RNG = Math.random,
): GameState {
  if (playerInits.length !== size) {
    throw new Error(`createGame: expected ${size} players, got ${playerInits.length}`);
  }

  const hands = deal(size, rng);
  const players: Player[] = playerInits.map((p, seat) => ({
    id: p.id,
    name: p.name,
    team: (seat % 2 === 0 ? 'A' : 'B') as TeamId,
    seat,
    hand: hands[seat]!,
  }));

  return {
    roomId,
    size,
    status: 'in_progress',
    players,
    currentTurnPlayerId: players[0]!.id,
    pendingTurnSelection: null,
    asks: [],
    claims: [],
    claimedSets: [],
    winner: null,
    seq: 0,
  };
}

export function findPlayer(state: GameState, playerId: string): Player | undefined {
  return state.players.find((p) => p.id === playerId);
}

export function teammatesOf(state: GameState, playerId: string): Player[] {
  const p = findPlayer(state, playerId);
  if (!p) return [];
  return state.players.filter((q) => q.team === p.team);
}

export function opponentsOf(state: GameState, playerId: string): Player[] {
  const p = findPlayer(state, playerId);
  if (!p) return [];
  return state.players.filter((q) => q.team !== p.team);
}
