import { describe, it, expect } from 'vitest';
import { applyTakeTurn } from './turn.js';
import { blankGame, setHand } from './test-utils.js';

describe('applyTakeTurn', () => {
  it('rejects if no pending turn selection', () => {
    let g = blankGame();
    g = setHand(g, 'p0', ['H-2']);
    expect(() =>
      applyTakeTurn(g, { type: 'take_turn', playerId: 'p0' }),
    ).toThrow(/NO_PENDING_TURN_SELECTION/);
  });

  it('rejects if player not on the eligible team', () => {
    let g = blankGame();
    g = setHand(g, 'p1', ['H-2']);
    g = {
      ...g,
      currentTurnPlayerId: null,
      pendingTurnSelection: { eligibleTeam: 'A', reason: 'claim_resolved' },
    };
    expect(() =>
      applyTakeTurn(g, { type: 'take_turn', playerId: 'p1' }),
    ).toThrow(/NOT_ELIGIBLE_FOR_TURN/);
  });

  it('rejects empty-handed players', () => {
    let g = blankGame();
    g = setHand(g, 'p0', []);
    g = {
      ...g,
      currentTurnPlayerId: null,
      pendingTurnSelection: { eligibleTeam: 'A', reason: 'claim_resolved' },
    };
    expect(() =>
      applyTakeTurn(g, { type: 'take_turn', playerId: 'p0' }),
    ).toThrow(/PLAYER_HAS_NO_CARDS/);
  });

  it('first valid call wins; subsequent calls fail because pending is cleared', () => {
    let g = blankGame();
    g = setHand(g, 'p0', ['H-2']);
    g = setHand(g, 'p2', ['H-3']);
    g = {
      ...g,
      currentTurnPlayerId: null,
      pendingTurnSelection: { eligibleTeam: 'A', reason: 'claim_resolved' },
    };

    const next = applyTakeTurn(g, { type: 'take_turn', playerId: 'p0' });
    expect(next.currentTurnPlayerId).toBe('p0');
    expect(next.pendingTurnSelection).toBeNull();

    expect(() =>
      applyTakeTurn(next, { type: 'take_turn', playerId: 'p2' }),
    ).toThrow(/NO_PENDING_TURN_SELECTION/);
  });
});
