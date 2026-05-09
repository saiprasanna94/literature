import { AskRecord, ClaimRecord } from './state.js';

export type HistoryPlayer = {
  playerId: string;
  name: string;
  team: 'A' | 'B';
  seat: number;
};

export type HistoryGameSummary = {
  id: string;
  roomId: string;
  size: 6 | 8;
  startedAt: number;
  endedAt: number;
  winner: 'A' | 'B';
  teamASets: number;
  teamBSets: number;
  players: HistoryPlayer[];
};

export type HistoryEvent =
  | { type: 'ask'; rec: AskRecord }
  | { type: 'claim'; rec: ClaimRecord };

export type HistoryGameDetail = HistoryGameSummary & {
  events: HistoryEvent[];
};
