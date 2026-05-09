import {
  ALL_SETS,
  cardId,
  cardIdsInSet,
  parseCardId,
  PublicGameState,
  SET_LABELS,
  SetId,
} from '@literature/shared';
import { useEffect, useMemo, useState } from 'react';
import { friendlyError } from '../lib/errors.js';
import { CardView } from './Card.js';

export function ClaimDialog({
  game,
  onClose,
  onSubmit,
}: {
  game: PublicGameState;
  onClose: () => void;
  onSubmit: (payload: {
    setId: SetId;
    assignments: Record<string, string[]>;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const me = game.players.find((p) => p.id === game.yourPlayerId);
  if (!me) return null;

  const teammates = game.players.filter((p) => p.team === me.team);
  const myCardIds = useMemo(
    () => new Set((game.yourHand ?? []).map(cardId)),
    [game.yourHand],
  );

  const unclaimedSets = useMemo(
    () => ALL_SETS.filter((s) => !game.claimedSets.some((cs) => cs.setId === s)),
    [game.claimedSets],
  );

  const [setId, setSetId] = useState<SetId | null>(unclaimedSets[0] ?? null);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When set changes, prefill: every card the user holds → assigned to "Me".
  // Cards the user doesn't hold are left unassigned for the user to fill.
  useEffect(() => {
    if (!setId) {
      setAssignments({});
      return;
    }
    const next: Record<string, string> = {};
    for (const cid of cardIdsInSet(setId)) {
      if (myCardIds.has(cid)) next[cid] = me.id;
    }
    setAssignments(next);
  }, [setId, me.id, myCardIds]);

  const cardsInSet = setId ? cardIdsInSet(setId) : [];

  const setCardOwner = (cardIdStr: string, playerId: string) => {
    setAssignments((prev) => ({ ...prev, [cardIdStr]: playerId }));
  };

  const allAssigned = setId && cardsInSet.every((c) => assignments[c]);

  const submit = async () => {
    if (!setId || !allAssigned) return;
    setBusy(true);
    setError(null);

    const grouped: Record<string, string[]> = {};
    for (const cardIdStr of cardsInSet) {
      const owner = assignments[cardIdStr];
      if (!owner) continue;
      if (!grouped[owner]) grouped[owner] = [];
      grouped[owner].push(cardIdStr);
    }

    const res = await onSubmit({ setId, assignments: grouped });
    setBusy(false);
    if (res.ok) onClose();
    else setError(friendlyError(res.error));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl animate-scale-in">
        <div className="mb-4 flex items-center justify-between border-b pb-3">
          <h3 className="text-2xl font-bold tracking-tight">Claim a set</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">
            ✕
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-600">
          Cards you hold are pre-assigned to <span className="font-semibold text-purple-700">Me</span>.
          For each remaining card, pick which teammate has it. A wrong answer awards the set to the opposing team.
        </p>

        <section className="mb-4">
          <h4 className="mb-2 text-sm font-semibold uppercase text-slate-500">Set</h4>
          <div className="flex flex-wrap gap-2">
            {unclaimedSets.map((s) => (
              <button
                key={s}
                onClick={() => setSetId(s)}
                className={`rounded-lg border-2 px-3 py-2 text-sm transition-colors ${
                  setId === s
                    ? 'border-purple-600 bg-purple-50 text-purple-900 font-semibold'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {SET_LABELS[s]}
              </button>
            ))}
          </div>
        </section>

        {setId && (
          <section className="mb-4 space-y-2">
            {cardsInSet.map((cidStr) => {
              const card = parseCardId(cidStr);
              const owner = assignments[cidStr];
              const iHaveIt = myCardIds.has(cidStr);
              return (
                <div
                  key={cidStr}
                  className={`flex items-center gap-4 rounded-lg border p-3 ${
                    iHaveIt ? 'border-purple-200 bg-purple-50/40' : 'border-slate-200'
                  }`}
                >
                  <CardView card={card} size="sm" />
                  <div className="flex flex-1 flex-wrap gap-1.5">
                    {teammates.map((t) => {
                      const isMe = t.id === me.id;
                      const sel = owner === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setCardOwner(cidStr, t.id)}
                          className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                            sel
                              ? 'border-purple-600 bg-purple-600 text-white'
                              : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {isMe ? 'Me' : t.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {error && (
          <p className="mb-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700">Error: {error}</p>
        )}

        <div className="flex justify-end gap-2 pt-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!allAssigned || busy}
            className="rounded-lg bg-purple-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Submit claim
          </button>
        </div>
      </div>
    </div>
  );
}
