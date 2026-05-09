import { PublicGameState } from './state.js';
import { SetId } from './sets.js';

export type SeatSummary = {
  seat: number;
  playerId: string | null;
  name: string | null;
  team: 'A' | 'B';
  /** True iff at least one socket is currently bound to this player. */
  connected: boolean;
  /** Epoch-ms when the player's last socket dropped; undefined while connected. */
  disconnectedAt?: number;
};

export type RoomSummary = {
  roomId: string;
  size: 6 | 8;
  hostPlayerId: string;
  status: 'lobby' | 'in_progress' | 'finished';
  seats: SeatSummary[];
  /** Once a seat has been disconnected for this many ms, it becomes reclaimable by anyone with name+room. */
  reclaimGraceMs: number;
};

export type AskPayload = { targetId: string; cardId: string };
export type ClaimPayload = { setId: SetId; assignments: Record<string, string[]> };

export type ClientToServer = {
  'room:create': (
    args: { size: 6 | 8; name: string },
    cb: (res: { ok: true; roomId: string; playerId: string } | { ok: false; error: string }) => void,
  ) => void;

  'room:join': (
    args: { roomId: string; name: string },
    cb: (res: { ok: true; playerId: string } | { ok: false; error: string }) => void,
  ) => void;

  'room:rejoin': (
    args: { roomId: string; playerId: string },
    cb: (res: { ok: true } | { ok: false; error: string }) => void,
  ) => void;

  'room:reclaim': (
    args: { roomId: string; name: string },
    cb: (res: { ok: true; playerId: string } | { ok: false; error: string }) => void,
  ) => void;

  'room:leave': (cb: (res: { ok: true } | { ok: false; error: string }) => void) => void;

  'game:start': (cb: (res: { ok: true } | { ok: false; error: string }) => void) => void;

  'turn:ask': (args: AskPayload, cb: (res: { ok: true } | { ok: false; error: string }) => void) => void;

  'turn:claim': (
    args: ClaimPayload,
    cb: (res: { ok: true } | { ok: false; error: string }) => void,
  ) => void;

  'turn:take': (cb: (res: { ok: true } | { ok: false; error: string }) => void) => void;
};

export type ServerToClient = {
  'room:update': (room: RoomSummary) => void;
  'room:closed': (args: { reason: string }) => void;
  'game:update': (state: PublicGameState) => void;
};
