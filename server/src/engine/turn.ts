import { EngineError, GameState, TakeTurnAction } from '@literature/shared';
import { findPlayer } from './state.js';

/**
 * Apply a take-turn action when a pendingTurnSelection is open. First click
 * wins. The actor must:
 *   - be on the eligible team
 *   - have at least one card
 */
export function applyTakeTurn(state: GameState, action: TakeTurnAction): GameState {
  if (state.status !== 'in_progress') {
    throw new EngineError('GAME_NOT_IN_PROGRESS');
  }
  const pending = state.pendingTurnSelection;
  if (!pending) throw new EngineError('NO_PENDING_TURN_SELECTION');

  const player = findPlayer(state, action.playerId);
  if (!player) throw new EngineError('ASKER_NOT_FOUND');
  if (player.team !== pending.eligibleTeam) throw new EngineError('NOT_ELIGIBLE_FOR_TURN');
  if (player.hand.length === 0) throw new EngineError('PLAYER_HAS_NO_CARDS');

  return {
    ...state,
    currentTurnPlayerId: player.id,
    pendingTurnSelection: null,
  };
}
