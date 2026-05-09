import { describe, it, expect } from 'vitest';
import { applyClaim } from './claim.js';
import { applyTakeTurn } from './turn.js';
import { blankGame, handIds, setHand, setTurn } from './test-utils.js';

const LOW_HEARTS = ['H-2', 'H-3', 'H-4', 'H-5', 'H-6', 'H-7'];

describe('applyClaim: success', () => {
  it('removes the set cards, awards the set to claimer team, auto-resumes turn when only one teammate has cards', () => {
    let g = blankGame();
    g = setHand(g, 'p0', ['H-2', 'H-3', 'D-K']); // claimer (team A)
    g = setHand(g, 'p2', ['H-4', 'H-5']); // team A teammate, will go empty
    g = setHand(g, 'p4', ['H-6', 'H-7']); // team A teammate, will go empty
    g = setHand(g, 'p1', ['C-2']); // opponent has unrelated card
    g = setTurn(g, 'p0');

    const { state, record } = applyClaim(g, {
      type: 'claim',
      claimerId: 'p0',
      setId: 'low_H',
      assignments: {
        p0: ['H-2', 'H-3'],
        p2: ['H-4', 'H-5'],
        p4: ['H-6', 'H-7'],
      },
    });

    expect(record.success).toBe(true);
    expect(record.awardedTeam).toBe('A');
    expect(state.claimedSets).toEqual([{ setId: 'low_H', team: 'A' }]);
    expect(handIds(state, 'p0')).toEqual(['D-K']);
    expect(handIds(state, 'p2')).toEqual([]);
    expect(handIds(state, 'p4')).toEqual([]);
    // Only p0 still has cards on team A → no need to prompt; auto-resume to p0.
    expect(state.currentTurnPlayerId).toBe('p0');
    expect(state.pendingTurnSelection).toBeNull();
  });

  it('opens pending turn selection when multiple teammates remain eligible', () => {
    let g = blankGame();
    g = setHand(g, 'p0', ['H-2', 'H-3', 'D-K']); // claimer keeps D-K
    g = setHand(g, 'p2', ['H-4', 'H-5', 'D-J']); // teammate keeps D-J
    g = setHand(g, 'p4', ['H-6', 'H-7']); // teammate goes empty
    g = setTurn(g, 'p0');

    const { state } = applyClaim(g, {
      type: 'claim',
      claimerId: 'p0',
      setId: 'low_H',
      assignments: {
        p0: ['H-2', 'H-3'],
        p2: ['H-4', 'H-5'],
        p4: ['H-6', 'H-7'],
      },
    });

    // p0 and p2 both have cards; either may pick up.
    expect(state.currentTurnPlayerId).toBeNull();
    expect(state.pendingTurnSelection).toEqual({
      eligibleTeam: 'A',
      reason: 'claim_resolved',
    });
  });

  it('after a successful claim that empties the claimer, a teammate may take the turn', () => {
    let g = blankGame();
    g = setHand(g, 'p0', ['H-2', 'H-3']); // claimer goes empty after claim
    g = setHand(g, 'p2', ['H-4', 'H-5', 'D-K']);
    g = setHand(g, 'p4', ['H-6', 'H-7', 'D-Q']);
    g = setTurn(g, 'p0');

    const { state } = applyClaim(g, {
      type: 'claim',
      claimerId: 'p0',
      setId: 'low_H',
      assignments: {
        p0: ['H-2', 'H-3'],
        p2: ['H-4', 'H-5'],
        p4: ['H-6', 'H-7'],
      },
    });

    expect(handIds(state, 'p0')).toEqual([]);

    // Empty claimer cannot resume
    expect(() => applyTakeTurn(state, { type: 'take_turn', playerId: 'p0' })).toThrow(
      /PLAYER_HAS_NO_CARDS/,
    );

    // Opponent cannot resume
    expect(() => applyTakeTurn(state, { type: 'take_turn', playerId: 'p1' })).toThrow(
      /NOT_ELIGIBLE_FOR_TURN/,
    );

    // Teammate p2 can
    const resumed = applyTakeTurn(state, { type: 'take_turn', playerId: 'p2' });
    expect(resumed.currentTurnPlayerId).toBe('p2');
  });
});

describe('applyClaim: failure', () => {
  it('awards the set to the opposing team; auto-resumes when only one opponent has cards', () => {
    let g = blankGame();
    // p0 incorrectly thinks p2 holds H-7 (actually opponent p1 holds it).
    g = setHand(g, 'p0', ['H-2', 'H-3', 'D-K']);
    g = setHand(g, 'p2', ['H-4', 'H-5']);
    g = setHand(g, 'p4', ['H-6']);
    g = setHand(g, 'p1', ['H-7', 'C-2']);
    g = setTurn(g, 'p0');

    const { state, record } = applyClaim(g, {
      type: 'claim',
      claimerId: 'p0',
      setId: 'low_H',
      assignments: {
        p0: ['H-2', 'H-3'],
        p2: ['H-4', 'H-5'],
        p4: ['H-6', 'H-7'], // wrong: p4 doesn't have H-7
      },
    });

    expect(record.success).toBe(false);
    expect(record.awardedTeam).toBe('B');
    expect(state.claimedSets).toEqual([{ setId: 'low_H', team: 'B' }]);
    // All Low-Hearts cards leave hands regardless of where they were.
    expect(handIds(state, 'p1').sort()).toEqual(['C-2']);
    // Only p1 has cards on team B (p3, p5 are empty) → auto-resume to p1.
    expect(state.currentTurnPlayerId).toBe('p1');
    expect(state.pendingTurnSelection).toBeNull();
  });

  it('opens pending turn for opposing team when multiple opponents have cards', () => {
    let g = blankGame();
    g = setHand(g, 'p0', ['H-2', 'H-3', 'D-K']);
    g = setHand(g, 'p2', ['H-4', 'H-5']);
    g = setHand(g, 'p4', ['H-6']);
    g = setHand(g, 'p1', ['H-7', 'C-2']);
    g = setHand(g, 'p3', ['C-K']); // second opposing player with cards
    g = setTurn(g, 'p0');

    const { state } = applyClaim(g, {
      type: 'claim',
      claimerId: 'p0',
      setId: 'low_H',
      assignments: {
        p0: ['H-2', 'H-3'],
        p2: ['H-4', 'H-5'],
        p4: ['H-6', 'H-7'],
      },
    });

    expect(state.pendingTurnSelection).toEqual({
      eligibleTeam: 'B',
      reason: 'claim_resolved',
    });
  });
});

