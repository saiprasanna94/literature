import { useState } from 'react';
import { Link } from 'react-router-dom';
import { friendlyError } from '../lib/errors.js';
import { useGameStore } from '../store.js';

type Mode = 'create' | 'join' | 'rejoin';

export function HomePage() {
  const createRoom = useGameStore((s) => s.createRoom);
  const joinRoom = useGameStore((s) => s.joinRoom);
  const reclaimSeat = useGameStore((s) => s.reclaimSeat);
  const connected = useGameStore((s) => s.connected);
  const [mode, setMode] = useState<Mode>('create');
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [size, setSize] = useState<6 | 8>(6);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!name.trim()) return setError('Enter a name first.');
    setBusy(true);
    let res: { ok: true } | { ok: false; error: string };
    if (mode === 'create') {
      res = await createRoom(name.trim(), size);
    } else if (mode === 'join') {
      if (!roomCode.trim()) {
        setBusy(false);
        return setError('Enter a room code.');
      }
      res = await joinRoom(roomCode.trim().toUpperCase(), name.trim());
    } else {
      if (!roomCode.trim()) {
        setBusy(false);
        return setError('Enter a room code.');
      }
      res = await reclaimSeat(roomCode.trim().toUpperCase(), name.trim());
    }
    setBusy(false);
    if (!res.ok) setError(friendlyError(res.error));
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

          <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1 text-sm">
            <ModeTab active={mode === 'create'} onClick={() => setMode('create')}>
              Create
            </ModeTab>
            <ModeTab active={mode === 'join'} onClick={() => setMode('join')}>
              Join
            </ModeTab>
            <ModeTab active={mode === 'rejoin'} onClick={() => setMode('rejoin')}>
              Rejoin
            </ModeTab>
          </div>

          {mode === 'create' && (
            <div className="space-y-3">
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
            </div>
          )}

          {(mode === 'join' || mode === 'rejoin') && (
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Room code
              </span>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-center font-mono uppercase tracking-[0.3em] text-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={5}
                placeholder="ABCDE"
              />
              {mode === 'rejoin' && (
                <p className="text-xs text-slate-500">
                  Use this if you got disconnected. Enter the same name and room code you played
                  with — your seat must have been disconnected for at least 30 seconds.
                </p>
              )}
            </div>
          )}

          <button
            className={`w-full rounded-lg px-4 py-2 font-semibold text-white shadow disabled:opacity-50 transition-colors ${
              mode === 'create'
                ? 'bg-blue-600 hover:bg-blue-700'
                : mode === 'join'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-amber-600 hover:bg-amber-700'
            }`}
            disabled={busy || !connected}
            onClick={onSubmit}
          >
            {mode === 'create' && 'Create room'}
            {mode === 'join' && 'Join room'}
            {mode === 'rejoin' && 'Rejoin my seat'}
          </button>

          {!connected && (
            <p className="text-center text-xs text-amber-600 animate-pulse">
              Connecting to server…
            </p>
          )}
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>

        <div className="mt-4 text-center">
          <Link to="/history" className="text-sm text-white/70 hover:text-white underline-offset-2 hover:underline">
            Browse past games →
          </Link>
        </div>
      </div>
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
        active ? 'bg-white text-slate-900 shadow' : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      {children}
    </button>
  );
}
