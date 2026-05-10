import { GameState, RoomSummary, SeatSummary, TeamId } from '@literature/shared';
import { customAlphabet, nanoid } from 'nanoid';
import { createGame } from '../engine/state.js';

const codeAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newRoomCode = customAlphabet(codeAlphabet, 5);

/**
 * Once a player's last socket has been gone for this long, anyone with that
 * player's name + the room code can reclaim the seat from a different device.
 * Below this threshold, only a session holding the original playerId can
 * rejoin (i.e. the same person reconnecting from a saved tab session).
 */
export const RECLAIM_GRACE_MS = 30_000;

export type Seat = {
  seat: number;
  team: TeamId;
  playerId: string | null;
  name: string | null;
  connected: boolean;
  disconnectedAt?: number;
};

export type Room = {
  roomId: string;
  size: 6 | 8;
  hostPlayerId: string;
  status: 'lobby' | 'in_progress' | 'finished';
  seats: Seat[];
  game: GameState | null;
};

const seatsForSize = (size: 6 | 8): Seat[] =>
  Array.from({ length: size }, (_, i) => ({
    seat: i,
    team: (i % 2 === 0 ? 'A' : 'B') as TeamId,
    playerId: null,
    name: null,
    connected: false,
  }));

export class RoomManager {
  private rooms = new Map<string, Room>();
  /** playerId -> roomId */
  private playerRooms = new Map<string, string>();