describe('applyClaim: validation', () => {
  it('rejects when set already claimed', () => {
    let g = blankGame();
    g = { ...g, claimedSets: [{ setId: 'low_H', team: 'A' }] };
    g = setHand(g, 'p0', ['H-2']);
    g = setTurn(g, 'p0');
    expect(() =>
      applyClaim(g, {
        type: 'claim',
        claimerId: 'p0',
        setId: 'low_H',
        assignments: { p0: LOW_HEARTS },
      }),
    ).toThrow(/SET_ALREADY_CLAIMED/);
  });

  it('rejects when assigning to a non-teammate', () => {
    let g = blankGame();
    g = setHand(g, 'p0', ['H-2']);
    g = setTurn(g, 'p0');
    expect(() =>
      applyClaim(g, {
        type: 'claim',
        claimerId: 'p0',
        setId: 'low_H',
        assignments: {
          p0: ['H-2', 'H-3', 'H-4', 'H-5', 'H-6'],
          p1: ['H-7'], // opponent
        },
      }),
    ).toThrow(/CLAIM_ASSIGNEE_NOT_TEAMMATE/);
  });

  it('rejects when assignments are missing or extra cards', () => {
    let g = blankGame();
    g = setHand(g, 'p0', ['H-2']);
    g = setTurn(g, 'p0');

    // Missing one card
    expect(() =>
      applyClaim(g, {
        type: 'claim',
        claimerId: 'p0',
        setId: 'low_H',
        assignments: { p0: ['H-2', 'H-3', 'H-4', 'H-5', 'H-6'] }, // 5 cards
      }),
    ).toThrow(/CLAIM_ASSIGNMENTS_INVALID/);

    // Extra/foreign card
    expect(() =>
      applyClaim(g, {
        type: 'claim',
        claimerId: 'p0',
        setId: 'low_H',
        assignments: { p0: [...LOW_HEARTS, 'D-K'] }, // 7 cards including a non-set card
      }),
    ).toThrow(/CLAIM_ASSIGNMENTS_INVALID/);

    // Duplicate
    expect(() =>
      applyClaim(g, {
        type: 'claim',
        claimerId: 'p0',
        setId: 'low_H',
        assignments: {
          p0: ['H-2', 'H-2', 'H-4', 'H-5', 'H-6', 'H-7'],
        },
      }),
    ).toThrow(/CLAIM_ASSIGNMENTS_INVALID/);
  });

  it("rejects when it isn't claimer's turn", () => {
    let g = blankGame();
    g = setHand(g, 'p0', ['H-2']);
    g = setTurn(g, 'p2');
    expect(() =>
      applyClaim(g, {
        type: 'claim',
        claimerId: 'p0',
        setId: 'low_H',
        assignments: { p0: LOW_HEARTS },
      }),
    ).toThrow(/NOT_YOUR_TURN/);
  });
});

describe('applyClaim: victory', () => {
  it('marks the game finished when team A reaches 5 sets', () => {
    let g = blankGame();
    g = {
      ...g,
      claimedSets: [
        { setId: 'low_H', team: 'A' },
        { setId: 'high_H', team: 'A' },
        { setId: 'low_D', team: 'A' },
        { setId: 'high_D', team: 'A' },
      ],
    };
    g = setHand(g, 'p0', ['S-2', 'S-3', 'D-K']);
    g = setHand(g, 'p2', ['S-4', 'S-5']);
    g = setHand(g, 'p4', ['S-6', 'S-7']);
    g = setTurn(g, 'p0');

    const { state } = applyClaim(g, {
      type: 'claim',
      claimerId: 'p0',
      setId: 'low_S',
      assignments: {
        p0: ['S-2', 'S-3'],
        p2: ['S-4', 'S-5'],
        p4: ['S-6', 'S-7'],
      },
    });

    expect(state.status).toBe('finished');
    expect(state.winner).toBe('A');
    expect(state.currentTurnPlayerId).toBeNull();
    expect(state.pendingTurnSelection).toBeNull();
  });

  it('falls back to the other team for the pending turn if the awarded team has no cards', () => {
    let g = blankGame();
    // Team A wins low_H but has no remaining cards on any teammate.
    g = setHand(g, 'p0', ['H-2', 'H-3']);
    g = setHand(g, 'p2', ['H-4', 'H-5']);
    g = setHand(g, 'p4', ['H-6', 'H-7']);
    g = setHand(g, 'p1', ['D-K']);
    g = setHand(g, 'p3', ['C-K']);
    g = setHand(g, 'p5', ['S-K']);
    g = setTurn(g, 'p0');

    const { state } = applyClaim(g, {
      type: 'claim',
      claimerId: 'p0',
      setId: 'low_H',
      assignments: {
        p0: ['H-2', 'H-3'],
        p2: ['H-4', 'H-5'],
        p4: ['H-6', 'H-7'],
      },
    });

    expect(state.pendingTurnSelection?.eligibleTeam).toBe('B');
  });
});
