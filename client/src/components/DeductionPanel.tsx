import {
  ALL_SETS,
  cardIdsInSet,
  parseCardId,
  PublicGameState,
  SET_LABELS,
  SetId,
} from '@literature/shared';
import { useMemo, useState } from 'react';
import { deduceFromAsks } from '../lib/deduce.js';

const SUIT_GLYPH = { H: '♥', D: '♦', S: '♠', C: '♣' } as const;
const SUIT_RED = new Set(['H', 'D']);

function CardLabel({ cardId }: { cardId: string }) {
  const c = parseCardId(cardId);
  if (c.kind === 'joker') {
    return (
      <span className="font-mono text-xs font-semibold text-slate-700">
        {c.color === 'big' ? 'JK★' : 'jk★'}
      </span>
    );
  }
  const red = SUIT_RED.has(c.suit);
  return (
    <span className={`font-mono text-xs font-semibold ${red ? 'text-red-600' : 'text-slate-800'}`}>
      {c.rank}
      {SUIT_GLYPH[c.suit]}
    </span>
  );
}

function nameOf(game: PublicGameState, id: string): string | undefined {
  return game.players.find((p) => p.id === id)?.name;
}

function teamOf(game: PublicGameState, id: string): 'A' | 'B' | undefined {
  return game.players.find((p) => p.id === id)?.team;
}

export function DeductionPanel({ game }: { game: PublicGameState }) {
  const deduction = useMemo(() => deduceFromAsks(game), [game]);
  const [open, setOpen] = useState<SetId | null>(null);
  const myTeam = game.yourPlayerId ? teamOf(game, game.yourPlayerId) : undefined;

  return (
    <div className="rounded-xl border border-white/10 bg-white/95 text-slate-900 shadow-sm overflow-hidden">
      <div className="border-b bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
        Sets &amp; deductions
      </div>
      <ul className="divide-y text-sm">
        {ALL_SETS.map((s) => {
          const claim = game.claimedSets.find((cs) => cs.setId === s);
          const sk = deduction.get(s);
          const isOpen = open === s;
          return (
            <li key={s}>
              <button
                onClick={() => setOpen(isOpen ? null : s)}
                disabled={!sk}
                className={`flex w-full items-center justify-between px-3 py-2 text-left transition-colors ${
                  sk ? 'hover:bg-slate-50' : 'cursor-default'
                }`}
              >
                <span className={`text-sm ${claim ? 'font-medium' : 'text-slate-700'}`}>
                  {SET_LABELS[s]}
                </span>
                {claim ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      claim.team === 'A' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    Team {claim.team}
                  </span>
                ) : (
                  <KnownSummary sk={sk!} game={game} myTeam={myTeam} isOpen={isOpen} />
                )}
              </button>
              {isOpen && sk && (
                <div className="border-t bg-slate-50/60 px-3 py-2 text-xs text-slate-700 space-y-2 animate-slide-down">
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                    {cardIdsInSet(s).map((cid) => {
                      const ck = sk.cards.get(cid)!;
                      return (
                        <div key={cid} className="flex items-baseline gap-1.5">
                          <CardLabel cardId={cid} />
                          {ck.holder ? (
                            <HolderChip
                              name={nameOf(game, ck.holder) ?? '?'}
                              team={teamOf(game, ck.holder)}
                              isMe={ck.holder === game.yourPlayerId}
                            />
                          ) : ck.nonHolders.size > 0 ? (
                            <span className="text-slate-500">
                              not at:{' '}
                              {[...ck.nonHolders]
                                .map((id) => nameOf(game, id))
                                .filter(Boolean)
                                .join(', ')}
                            </span>
                          ) : (
                            <span className="text-slate-400">unknown</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {sk.askersInOrder.length > 0 && (
                    <div className="text-[11px] text-slate-500">
                      <span className="font-semibold">Asked in this set:</span>{' '}
                      {sk.askersInOrder
                        .map((id) => nameOf(game, id))
                        .filter(Boolean)
                        .join(', ')}
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="border-t bg-slate-50 px-3 py-1.5 text-[10px] text-slate-500">
        Click an unclaimed set to expand its deductions.
      </div>
    </div>
  );
}

function KnownSummary({
  sk,
  game,
  myTeam,
  isOpen,
}: {
  sk: { cards: Map<string, { holder?: string; nonHolders: Set<string> }> };
  game: PublicGameState;
  myTeam: 'A' | 'B' | undefined;
  isOpen: boolean;
}) {
  let mine = 0;
  let theirs = 0;
  let known = 0;
  for (const [, ck] of sk.cards) {
    if (ck.holder) {
      known++;
      const t = teamOf(game, ck.holder);
      if (t && myTeam) {
        if (t === myTeam) mine++;
        else theirs++;
      }
    }
  }
  return (
    <span className="flex items-center gap-1.5 text-[11px]">
      {known === 0 ? (
        <span className="text-slate-400">no info</span>
      ) : (
        <>
          {mine > 0 && (
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-700">
              {mine} ours
            </span>
          )}
          {theirs > 0 && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-700">
              {theirs} theirs
            </span>
          )}
          <span className="text-slate-400">{known}/6 known</span>
        </>
      )}
      <span className="text-slate-300">{isOpen ? '▾' : '▸'}</span>
    </span>
  );
}

function HolderChip({
  name,
  team,
  isMe,
}: {
  name: string;
  team: 'A' | 'B' | undefined;
  isMe: boolean;
}) {
  const cls = isMe
    ? 'bg-amber-100 text-amber-800'
    : team === 'A'
      ? 'bg-blue-100 text-blue-800'
      : team === 'B'
        ? 'bg-red-100 text-red-800'
        : 'bg-slate-200 text-slate-700';
  return (
    <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      {isMe ? 'me' : `@${name}`}
    </span>
  );
}
