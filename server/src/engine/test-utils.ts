import { Card, cardId, GameState, Player, parseCardId, TeamId } from '@literature/shared';

/**
 * Build a deterministic 6-player game state with empty hands. Use `setHand`
 * to populate. Useful for targeted unit tests where the deck shuffle would
 * just be noise.
 */
export function blankGame(roomId = 'r1', size: 6 | 8 = 6): GameState {
  const players: Player[] = Array.from({ length: size }, (_, seat) => ({
    id: `p${seat}`,
    name: `P${seat}`,
    team: (seat % 2 === 0 ? 'A' : 'B') as TeamId,
    seat,
    hand: [],
  }));

  return {
    roomId,
    size,
    status: 'in_progress',
    players,
    currentTurnPlayerId: 'p0',
    pendingTurnSelection: null,
    asks: [],
    claims: [],
    claimedSets: [],
    winner: null,
    seq: 0,
  };
}

export function setHand(state: GameState, playerId: string, cardIds: string[]): GameState {
  return {
    ...state,
    players: state.players.map((p) =>
      p.id === playerId ? { ...p, hand: cardIds.map(parseCardId) } : p,
    ),
  };
}

export function handIds(state: GameState, playerId: string): string[] {
  const p = state.players.find((x) => x.id === playerId);
  return p ? p.hand.map(cardId) : [];
}

export function setTurn(state: GameState, playerId: string): GameState {
  return { ...state, currentTurnPlayerId: playerId, pendingTurnSelection: null };
}
