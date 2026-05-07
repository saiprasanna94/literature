import { describe, it, expect } from 'vitest';
import {
  ALL_SETS,
  buildFullDeck,
  cardId,
  cardIdsInSet,
  setOfCard,
} from '@literature/shared';

describe('sets', () => {
  it('there are exactly 9 sets', () => {
    expect(ALL_SETS.length).toBe(9);
  });

  it('each non-eights set has 6 cards', () => {
    for (const id of ALL_SETS) {
      expect(cardIdsInSet(id).length).toBe(6);
    }
  });

  it('eights set is exactly the four 8s plus both jokers', () => {
    expect(new Set(cardIdsInSet('eights'))).toEqual(
      new Set(['H-8', 'D-8', 'S-8', 'C-8', 'JK-big', 'JK-small']),
    );
  });

  it('every card in the deck maps back to a set, and the union of sets equals the deck', () => {
    const deck = buildFullDeck();
    for (const card of deck) {
      const setId = setOfCard(card);
      expect(cardIdsInSet(setId)).toContain(cardId(card));
    }
    const all = new Set(ALL_SETS.flatMap(cardIdsInSet));
    expect(all.size).toBe(54);
  });
});
