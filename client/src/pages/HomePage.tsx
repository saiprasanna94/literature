import { useState } from 'react';
import { useGameStore } from '../store.js';

export function HomePage() {
  const createRoom = useGameStore((s) => s.createRoom);
  const joinRoom = useGameStore((s) => s.joinRoom);
  const connected = useGameStore((s) => s.connected);
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [size, setSize] = useState<6 | 8>(6);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onCreate = async () => {
    setError(null);
    if (!name.trim()) return setError('Enter a name first.');
    setBusy(true);
    const res = await createRoom(name.trim(), size);
    setBusy(false);
    if (!res.ok) setError(res.error);
  };

  const onJoin = async () => {
    setError(null);
    if (!name.trim()) return setError('Enter a name first.');
    if (!roomCode.trim()) return setError('Enter a room code.');
    setBusy(true);
    const res = await joinRoom(roomCode.trim().toUpperCase(), name.trim());
    setBusy(false);
    if (!res.ok) setError(res.error);
  };

  return (
    <div className="felt-bg flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md animate-scale-in">
        <div className="mb-6 text-center">
          <h1 className="font-display text-5xl font-bold text-gold-shimmer mb-1">Literature</h1>
          <p className="text-sm text-white/70">A team card game of memory and deduction</p>
        </div>

        <div className="rounded-2xl bg-white p-7 shadow-2xl space-y-5">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Your name
            </span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              placeholder="e.g. Sai"
            />
          </label>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <h2 className="font-semibold text-slate-800">Create a room</h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">Size:</span>
              <button
                className={`rounded-lg px-4 py-1 text-sm font-medium transition-colors ${
                  size === 6
                    ? 'bg-slate-900 text-white shadow'
                    : 'border border-slate-300 hover:bg-slate-100'
                }`}
                onClick={() => setSize(6)}
              >
                6 players
              </button>
              <button
                className={`rounded-lg px-4 py-1 text-sm font-medium transition-colors ${
                  size === 8
                    ? 'bg-slate-900 text-white shadow'
                    : 'border border-slate-300 hover:bg-slate-100'
                }`}
                onClick={() => setSize(8)}
              >
                8 players
              </button>
            </div>
            <button
              className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-50 transition-colors"
              disabled={busy || !connected}
              onClick={onCreate}
            >
              Create room
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <h2 className="font-semibold text-slate-800">Join a room</h2>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-center font-mono uppercase tracking-[0.3em] text-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={5}
              placeholder="ABCDE"
            />
            <button
              className="w-full rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              disabled={busy || !connected}
              onClick={onJoin}
            >
              Join room
            </button>
          </div>

          {!connected && (
            <p className="text-center text-xs text-amber-600 animate-pulse">
              Connecting to server…
            </p>
          )}
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
