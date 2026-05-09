import {
  HistoryEvent,
  HistoryGameDetail,
  parseCardId,
  SET_LABELS,
} from '@literature/shared';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchGame } from '../lib/api.js';

const SUIT_GLYPH = { H: '♥', D: '♦', S: '♠', C: '♣' } as const;
const SUIT_RED = new Set(['H', 'D']);

function CardChip({ cardIdStr }: { cardIdStr: string }) {
  const c = parseCardId(cardIdStr);
  if (c.kind === 'joker') {
    return (
      <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-700">
        {c.color === 'big' ? 'Joker' : 'joker'}
      </span>
    );
  }
  const red = SUIT_RED.has(c.suit);
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold ${
        red ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-800'
      }`}
    >
      {c.rank}
      {SUIT_GLYPH[c.suit]}
    </span>
  );
}

function fmtTime(epoch: number): string {
  return new Date(epoch).toLocaleTimeString();
}

export function GameDetailPage() {
  const { id } = useParams();
  const [game, setGame] = useState<HistoryGameDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchGame(id).then(setGame).catch((e) => setError(e?.message ?? 'failed'));
  }, [id]);

  if (error) {
    return (
      <div className="felt-bg min-h-screen text-white p-6">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-lg bg-red-900/40 border border-red-400/40 p-4 text-sm text-red-100">
            {error === 'not_found' ? 'Game not found.' : `Error: ${error}`}
          </div>
          <Link to="/history" className="mt-4 inline-block text-sm text-white/70 hover:text-white">
            ← Back to history
          </Link>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="felt-bg flex min-h-screen items-center justify-center text-white">
        Loading…
      </div>
    );
  }

  const nameOf = (pid: string) => game.players.find((p) => p.playerId === pid)?.name ?? '?';
  const teamA = game.players.filter((p) => p.team === 'A');
  const teamB = game.players.filter((p) => p.team === 'B');

  return (
    <div className="felt-bg min-h-screen text-white">
      <div className="mx-auto max-w-3xl space-y-5 p-6">
        <header className="flex items-center justify-between rounded-xl bg-black/30 border border-white/10 px-5 py-4 backdrop-blur-sm animate-slide-down">
          <div>
            <Link to="/history" className="text-xs text-white/70 hover:text-white">
              ← Back to history
            </Link>
            <h1 className="font-display text-2xl font-bold text-gold mt-1">Game replay</h1>
            <p className="mt-1 font-mono text-xs uppercase tracking-widest text-white/60">
              {game.roomId} · {new Date(game.endedAt).toLocaleString()}
            </p>
          </div>
          <div
            className={`rounded-xl px-4 py-2 text-center ${
              game.winner === 'A'
                ? 'bg-blue-500/20 text-blue-100 border border-blue-400/40'
                : 'bg-red-500/20 text-red-100 border border-red-400/40'
            }`}
          >
            <div className="text-[10px] uppercase tracking-wide opacity-80">Winner</div>
            <div className="text-xl font-bold">Team {game.winner}</div>
            <div className="text-xs opacity-80">
              {game.teamASets}–{game.teamBSets}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-4">
          <TeamColumn label="Team A" team="A" players={teamA} />
          <TeamColumn label="Team B" team="B" players={teamB} />
        </div>

        <section className="rounded-xl bg-white/95 text-slate-900 shadow-sm overflow-hidden border border-white/10">
          <div className="border-b bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Move-by-move ({game.events.length} events)
          </div>
          {game.events.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">No moves recorded.</p>
          ) : (
            <ol className="divide-y text-sm">
              {game.events.map((e, i) => (
                <EventRow key={i} event={e} nameOf={nameOf} />
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

function TeamColumn({
  label,
  team,
  players,
}: {
  label: string;
  team: 'A' | 'B';
  players: { name: string; seat: number }[];
}) {
  const cls =
    team === 'A'
      ? 'border-blue-400/40 from-blue-500/20 to-blue-700/10 text-blue-200'
      : 'border-red-400/40 from-red-500/20 to-red-700/10 text-red-200';
  return (
    <div className={`rounded-xl bg-gradient-to-br ${cls} border-2 p-4 backdrop-blur-sm`}>
      <h2 className="mb-2 text-xs font-bold uppercase tracking-widest">{label}</h2>
      <ul className="space-y-1 text-sm text-white">
        {players.map((p) => (
          <li key={p.seat} className="rounded bg-white/10 px-2 py-1">
            <span className="text-[10px] uppercase opacity-60 mr-2">Seat {p.seat + 1}</span>
            <span className="font-semibold">{p.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EventRow({
  event,
  nameOf,
}: {
  event: HistoryEvent;
  nameOf: (id: string) => string;
}) {
  if (event.type === 'ask') {
    const r = event.rec;
    return (
      <li className="px-3 py-2 flex items-baseline justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-1.5">
          <span className="text-[10px] text-slate-400 font-mono">#{r.seq}</span>
          <span className="font-semibold">{nameOf(r.askerId)}</span>
          <span className="text-slate-400">→</span>
          <span className="font-semibold">{nameOf(r.targetId)}</span>
          <CardChip cardIdStr={r.cardId} />
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              r.success ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {r.success ? '✓ got it' : '✗ no'}
          </span>
        </div>
        <span className="font-mono text-xs text-slate-400">{fmtTime(r.at)}</span>
      </li>
    );
  }
  const r = event.rec;
  return (
    <li className="px-3 py-2 flex items-baseline justify-between gap-3 bg-purple-50/40">
      <div className="flex flex-wrap items-baseline gap-1.5">
        <span className="text-[10px] text-slate-400 font-mono">#{r.seq}</span>
        <span className="font-semibold">{nameOf(r.claimerId)}</span>
        <span className="text-slate-500">claimed</span>
        <span className="font-semibold">{SET_LABELS[r.setId]}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            r.success ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {r.success ? '✓ correct' : '✗ wrong'}
        </span>
        <span className="text-slate-500 text-xs">→ Team {r.awardedTeam}</span>
      </div>
      <span className="font-mono text-xs text-slate-400">{fmtTime(r.at)}</span>
    </li>
  );
}