  createRoom(hostName: string, size: 6 | 8): { roomId: string; playerId: string } {
    let roomId = newRoomCode();
    while (this.rooms.has(roomId)) roomId = newRoomCode();

    const playerId = nanoid(12);
    const seats = seatsForSize(size);
    seats[0]!.playerId = playerId;
    seats[0]!.name = hostName;
    seats[0]!.connected = true;

    this.rooms.set(roomId, {
      roomId,
      size,
      hostPlayerId: playerId,
      status: 'lobby',
      seats,
      game: null,
    });
    this.playerRooms.set(playerId, roomId);
    return { roomId, playerId };
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId.toUpperCase());
  }

  joinRoom(roomId: string, name: string): { playerId: string } {
    const room = this.getRoom(roomId);
    if (!room) throw new Error('ROOM_NOT_FOUND');
    if (room.status !== 'lobby') throw new Error('GAME_ALREADY_STARTED');

    const openSeat = room.seats.find((s) => s.playerId === null);
    if (!openSeat) throw new Error('ROOM_FULL');

    if (room.seats.some((s) => s.name && s.name.toLowerCase() === name.toLowerCase())) {
      throw new Error('NAME_TAKEN');
    }

    const playerId = nanoid(12);
    openSeat.playerId = playerId;
    openSeat.name = name;
    openSeat.connected = true;
    this.playerRooms.set(playerId, room.roomId);
    return { playerId };
  }

  /** Reattach an existing playerId (e.g. tab refresh, socket reconnect) */
  rejoinRoom(roomId: string, playerId: string): Room {
    const room = this.getRoom(roomId);
    if (!room) throw new Error('ROOM_NOT_FOUND');
    if (!room.seats.some((s) => s.playerId === playerId)) {
      throw new Error('PLAYER_NOT_IN_ROOM');
    }
    return room;
  }

  /**
   * Reclaim a seat by name (case-insensitive) — used when the original
   * playerId is lost (different device, cleared storage, etc.). Only allowed
   * when the seat has been disconnected past the grace window.
   *
   * Returns the playerId that the caller should now treat as their own.
   */
  reclaimSeat(roomId: string, name: string): { room: Room; playerId: string } {
    const room = this.getRoom(roomId);
    if (!room) throw new Error('ROOM_NOT_FOUND');
    const seat = room.seats.find(
      (s) => s.name && s.name.toLowerCase() === name.toLowerCase(),
    );
    if (!seat || !seat.playerId) throw new Error('SEAT_NOT_FOUND');
    if (seat.connected) throw new Error('SEAT_OCCUPIED');
    if (!seat.disconnectedAt || Date.now() - seat.disconnectedAt < RECLAIM_GRACE_MS) {
      throw new Error('RECLAIM_GRACE_NOT_ELAPSED');
    }
    return { room, playerId: seat.playerId };
  }

  markConnected(playerId: string): Room | undefined {
    const room = this.roomOf(playerId);
    if (!room) return;
    const seat = room.seats.find((s) => s.playerId === playerId);
    if (!seat) return;
    seat.connected = true;
    seat.disconnectedAt = undefined;
    return room;
  }

  markDisconnected(playerId: string): Room | undefined {
    const room = this.roomOf(playerId);
    if (!room) return;
    const seat = room.seats.find((s) => s.playerId === playerId);
    if (!seat) return;
    seat.connected = false;
    seat.disconnectedAt = Date.now();
    return room;
  }

  leaveRoom(playerId: string): { room: Room | null; closed: boolean } {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return { room: null, closed: false };
    const room = this.rooms.get(roomId);
    this.playerRooms.delete(playerId);
    if (!room) return { room: null, closed: false };

    // Mid-game we don't actually remove the player — they may come back.
    // Only clear seats while still in lobby.
    if (room.status === 'lobby') {
      const seat = room.seats.find((s) => s.playerId === playerId);
      if (seat) {
        seat.playerId = null;
        seat.name = null;
        seat.connected = false;
        seat.disconnectedAt = undefined;
      }
      // If host left, transfer to first remaining player; else close room.
      if (room.hostPlayerId === playerId) {
        const next = room.seats.find((s) => s.playerId !== null);
        if (next) {
          room.hostPlayerId = next.playerId!;
        } else {
          this.rooms.delete(room.roomId);
          return { room: null, closed: true };
        }
      }
    } else {
      // In-game: treat like a disconnect so the seat becomes reclaimable
      // after the grace period.
      const seat = room.seats.find((s) => s.playerId === playerId);
      if (seat) {
        seat.connected = false;
        seat.disconnectedAt = Date.now();
      }
    }
    return { room, closed: false };
  }

  startGame(roomId: string, hostId: string): Room {
    const room = this.getRoom(roomId);
    if (!room) throw new Error('ROOM_NOT_FOUND');
    if (room.hostPlayerId !== hostId) throw new Error('NOT_HOST');
    if (room.status !== 'lobby') throw new Error('GAME_ALREADY_STARTED');
    if (room.seats.some((s) => s.playerId === null)) throw new Error('ROOM_NOT_FULL');

    const playerInits = room.seats.map((s) => ({ id: s.playerId!, name: s.name! }));
    room.game = createGame(room.roomId, room.size, playerInits);
    room.status = 'in_progress';
    return room;
  }

  /**
   * Re-deal the same room. Same seats, same playerIds, fresh random hands.
   * Only allowed once a game has finished, and only by the host.
   */
  rematchGame(roomId: string, hostId: string): Room {
    const room = this.getRoom(roomId);
    if (!room) throw new Error('ROOM_NOT_FOUND');
    if (room.hostPlayerId !== hostId) throw new Error('NOT_HOST');
    if (room.status !== 'finished') throw new Error('GAME_NOT_FINISHED');
    if (room.seats.some((s) => s.playerId === null)) throw new Error('ROOM_NOT_FULL');

    const playerInits = room.seats.map((s) => ({ id: s.playerId!, name: s.name! }));
    room.game = createGame(room.roomId, room.size, playerInits);
    room.status = 'in_progress';
    return room;
  }

  setGame(roomId: string, game: GameState): void {
    const room = this.getRoom(roomId);
    if (!room) throw new Error('ROOM_NOT_FOUND');
    room.game = game;
    if (game.status === 'finished') room.status = 'finished';
  }

  roomOf(playerId: string): Room | undefined {
    const id = this.playerRooms.get(playerId);
    return id ? this.rooms.get(id) : undefined;
  }

  toSummary(room: Room): RoomSummary {
    return {
      roomId: room.roomId,
      size: room.size,
      hostPlayerId: room.hostPlayerId,
      status: room.status,
      reclaimGraceMs: RECLAIM_GRACE_MS,
      seats: room.seats.map<SeatSummary>((s) => ({
        seat: s.seat,
        team: s.team,
        playerId: s.playerId,
        name: s.name,
        connected: s.connected,
        disconnectedAt: s.disconnectedAt,
      })),
    };
  }
}
