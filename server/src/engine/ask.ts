import {
  AskAction,
  AskRecord,
  Card,
  cardId,
  EngineError,
  GameState,
  parseCardId,
  setOfCard,
} from '@literature/shared';
import { findPlayer } from './state.js';

export type AskResult = {
  state: GameState;
  record: AskRecord;
};

/**
 * Apply an ask action. Validates fully, transfers the card if the target
 * holds it, and updates the turn pointer per rule:
 *   - success → asker keeps the turn
 *   - failure → target gets the turn
 */
export function applyAsk(state: GameState, action: AskAction, now: number = Date.now()): AskResult {
  if (state.status !== 'in_progress') {
    throw new EngineError('GAME_NOT_IN_PROGRESS');
  }
  if (state.pendingTurnSelection) {
    throw new EngineError('PENDING_TURN_SELECTION');
  }

  const asker = findPlayer(state, action.askerId);
  if (!asker) throw new EngineError('ASKER_NOT_FOUND');

  if (state.currentTurnPlayerId !== asker.id) {
    throw new EngineError('NOT_YOUR_TURN');
  }

  const target = findPlayer(state, action.targetId);
  if (!target) throw new EngineError('TARGET_NOT_FOUND');

  if (target.team === asker.team) throw new EngineError('TARGET_SAME_TEAM');
  if (target.hand.length === 0) throw new EngineError('TARGET_EMPTY_HAND');

  const askedCard: Card = parseCardId(action.cardId);
  const askedSet = setOfCard(askedCard);

  // Possession: asker must hold ≥1 card from this set
  const askerHoldsSomeFromSet = asker.hand.some((c) => setOfCard(c) === askedSet);
  if (!askerHoldsSomeFromSet) throw new EngineError('ASKER_LACKS_SET_MEMBERSHIP');

  // Asker must not already hold the requested card
  const askedCardId = cardId(askedCard);
  if (asker.hand.some((c) => cardId(c) === askedCardId)) {
    throw new EngineError('ASKER_HOLDS_REQUESTED_CARD');
  }

  // Resolution
  const targetCardIdx = target.hand.findIndex((c) => cardId(c) === askedCardId);
  const success = targetCardIdx >= 0;

  // Build next state immutably
  const nextPlayers = state.players.map((p) => {
    if (p.id === asker.id && success) {
      return { ...p, hand: [...p.hand, askedCard] };
    }
    if (p.id === target.id && success) {
      return { ...p, hand: p.hand.filter((_, i) => i !== targetCardIdx) };
    }
    return p;
  });

  const seq = state.seq + 1;
  const record: AskRecord = {
    seq,
    askerId: asker.id,
    targetId: target.id,
    cardId: askedCardId,
    success,
    at: now,
  };

  const nextTurn = success ? asker.id : target.id;

  return {
    state: {
      ...state,
      seq,
      players: nextPlayers,
      asks: [...state.asks, record],
      currentTurnPlayerId: nextTurn,
    },
    record,
  };
}
