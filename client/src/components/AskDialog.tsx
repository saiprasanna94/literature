import {
  ALL_SETS,
  Card,
  cardId,
  cardIdsInSet,
  parseCardId,
  PublicGameState,
  SET_LABELS,
  SetId,
  setOfCard,
} from '@literature/shared';
import { useEffect, useMemo, useState } from 'react';
import { friendlyError } from '../lib/errors.js';
import { CardView } from './Card.js';

export function AskDialog({
  game,
  onClose,
  onSubmit,
}: {
  game: PublicGameState;
  onClose: () => void;
  onSubmit: (payload: {
    targetId: string;
    cardId: string;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const me = game.players.find((p) => p.id === game.yourPlayerId);
  if (!me || !game.yourHand) return null;

  const eligibleSets: SetId[] = useMemo(() => {
    const held = new Set<SetId>(game.yourHand!.map(setOfCard));
    return ALL_SETS.filter((s) => held.has(s) && !game.claimedSets.some((cs) => cs.setId === s));
  }, [game.yourHand, game.claimedSets]);

  const opponents = game.players.filter((p) => p.team !== me.team && p.handCount > 0);

  const [targetId, setTargetId] = useState<string | null>(null);
  const [setId, setSetId] = useState<SetId | null>(eligibleSets[0] ?? null);
  const [cardIdSel, setCardIdSel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCardIdSel(null);
  }, [setId]);

  const cardsToShow: Card[] = useMemo(() => {
    if (!setId) return [];
    const myIds = new Set(game.yourHand!.map(cardId));
    return cardIdsInSet(setId)
      .filter((id) => !myIds.has(id))
      .map(parseCardId);
  }, [setId, game.yourHand]);

  const submit = async () => {
    if (!targetId || !cardIdSel) return;
    setBusy(true);
    setError(null);
    const res = await onSubmit({ targetId, cardId: cardIdSel });
    setBusy(false);
    if (res.ok) onClose();
    else setError(friendlyError(res.error));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl animate-scale-in">
        <div className="mb-4 flex items-center justify-between border-b pb-3">
          <h3 className="text-2xl font-bold tracking-tight">Ask for a card</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">
            ✕
          </button>
        </div>

        <section className="mb-5">
          <h4 className="mb-2 text-sm font-semibold uppercase text-slate-500">1. Pick an opponent</h4>
          <div className="flex flex-wrap gap-2">
            {opponents.map((o) => (
              <button
                key={o.id}
                onClick={() => setTargetId(o.id)}
                className={`rounded-lg border-2 px-3 py-2 text-sm transition-colors ${
                  targetId === o.id
                    ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {o.name}{' '}
                <span className={targetId === o.id ? 'text-blue-500' : 'text-slate-400'}>
                  · {o.handCount}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="mb-5">
          <h4 className="mb-2 text-sm font-semibold uppercase text-slate-500">2. Pick a set</h4>
          <div className="flex flex-wrap gap-2">
            {eligibleSets.map((s) => (
              <button
                key={s}
                onClick={() => setSetId(s)}
                className={`rounded-lg border-2 px-3 py-2 text-sm transition-colors ${
                  setId === s
                    ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {SET_LABELS[s]}
              </button>
            ))}
            {eligibleSets.length === 0 && (
              <p className="text-sm text-red-600">
                You hold no cards from any unclaimed set — you cannot ask.
              </p>
            )}
          </div>
        </section>

        <section className="mb-5">
          <h4 className="mb-1 text-sm font-semibold uppercase text-slate-500">
            3. Pick a card to ask for
          </h4>
          <p className="mb-3 text-xs text-slate-500">Cards you already hold from this set are hidden.</p>
          <div className="flex flex-wrap gap-3">
            {cardsToShow.map((c) => {
              const id = cardId(c);
              return (
                <CardView
                  key={id}
                  card={c}
                  size="md"
                  selected={cardIdSel === id}
                  onClick={() => setCardIdSel(id)}
                />
              );
            })}
          </div>
        </section>

        {error && <p className="mb-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700">Error: {error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!targetId || !cardIdSel || busy}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Ask
          </button>
        </div>
      </div>
    </div>
  );
}
