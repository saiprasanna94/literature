import { HistoryGameSummary } from '@literature/shared';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchGames } from '../lib/api.js';

function fmtDate(epoch: number): string {
  const d = new Date(epoch);
  return d.toLocaleString();
}

function fmtDuration(startedAt: number, endedAt: number): string {
  const ms = endedAt - startedAt;
  const min = Math.floor(ms / 60_000);
  const sec = Math.floor((ms % 60_000) / 1000);
  if (min === 0) return `${sec}s`;
  return `${min}m ${sec}s`;
}

export function HistoryPage() {
  const [games, setGames] = useState<HistoryGameSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGames(100).then(setGames).catch((e) => setError(e?.message ?? 'failed'));
  }, []);

  return (
    <div className="felt-bg min-h-screen text-white">
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <header className="flex items-center justify-between rounded-xl bg-black/30 border border-white/10 px-5 py-4 backdrop-blur-sm animate-slide-down">
          <div>
            <h1 className="font-display text-3xl font-bold text-gold">Game history</h1>
            <p className="mt-1 text-sm text-white/70">
              Every finished game, most recent first.
            </p>
          </div>
          <Link
            to="/"
            className="rounded-lg border border-white/20 px-3 py-1 text-xs hover:bg-white/10 transition-colors"
          >
            ← Home
          </Link>
        </header>

        {error && (
          <div className="rounded-lg bg-red-900/40 border border-red-400/40 p-3 text-sm text-red-100">
            Error: {error}
          </div>
        )}

        {games === null && !error && (
          <div className="rounded-xl bg-black/20 border border-white/10 p-8 text-center text-white/60 animate-pulse">
            Loading…
          </div>
        )}

        {games !== null && games.length === 0 && (
          <div className="rounded-xl bg-black/20 border border-white/10 p-8 text-center text-white/60">
            No finished games yet. Play one and come back!
          </div>
        )}

        {games !== null && games.length > 0 && (
          <ul className="space-y-3">
            {games.map((g) => (
              <li key={g.id}>
                <Link
                  to={`/history/${g.id}`}
                  className="block rounded-xl bg-white/95 text-slate-900 p-4 shadow-sm hover:shadow-md transition-shadow border border-white/10"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            g.winner === 'A'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          Team {g.winner} won
                        </span>
                        <span className="font-mono text-xs uppercase tracking-widest text-slate-500">
                          {g.roomId}
                        </span>
                        <span className="text-xs text-slate-400">{g.size} players</span>
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        <TeamLine players={g.players.filter((p) => p.team === 'A')} team="A" /> ·{' '}
                        <TeamLine players={g.players.filter((p) => p.team === 'B')} team="B" />
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <div className="text-base font-bold text-slate-900">
                        {g.teamASets}–{g.teamBSets}
                      </div>
                      <div>{fmtDate(g.endedAt)}</div>
                      <div className="opacity-70">{fmtDuration(g.startedAt, g.endedAt)}</div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TeamLine({
  players,
  team,
}: {
  players: { name: string }[];
  team: 'A' | 'B';
}) {
  const cls = team === 'A' ? 'text-blue-700' : 'text-red-700';
  return (
    <span>
      <span className={`font-semibold ${cls}`}>Team {team}:</span>{' '}
      {players.map((p) => p.name).join(', ')}
    </span>
  );
}
