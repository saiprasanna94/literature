import {
  ClientToServer,
  EngineError,
  GameState,
  PublicGameState,
  ServerToClient,
  toPublicState,
} from '@literature/shared';
import { Server, Socket } from 'socket.io';
import { saveFinishedGame } from '../db/persistence.js';
import { applyAsk } from '../engine/ask.js';
import { applyClaim } from '../engine/claim.js';
import { applyTakeTurn } from '../engine/turn.js';
import { RECLAIM_GRACE_MS, Room, RoomManager } from '../rooms/manager.js';

type IO = Server<ClientToServer, ServerToClient>;
type ClientSocket = Socket<ClientToServer, ServerToClient>;

const INVALID_NAME = 'INVALID_NAME';

function sanitizeName(name: unknown): string {
  if (typeof name !== 'string') throw new Error(INVALID_NAME);
  const trimmed = name.trim().slice(0, 24);
  if (trimmed.length < 1) throw new Error(INVALID_NAME);
  return trimmed;
}

export function registerHandlers(io: IO, rooms: RoomManager) {
  /** Broadcast a per-recipient filtered game state to every player in the room */
  function broadcastGame(room: Room): void {
    if (!room.game) return;
    const game = room.game;
    for (const seat of room.seats) {
      if (!seat.playerId) continue;
      const sockets = playerSockets.get(seat.playerId);
      if (!sockets) continue;
      const filtered: PublicGameState = toPublicState(game, seat.playerId);
      for (const sid of sockets) {
        io.to(sid).emit('game:update', filtered);
      }
    }
  }

  function broadcastRoom(room: Room): void {
    io.to(`room:${room.roomId}`).emit('room:update', rooms.toSummary(room));
  }

  /** playerId -> set of socket IDs (a player can have multiple tabs/sockets) */
  const playerSockets = new Map<string, Set<string>>();
  /** socketId -> { playerId, roomId } so we can clean up on disconnect */
  const socketIndex = new Map<string, { playerId: string; roomId: string }>();
  /** playerId -> timer that fires once the grace window expires */
  const graceTimers = new Map<string, NodeJS.Timeout>();

  function attachPlayerSocket(socket: ClientSocket, playerId: string, roomId: string): void {
    let set = playerSockets.get(playerId);
    if (!set) {
      set = new Set();
      playerSockets.set(playerId, set);
    }
    set.add(socket.id);
    socketIndex.set(socket.id, { playerId, roomId });
    socket.join(`room:${roomId}`);

    // Cancel any pending grace timer; mark seat connected and broadcast.
    const t = graceTimers.get(playerId);
    if (t) {
      clearTimeout(t);
      graceTimers.delete(playerId);
    }
    const room = rooms.markConnected(playerId);
    if (room) broadcastRoom(room);
  }

  function detachPlayerSocket(socketId: string): void {
    const idx = socketIndex.get(socketId);
    if (!idx) return;
    socketIndex.delete(socketId);

    const set = playerSockets.get(idx.playerId);
    if (set) {
      set.delete(socketId);
      if (set.size === 0) {
        playerSockets.delete(idx.playerId);
        // No more sockets for this player — start the disconnect grace timer.
        const room = rooms.markDisconnected(idx.playerId);
        if (room) broadcastRoom(room);
        const timer = setTimeout(() => {
          graceTimers.delete(idx.playerId);
          const r = rooms.getRoom(idx.roomId);
          if (r) broadcastRoom(r); // re-broadcast so clients see "reclaimable"
        }, RECLAIM_GRACE_MS + 100);
        graceTimers.set(idx.playerId, timer);
      }
    }
  }

  io.on('connection', (socket: ClientSocket) => {
    socket.on('room:create', (args, cb) => {
      try {
        const name = sanitizeName(args?.name);
        const size = args?.size === 8 ? 8 : 6;
        const { roomId, playerId } = rooms.createRoom(name, size);
        attachPlayerSocket(socket, playerId, roomId);
        cb({ ok: true, roomId, playerId });
      } catch (e: any) {
        cb({ ok: false, error: e?.message ?? 'CREATE_FAILED' });
      }
    });

    socket.on('room:join', (args, cb) => {
      try {
        const name = sanitizeName(args?.name);
        const roomId = String(args?.roomId ?? '').toUpperCase();
        const { playerId } = rooms.joinRoom(roomId, name);
        attachPlayerSocket(socket, playerId, roomId);
        cb({ ok: true, playerId });
      } catch (e: any) {
        cb({ ok: false, error: e?.message ?? 'JOIN_FAILED' });
      }
    });

    socket.on('room:rejoin', (args, cb) => {
      try {
        const roomId = String(args?.roomId ?? '').toUpperCase();
        const playerId = String(args?.playerId ?? '');
        const room = rooms.rejoinRoom(roomId, playerId);
        attachPlayerSocket(socket, playerId, roomId);
        cb({ ok: true });
        socket.emit('room:update', rooms.toSummary(room));
        if (room.game) {
          socket.emit('game:update', toPublicState(room.game, playerId));
        }
      } catch (e: any) {
        cb({ ok: false, error: e?.message ?? 'REJOIN_FAILED' });
      }
    });

    socket.on('room:reclaim', (args, cb) => {
      try {
        const name = sanitizeName(args?.name);
        const roomId = String(args?.roomId ?? '').toUpperCase();
        const { room, playerId } = rooms.reclaimSeat(roomId, name);
        attachPlayerSocket(socket, playerId, roomId);
        cb({ ok: true, playerId });
        socket.emit('room:update', rooms.toSummary(room));
        if (room.game) {
          socket.emit('game:update', toPublicState(room.game, playerId));
        }
      } catch (e: any) {
        cb({ ok: false, error: e?.message ?? 'RECLAIM_FAILED' });
      }
    });

    socket.on('room:leave', (cb) => {
      try {
        const idx = socketIndex.get(socket.id);
        if (!idx) {
          cb({ ok: true });
          return;
        }
        const { room, closed } = rooms.leaveRoom(idx.playerId);
        socket.leave(`room:${idx.roomId}`);
        socketIndex.delete(socket.id);
        const set = playerSockets.get(idx.playerId);
        if (set) {
          set.delete(socket.id);
          if (set.size === 0) playerSockets.delete(idx.playerId);
        }
        cb({ ok: true });
        if (room && !closed) broadcastRoom(room);
      } catch (e: any) {
        cb({ ok: false, error: e?.message ?? 'LEAVE_FAILED' });
      }
    });

    socket.on('game:start', (cb) => {
      try {
        const idx = socketIndex.get(socket.id);
        if (!idx) throw new Error('NOT_IN_ROOM');
        const room = rooms.startGame(idx.roomId, idx.playerId);
        cb({ ok: true });
        broadcastRoom(room);
        broadcastGame(room);
      } catch (e: any) {
        cb({ ok: false, error: e?.message ?? 'START_FAILED' });
      }
    });

    socket.on('turn:ask', (args, cb) => {
      const result = withGame(socket, (room, game, playerId) => {
        const next = applyAsk(game, {
          type: 'ask',
          askerId: playerId,
          targetId: args.targetId,
          cardId: args.cardId,
        });
        rooms.setGame(room.roomId, next.state);
        broadcastGame(room);
      });
      cb(result);
    });

    socket.on('turn:claim', (args, cb) => {
      const result = withGame(socket, (room, game, playerId) => {
        const next = applyClaim(game, {
          type: 'claim',
          claimerId: playerId,
          setId: args.setId,
          assignments: args.assignments,
        });
        rooms.setGame(room.roomId, next.state);
        broadcastGame(room);
        if (next.state.status === 'finished') {
          broadcastRoom(room);
          try {
            const id = saveFinishedGame(room);
            if (id) console.log(`[history] saved game ${id} from room ${room.roomId}`);
          } catch (e) {
            console.error('[history] save failed:', e);
          }
        }
      });
      cb(result);
    });

    socket.on('turn:take', (cb) => {
      const result = withGame(socket, (room, game, playerId) => {
        const nextState: GameState = applyTakeTurn(game, { type: 'take_turn', playerId });
        rooms.setGame(room.roomId, nextState);
        broadcastGame(room);
      });
      cb(result);
    });

    socket.on('disconnect', () => {
      detachPlayerSocket(socket.id);
    });
  });

  function withGame(
    socket: ClientSocket,
    fn: (room: Room, game: GameState, playerId: string) => void,
  ): { ok: true } | { ok: false; error: string } {
    try {
      const idx = socketIndex.get(socket.id);
      if (!idx) throw new Error('NOT_IN_ROOM');
      const room = rooms.getRoom(idx.roomId);
      if (!room) throw new Error('ROOM_NOT_FOUND');
      if (!room.game) throw new Error('GAME_NOT_STARTED');
      fn(room, room.game, idx.playerId);
      return { ok: true };
    } catch (e: any) {
      const code = e instanceof EngineError ? e.code : e?.message ?? 'UNKNOWN';
      return { ok: false, error: code };
    }
  }
}
