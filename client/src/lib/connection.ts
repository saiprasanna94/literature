import { RoomSummary, SeatSummary } from '@literature/shared';

export type ConnectionState = 'connected' | 'reconnecting' | 'vacant';

export function seatConnectionState(seat: SeatSummary, graceMs: number): ConnectionState {
  if (seat.connected) return 'connected';
  if (!seat.disconnectedAt) return 'reconnecting';
  return Date.now() - seat.disconnectedAt >= graceMs ? 'vacant' : 'reconnecting';
}

export function findSeat(room: RoomSummary, playerId: string): SeatSummary | undefined {
  return room.seats.find((s) => s.playerId === playerId);
}
