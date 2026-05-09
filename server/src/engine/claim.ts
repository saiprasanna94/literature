import {
  cardId,
  cardIdsInSet,
  ClaimAction,
  ClaimRecord,
  EngineError,
  GameState,
  GameStatus,
  PendingTurnSelection,
  TeamId,
} from '@literature/shared';
import { findPlayer } from './state.js';

export type ClaimResult = {
  state: GameState;
  record: ClaimRecord;
};

const VICTORY_THRESHOLD = 5;

/**
 * Apply a claim. Validates fully, removes the set's cards from all hands
 * regardless of outcome (the cards are accounted for once a set is closed),
 * awards the set to the appropriate team, and opens a pendingTurnSelection
 * for that team — even on success, since any non-empty teammate may resume.
 */
export function applyClaim(state: GameState, action: ClaimAction, now: number = Date.now()): ClaimResult {
  if (state.status !== 'in_progress') {
    throw new EngineError('GAME_NOT_IN_PROGRESS');
  }
  if (state.pendingTurnSelection) {
    throw new EngineError('PENDING_TURN_SELECTION');
  }

  const claimer = findPlayer(state, action.claimerId);
  if (!claimer) throw new EngineError('CLAIMER_NOT_FOUND');
  if (state.currentTurnPlayerId !== claimer.id) {
    throw new EngineError('NOT_YOUR_TURN');
  }

  // Cannot re-claim a set
  if (state.claimedSets.some((cs) => cs.setId === action.setId)) {
    throw new EngineError('SET_ALREADY_CLAIMED');
  }

  const expectedCardIds = new Set(cardIdsInSet(action.setId));

  // Validate assignment shape:
  // - Every assignee is on the claimer's team (and exists)
  // - Every cardId across all assignments is exactly the 6 set cards (no extras, no dupes)
  const seenCards = new Set<string>();
  for (const [assigneeId, cardIds] of Object.entries(action.assignments)) {
    const assignee = findPlayer(state, assigneeId);
    if (!assignee) throw new EngineError('CLAIM_ASSIGNMENTS_INVALID');
    if (assignee.team !== claimer.team) throw new EngineError('CLAIM_ASSIGNEE_NOT_TEAMMATE');
    for (const cid of cardIds) {
      if (!expectedCardIds.has(cid)) throw new EngineError('CLAIM_ASSIGNMENTS_INVALID');
      if (seenCards.has(cid)) throw new EngineError('CLAIM_ASSIGNMENTS_INVALID');
      seenCards.add(cid);
    }
  }
  if (seenCards.size !== expectedCardIds.size) {
    throw new EngineError('CLAIM_ASSIGNMENTS_INVALID');
  }

  // Determine success: each card in `assignments[playerId]` must actually be in that player's hand.
  let success = true;
  for (const [assigneeId, cardIds] of Object.entries(action.assignments)) {
    const assignee = findPlayer(state, assigneeId)!;
    const handIds = new Set(assignee.hand.map(cardId));
    for (const cid of cardIds) {
      if (!handIds.has(cid)) {
        success = false;
        break;
      }
    }
    if (!success) break;
  }

  const awardedTeam: TeamId = success ? claimer.team : claimer.team === 'A' ? 'B' : 'A';

  // Remove every card belonging to this set from every player's hand.
  // This holds in both success and failure: the set is closed, so its cards
  // exit play. (In failure cases, the opposing team simply also keeps any
  // they had; either way no one needs them in hand anymore.)
  const nextPlayers = state.players.map((p) => ({
    ...p,
    hand: p.hand.filter((c) => !expectedCardIds.has(cardId(c))),
  }));

  const seq = state.seq + 1;
  const record: ClaimRecord = {
    seq,
    claimerId: claimer.id,
    setId: action.setId,
    assignments: action.assignments,
    success,
    awardedTeam,
    at: now,
  };

  const nextClaimedSets = [...state.claimedSets, { setId: action.setId, team: awardedTeam }];

  // Victory check
  const teamACount = nextClaimedSets.filter((cs) => cs.team === 'A').length;
  const teamBCount = nextClaimedSets.filter((cs) => cs.team === 'B').length;
  let winner: TeamId | null = null;
  let status: GameStatus = state.status;
  if (teamACount >= VICTORY_THRESHOLD) {
    winner = 'A';
    status = 'finished';
  } else if (teamBCount >= VICTORY_THRESHOLD) {
    winner = 'B';
    status = 'finished';
  } else if (nextClaimedSets.length === 9) {
    winner = teamACount > teamBCount ? 'A' : 'B';
    status = 'finished';
  }

  // Determine pending turn selection.
  // If the awarded team has at least one non-empty player, they pick.
  // If not, the *other* team picks (otherwise the game would deadlock).
  // If neither team has anyone with cards, the game is effectively over —
  // remaining sets cannot be asked for anyway. We surface no pending selection
  // and clear the current turn pointer; downstream code can decide whether to
  // end the game.
  const teamWithCards = (team: TeamId) =>
    nextPlayers.some((p) => p.team === team && p.hand.length > 0);

  let pendingTurnSelection: PendingTurnSelection | null = state.pendingTurnSelection;
  let nextCurrentTurn: string | null = state.currentTurnPlayerId;

  // If only one player on the eligible team has cards, skip the "anyone takes
  // the turn" prompt — there's no one else who could pick anyway.
  const eligibleOnTeam = (team: TeamId) =>
    nextPlayers.filter((p) => p.team === team && p.hand.length > 0);

  if (status === 'finished') {
    pendingTurnSelection = null;
    nextCurrentTurn = null;
  } else {
    const otherTeam: TeamId = awardedTeam === 'A' ? 'B' : 'A';
    const eligibleTeam: TeamId = teamWithCards(awardedTeam)
      ? awardedTeam
      : teamWithCards(otherTeam)
        ? otherTeam
        : awardedTeam; // no one has cards anywhere; pick a team for shape (won't be used)

    const eligible = eligibleOnTeam(eligibleTeam);
    if (eligible.length === 0) {
      pendingTurnSelection = null;
      nextCurrentTurn = null;
    } else if (eligible.length === 1) {
      pendingTurnSelection = null;
      nextCurrentTurn = eligible[0]!.id;
    } else {
      pendingTurnSelection = { eligibleTeam, reason: 'claim_resolved' };
      nextCurrentTurn = null;
    }
  }

  return {
    state: {
      ...state,
      seq,
      players: nextPlayers,
      claims: [...state.claims, record],
      claimedSets: nextClaimedSets,
      currentTurnPlayerId: nextCurrentTurn,
      pendingTurnSelection,
      winner,
      status,
    },
    record,
  };
}
