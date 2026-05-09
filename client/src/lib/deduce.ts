import {
  AskRecord,
  cardIdsInSet,
  parseCardId,
  PublicGameState,
  SetId,
  setOfCard,
} from '@literature/shared';

export type CardKnowledge = {
  /** The player currently known to hold this card, if known. */
  holder?: string;
  /** Players known to NOT hold this card. */
  nonHolders: Set<string>;
};

export type SetKnowledge = {
  /** Map of cardId → what the public log reveals about that card. */
  cards: Map<string, CardKnowledge>;
  /** Players who at some point asked for a card in this set. They held ≥1 card from the set at the time of asking. */
  askersInOrder: string[];
};

export type Deduction = Map<SetId, SetKnowledge>;

/**
 * Compute everything the public log reveals about each unclaimed set.
 *
 * Derivations:
 *  - Successful ask of card X by A from B:
 *    - X is now at A.
 *    - B no longer holds X (transferred away).
 *    - A is also confirmed to hold ≥1 card in X's set (membership rule).
 *  - Failed ask of card X by A to B:
 *    - B does not hold X.
 *    - A also does not hold X (must not ask for a card you hold).
 *    - A is still confirmed to hold ≥1 card in X's set.
 */
export function deduceFromAsks(game: PublicGameState): Deduction {
  const claimedSetIds = new Set(game.claimedSets.map((cs) => cs.setId));
  const result: Deduction = new Map();

  // Initialize each unclaimed set with empty per-card knowledge
  for (const [, set] of (
    [
      'low_H', 'high_H', 'low_D', 'high_D', 'low_S', 'high_S',
      'low_C', 'high_C', 'eights',
    ] as SetId[]
  ).entries()) {
    if (claimedSetIds.has(set)) continue;
    const cards = new Map<string, CardKnowledge>();
    for (const cid of cardIdsInSet(set)) {
      cards.set(cid, { nonHolders: new Set() });
    }
    result.set(set, { cards, askersInOrder: [] });
  }

  // Replay the ask log
  for (const ask of game.asks) {
    const card = parseCardId(ask.cardId);
    const setId = setOfCard(card);
    const sk = result.get(setId);
    if (!sk) continue; // set was claimed; skip

    if (!sk.askersInOrder.includes(ask.askerId)) {
      sk.askersInOrder.push(ask.askerId);
    }

    const ck = sk.cards.get(ask.cardId)!;
    if (ask.success) {
      ck.holder = ask.askerId;
      // Target gave it up; asker now has it. Update non-holder set.
      ck.nonHolders.add(ask.targetId);
      ck.nonHolders.delete(ask.askerId);
    } else {
      // Failed: target doesn't have it; asker doesn't either (couldn't legally ask otherwise).
      ck.nonHolders.add(ask.targetId);
      ck.nonHolders.add(ask.askerId);
    }
  }

  return result;
}
