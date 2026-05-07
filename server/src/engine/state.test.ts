import { describe, it, expect } from 'vitest';
import { cardId } from '@literature/shared';
import { createGame } from './state.js';

function seededRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

const sixPlayers = Array.from({ length: 6 }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));

describe('createGame', () => {
  it('alternates teams by seat: A, B, A, B, A, B', () => {
    const g = createGame('r', 6, sixPlayers, seededRng(99));
    expect(g.players.map((p) => p.team)).toEqual(['A', 'B', 'A', 'B', 'A', 'B']);
  });

  it('deals 9 cards each in a 6-player game with no duplicates', () => {
    const g = createGame('r', 6, sixPlayers, seededRng(99));
    expect(g.players.every((p) => p.hand.length === 9)).toBe(true);
    const all = g.players.flatMap((p) => p.hand.map(cardId));
    expect(new Set(all).size).toBe(54);
  });

  it('first turn goes to seat 0', () => {
    const g = createGame('r', 6, sixPlayers, seededRng(99));
    expect(g.currentTurnPlayerId).toBe('p0');
  });

  it('throws if player count does not match size', () => {
    expect(() => createGame('r', 6, sixPlayers.slice(0, 5))).toThrow();
  });
});
