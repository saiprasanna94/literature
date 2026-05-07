import { describe, it, expect } from 'vitest';
import { EngineError } from '@literature/shared';
import { applyAsk } from './ask.js';
import { blankGame, handIds, setHand, setTurn } from './test-utils.js';

describe('applyAsk: success path', () => {
  it('transfers card to asker and asker keeps the turn', () => {
    let g = blankGame();
    g = setHand(g, 'p0', ['H-2', 'H-3']); // asker has Low Hearts cards
    g = setHand(g, 'p1', ['H-4', 'D-K']); // target has the asked card
    g = setTurn(g, 'p0');

    const { state, record } = applyAsk(g, {
      type: 'ask',
      askerId: 'p0',
      targetId: 'p1',
      cardId: 'H-4',
    });

    expect(record.success).toBe(true);
    expect(state.currentTurnPlayerId).toBe('p0');
    expect(handIds(state, 'p0').sort()).toEqual(['H-2', 'H-3', 'H-4']);
    expect(handIds(state, 'p1')).toEqual(['D-K']);
    expect(state.asks).toHaveLength(1);
  });
});

describe('applyAsk: failure path (turn passes to target)', () => {
  it('asker keeps no card, target gets the turn', () => {
    let g = blankGame();
    g = setHand(g, 'p0', ['H-2']);
    g = setHand(g, 'p1', ['D-K']);
    g = setTurn(g, 'p0');

    const { state, record } = applyAsk(g, {
      type: 'ask',
      askerId: 'p0',
      targetId: 'p1',
      cardId: 'H-4',
    });

    expect(record.success).toBe(false);
    expect(state.currentTurnPlayerId).toBe('p1');
    expect(handIds(state, 'p0')).toEqual(['H-2']);
    expect(handIds(state, 'p1')).toEqual(['D-K']);
  });
});

describe('applyAsk: validation errors', () => {
  it('rejects when game is not in progress', () => {
    const g = { ...blankGame(), status: 'lobby' as const };
    expect(() =>
      applyAsk(g, { type: 'ask', askerId: 'p0', targetId: 'p1', cardId: 'H-4' }),
    ).toThrowError(EngineError);
  });

  it('rejects when there is a pending turn selection', () => {
    let g = blankGame();
    g = setHand(g, 'p0', ['H-2']);
    g = setHand(g, 'p1', ['H-4']);
    g = {
      ...g,
      currentTurnPlayerId: null,
      pendingTurnSelection: { eligibleTeam: 'A', reason: 'claim_resolved' },
    };
    expect(() =>
      applyAsk(g, { type: 'ask', askerId: 'p0', targetId: 'p1', cardId: 'H-4' }),
    ).toThrow(/PENDING_TURN_SELECTION/);
  });

  it("rejects when it isn't asker's turn", () => {
    let g = blankGame();
    g = setHand(g, 'p0', ['H-2']);
    g = setHand(g, 'p1', ['H-4']);
    g = setTurn(g, 'p2');
    expect(() =>
      applyAsk(g, { type: 'ask', askerId: 'p0', targetId: 'p1', cardId: 'H-4' }),
    ).toThrow(/NOT_YOUR_TURN/);
  });

  it('rejects when target is on the same team', () => {
    let g = blankGame();
    g = setHand(g, 'p0', ['H-2']);
    g = setHand(g, 'p2', ['H-4']); // p2 is also team A
    g = setTurn(g, 'p0');
    expect(() =>
      applyAsk(g, { type: 'ask', askerId: 'p0', targetId: 'p2', cardId: 'H-4' }),
    ).toThrow(/TARGET_SAME_TEAM/);
  });

  it('rejects when target has empty hand', () => {
    let g = blankGame();
    g = setHand(g, 'p0', ['H-2']);
    g = setHand(g, 'p1', []);
    g = setTurn(g, 'p0');
    expect(() =>
      applyAsk(g, { type: 'ask', askerId: 'p0', targetId: 'p1', cardId: 'H-4' }),
    ).toThrow(/TARGET_EMPTY_HAND/);
  });

  it('rejects when asker holds nothing from the asked set', () => {
    let g = blankGame();
    g = setHand(g, 'p0', ['D-K']); // asker has High Diamonds, not Low Hearts
    g = setHand(g, 'p1', ['H-4']);
    g = setTurn(g, 'p0');
    expect(() =>
      applyAsk(g, { type: 'ask', askerId: 'p0', targetId: 'p1', cardId: 'H-4' }),
    ).toThrow(/ASKER_LACKS_SET_MEMBERSHIP/);
  });

  it('rejects when asker already holds the requested card', () => {
    let g = blankGame();
    g = setHand(g, 'p0', ['H-2', 'H-4']);
    g = setHand(g, 'p1', ['D-K']);
    g = setTurn(g, 'p0');
    expect(() =>
      applyAsk(g, { type: 'ask', askerId: 'p0', targetId: 'p1', cardId: 'H-4' }),
    ).toThrow(/ASKER_HOLDS_REQUESTED_CARD/);
  });

  it('rejects when asker is unknown', () => {
    let g = blankGame();
    g = setHand(g, 'p1', ['H-4']);
    g = setTurn(g, 'p0');
    expect(() =>
      applyAsk(g, { type: 'ask', askerId: 'pX', targetId: 'p1', cardId: 'H-4' }),
    ).toThrow(/ASKER_NOT_FOUND/);
  });

  it('rejects when target is unknown', () => {
    let g = blankGame();
    g = setHand(g, 'p0', ['H-2']);
    g = setTurn(g, 'p0');
    expect(() =>
      applyAsk(g, { type: 'ask', askerId: 'p0', targetId: 'pX', cardId: 'H-4' }),
    ).toThrow(/TARGET_NOT_FOUND/);
  });

  it('eights set membership: holding any 8 lets you ask for jokers and vice versa', () => {
    let g = blankGame();
    g = setHand(g, 'p0', ['H-8']); // any card from the eights set
    g = setHand(g, 'p1', ['JK-big']);
    g = setTurn(g, 'p0');
    const { record } = applyAsk(g, {
      type: 'ask',
      askerId: 'p0',
      targetId: 'p1',
      cardId: 'JK-big',
    });
    expect(record.success).toBe(true);
  });
});
