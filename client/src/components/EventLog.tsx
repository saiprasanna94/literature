import {
  AskRecord,
  ClaimRecord,
  parseCardId,
  PublicGameState,
  SET_LABELS,
} from '@literature/shared';
import { useMemo } from 'react';

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

function nameOf(game: PublicGameState, id: string): string {
  return game.players.find((p) => p.id === id)?.name ?? '?';
}

type Entry =
  | { kind: 'ask'; rec: AskRecord }
  | { kind: 'claim'; rec: ClaimRecord };

export function EventLog({ game }: { game: PublicGameState }) {
  const entries: Entry[] = useMemo(() => {
    const merged: Entry[] = [
      ...game.asks.map((rec) => ({ kind: 'ask' as const, rec })),
      ...game.claims.map((rec) => ({ kind: 'claim' as const, rec })),
    ];
    return merged.sort((a, b) => b.rec.seq - a.rec.seq);
  }, [game.asks, game.claims]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
        Game log
      </div>
      <ul className="max-h-[42vh] divide-y overflow-y-auto text-sm">
        {entries.length === 0 && (
          <li className="p-4 text-center text-slate-400">No moves yet.</li>
        )}
        {entries.map((e, idx) =>
          e.kind === 'ask' ? (
            <li
              key={`a-${e.rec.seq}`}
              className={`p-3 ${idx === 0 ? 'animate-slide-down' : ''}`}
            >
              <span className="font-semibold">{nameOf(game, e.rec.askerId)}</span>{' '}
              <span className="text-slate-500">→</span>{' '}
              <span className="font-semibold">{nameOf(game, e.rec.targetId)}</span>:{' '}
              <CardChip cardIdStr={e.rec.cardId} />{' '}
              <span
                className={`ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  e.rec.success
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {e.rec.success ? '✓ got it' : '✗ no'}
              </span>
            </li>
          ) : (
            <li
              key={`c-${e.rec.seq}`}
              className={`p-3 ${idx === 0 ? 'animate-slide-down' : ''}`}
            >
              <span className="font-semibold">{nameOf(game, e.rec.claimerId)}</span> claimed{' '}
              <span className="font-semibold">{SET_LABELS[e.rec.setId]}</span>{' '}
              <span
                className={`ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  e.rec.success
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {e.rec.success ? '✓ correct' : '✗ wrong'}
              </span>{' '}
              <span className="text-slate-500">→ Team {e.rec.awardedTeam}</span>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
