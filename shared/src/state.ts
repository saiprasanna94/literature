import { Card } from './cards.js';
import { SetId } from './sets.js';

export type TeamId = 'A' | 'B';

export type Player = {
  id: string;
  name: string;
  team: TeamId;
  seat: number;
  hand: Card[];
};

export type AskRecord = {
  seq: number;
  askerId: string;
  targetId: string;
  cardId: string;
  success: boolean;
  at: number;
};

export type ClaimRecord = {
  seq: number;
  claimerId: string;
  setId: SetId;
  assignments: Record<string, string[]>;
  success: boolean;
  awardedTeam: TeamId;
  at: number;
};

export type GameStatus = 'lobby' | 'in_progress' | 'finished';

export type PendingTurnSelection = {
  eligibleTeam: TeamId;
  reason: 'claim_resolved';
};

export type GameState = {
  roomId: string;
  size: 6 | 8;
  status: GameStatus;
  players: Player[];
  currentTurnPlayerId: string | null;
  pendingTurnSelection: PendingTurnSelection | null;
  asks: AskRecord[];
  claims: ClaimRecord[];
  claimedSets: { setId: SetId; team: TeamId }[];
  winner: TeamId | null;
  seq: number;
};

export type PublicPlayer = Omit<Player, 'hand'> & { handCount: number };
export type PublicGameState = Omit<GameState, 'players'> & {
  players: PublicPlayer[];
  yourHand: Card[] | null;
  yourPlayerId: string | null;
};

export function toPublicState(state: GameState, viewerId: string | null): PublicGameState {
  const viewer = viewerId ? state.players.find((p) => p.id === viewerId) : null;
  return {
    ...state,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      team: p.team,
      seat: p.seat,
      handCount: p.hand.length,
    })),
    yourHand: viewer ? [...viewer.hand] : null,
    yourPlayerId: viewer ? viewer.id : null,
  };
}
