import {
  AskPayload,
  ClaimPayload,
  ClientToServer,
  PublicGameState,
  RoomSummary,
  ServerToClient,
} from '@literature/shared';
import { io, Socket } from 'socket.io-client';
import { create } from 'zustand';

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ?? `http://${window.location.hostname}:4000`;

const SS_KEY = 'literature.session.v1';

type Session = { roomId: string; playerId: string };

function loadSession(): Session | null {
  const raw = sessionStorage.getItem(SS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}
function saveSession(s: Session) {
  sessionStorage.setItem(SS_KEY, JSON.stringify(s));
}
function clearSession() {
  sessionStorage.removeItem(SS_KEY);
}

type Store = {
  socket: Socket<ServerToClient, ClientToServer> | null;
  connected: boolean;
  /** True iff our own socket is currently disconnected and we have a session to recover. */
  reconnecting: boolean;
  session: Session | null;
  room: RoomSummary | null;
  game: PublicGameState | null;
  lastError: string | null;

  connect: () => void;
  tryRejoin: () => Promise<void>;

  createRoom: (name: string, size: 6 | 8) => Promise<{ ok: true } | { ok: false; error: string }>;
  joinRoom: (roomId: string, name: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  reclaimSeat: (roomId: string, name: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  leaveRoom: () => Promise<void>;
  startGame: () => Promise<{ ok: true } | { ok: false; error: string }>;
  ask: (payload: AskPayload) => Promise<{ ok: true } | { ok: false; error: string }>;
  claim: (payload: ClaimPayload) => Promise<{ ok: true } | { ok: false; error: string }>;
  takeTurn: () => Promise<{ ok: true } | { ok: false; error: string }>;
  setError: (e: string | null) => void;
};

export const useGameStore = create<Store>((set, get) => ({
  socket: null,
  connected: false,
  reconnecting: false,
  session: loadSession(),
  room: null,
  game: null,
  lastError: null,

  connect: () => {
    if (get().socket) return;
    const socket: Socket<ServerToClient, ClientToServer> = io(SERVER_URL, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 4000,
    });
    socket.on('connect', () => {
      set({ connected: true });
      // If we lost connection mid-session, transparently rejoin.
      const s = get().session;
      if (s && get().reconnecting) {
        socket.emit('room:rejoin', s, (res) => {
          if (res.ok) set({ reconnecting: false });
          else {
            // Original session no longer valid (e.g. server restart) — bail.
            clearSession();
            set({ reconnecting: false, session: null, room: null, game: null });
          }
        });
      }
    });
    socket.on('disconnect', () => {
      const haveSession = !!get().session;
      set({ connected: false, reconnecting: haveSession });
    });
    socket.on('room:update', (room) => set({ room }));
    socket.on('game:update', (game) => set({ game }));
    socket.on('room:closed', () => {
      clearSession();
      set({ session: null, room: null, game: null });
    });
    set({ socket });
  },

  tryRejoin: async () => {
    const s = get().session;
    const sock = get().socket;
    if (!s || !sock) return;
    if (!sock.connected) {
      await new Promise<void>((res) => sock.once('connect', () => res()));
    }
    sock.emit('room:rejoin', s, (res) => {
      if (!res.ok) {
        clearSession();
        set({ session: null, room: null, game: null });
      }
    });
  },

  createRoom: (name, size) =>
    new Promise((resolve) => {
      const sock = get().socket;
      if (!sock) return resolve({ ok: false, error: 'NO_SOCKET' });
      sock.emit('room:create', { name, size }, (res) => {
        if (res.ok) {
          const session = { roomId: res.roomId, playerId: res.playerId };
          saveSession(session);
          set({ session });
          resolve({ ok: true });
        } else {
          set({ lastError: res.error });
          resolve(res);
        }
      });
    }),

  joinRoom: (roomId, name) =>
    new Promise((resolve) => {
      const sock = get().socket;
      if (!sock) return resolve({ ok: false, error: 'NO_SOCKET' });
      sock.emit('room:join', { roomId, name }, (res) => {
        if (res.ok) {
          const session = { roomId: roomId.toUpperCase(), playerId: res.playerId };
          saveSession(session);
          set({ session });
          resolve({ ok: true });
        } else {
          set({ lastError: res.error });
          resolve(res);
        }
      });
    }),

  reclaimSeat: (roomId, name) =>
    new Promise((resolve) => {
      const sock = get().socket;
      if (!sock) return resolve({ ok: false, error: 'NO_SOCKET' });
      sock.emit('room:reclaim', { roomId, name }, (res) => {
        if (res.ok) {
          const session = { roomId: roomId.toUpperCase(), playerId: res.playerId };
          saveSession(session);
          set({ session });
          resolve({ ok: true });
        } else {
          set({ lastError: res.error });
          resolve(res);
        }
      });
    }),

  leaveRoom: () =>
    new Promise<void>((resolve) => {
      const sock = get().socket;
      if (!sock) {
        clearSession();
        set({ session: null, room: null, game: null });
        return resolve();
      }
      sock.emit('room:leave', () => {
        clearSession();
        set({ session: null, room: null, game: null, reconnecting: false });
        resolve();
      });
    }),

  startGame: () =>
    new Promise((resolve) => {
      const sock = get().socket;
      if (!sock) return resolve({ ok: false, error: 'NO_SOCKET' });
      sock.emit('game:start', (res) => {
        if (!res.ok) set({ lastError: res.error });
        resolve(res);
      });
    }),

  ask: (payload) =>
    new Promise((resolve) => {
      const sock = get().socket;
      if (!sock) return resolve({ ok: false, error: 'NO_SOCKET' });
      sock.emit('turn:ask', payload, (res) => {
        if (!res.ok) set({ lastError: res.error });
        resolve(res);
      });
    }),

  claim: (payload) =>
    new Promise((resolve) => {
      const sock = get().socket;
      if (!sock) return resolve({ ok: false, error: 'NO_SOCKET' });
      sock.emit('turn:claim', payload, (res) => {
        if (!res.ok) set({ lastError: res.error });
        resolve(res);
      });
    }),

  takeTurn: () =>
    new Promise((resolve) => {
      const sock = get().socket;
      if (!sock) return resolve({ ok: false, error: 'NO_SOCKET' });
      sock.emit('turn:take', (res) => {
        if (!res.ok) set({ lastError: res.error });
        resolve(res);
      });
    }),

  setError: (e) => set({ lastError: e }),
}));
