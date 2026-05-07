import { describe, it, expect } from 'vitest';
import { buildFullDeck, cardId } from '@literature/shared';
import { deal, shuffle } from './deck.js';

function seededRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

describe('deck', () => {
  it('full deck has 54 unique cards (52 + 2 jokers)', () => {
    const deck = buildFullDeck();
    expect(deck.length).toBe(54);
    const ids = new Set(deck.map(cardId));
    expect(ids.size).toBe(54);
  });

  it('shuffle does not lose or duplicate cards', () => {
    const deck = buildFullDeck();
    const shuffled = shuffle(deck, seededRng(42));
    expect(shuffled.length).toBe(54);
    expect(new Set(shuffled.map(cardId)).size).toBe(54);
  });

  it('deal(6) yields six 9-card hands using all 54 cards', () => {
    const hands = deal(6, seededRng(1));
    expect(hands.length).toBe(6);
    expect(hands.map((h) => h.length)).toEqual([9, 9, 9, 9, 9, 9]);
    const allIds = hands.flat().map(cardId);
    expect(new Set(allIds).size).toBe(54);
  });

  it('deal(8) yields six 7-card hands and two 6-card hands at seats 6 and 7', () => {
    const hands = deal(8, seededRng(7));
    expect(hands.map((h) => h.length)).toEqual([7, 7, 7, 7, 7, 7, 6, 6]);
    const allIds = hands.flat().map(cardId);
    expect(new Set(allIds).size).toBe(54);
  });
});
