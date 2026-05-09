import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store.js';

const SHOW_MANUAL_AFTER_MS = 10_000;

export function DisconnectOverlay() {
  const reconnecting = useGameStore((s) => s.reconnecting);
  const session = useGameStore((s) => s.session);
  const navigate = useNavigate();
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    if (!reconnecting) {
      setShowManual(false);
      return;
    }
    const t = setTimeout(() => setShowManual(true), SHOW_MANUAL_AFTER_MS);
    return () => clearTimeout(t);
  }, [reconnecting]);

  if (!reconnecting || !session) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-2xl animate-scale-in">
        <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
        <h2 className="text-lg font-semibold text-slate-900">Reconnecting…</h2>
        <p className="mt-1 text-sm text-slate-500">
          You lost connection. We're trying to put you back in room{' '}
          <span className="font-mono font-bold text-slate-700">{session.roomId}</span>.
        </p>
        {showManual && (
          <button
            onClick={() => navigate('/')}
            className="mt-5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-amber-700 transition-colors"
          >
            Rejoin manually
          </button>
        )}
        {showManual && (
          <p className="mt-2 text-[11px] text-slate-400">
            We'll take you to the home page where you can use the "Rejoin" form.
          </p>
        )}
      </div>
    </div>
  );
}
