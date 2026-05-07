import { SetId } from './sets.js';

export type AskAction = {
  type: 'ask';
  askerId: string;
  targetId: string;
  cardId: string;
};

export type ClaimAction = {
  type: 'claim';
  claimerId: string;
  setId: SetId;
  assignments: Record<string, string[]>;
};

export type TakeTurnAction = {
  type: 'take_turn';
  playerId: string;
};

export type EngineAction = AskAction | ClaimAction | TakeTurnAction;

export type EngineErrorCode =
  | 'NOT_YOUR_TURN'
  | 'GAME_NOT_IN_PROGRESS'
  | 'PENDING_TURN_SELECTION'
  | 'TARGET_SAME_TEAM'
  | 'TARGET_EMPTY_HAND'
  | 'ASKER_LACKS_SET_MEMBERSHIP'
  | 'ASKER_HOLDS_REQUESTED_CARD'
  | 'TARGET_NOT_FOUND'
  | 'ASKER_NOT_FOUND'
  | 'CLAIMER_NOT_FOUND'
  | 'SET_ALREADY_CLAIMED'
  | 'CLAIM_ASSIGNMENTS_INVALID'
  | 'CLAIM_ASSIGNEE_NOT_TEAMMATE'
  | 'NOT_ELIGIBLE_FOR_TURN'
  | 'NO_PENDING_TURN_SELECTION'
  | 'PLAYER_HAS_NO_CARDS';

export class EngineError extends Error {
  code: EngineErrorCode;
  constructor(code: EngineErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}
