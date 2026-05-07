import { buildFullDeck, Card } from '@literature/shared';

export type RNG = () => number;

export function shuffle<T>(items: T[], rng: RNG = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i]!, a[j]!] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * Deal a 54-card deck across `numPlayers`.
 * 6 players → 9 each.
 * 8 players → 6 players get 7, 2 players get 6.
 *   The two 6-card hands go to the highest seat indices (6 and 7).
 */
export function deal(numPlayers: 6 | 8, rng: RNG = Math.random): Card[][] {
  const deck = shuffle(buildFullDeck(), rng);
  const hands: Card[][] = Array.from({ length: numPlayers }, () => []);

  if (numPlayers === 6) {
    for (let i = 0; i < deck.length; i++) {
      hands[i % 6]!.push(deck[i]!);
    }
    return hands;
  }

  // 8 players: seats 0..5 get 7 cards, seats 6..7 get 6 cards = 6*7 + 2*6 = 54
  const sizes = [7, 7, 7, 7, 7, 7, 6, 6];
  let cursor = 0;
  for (let seat = 0; seat < 8; seat++) {
    const size = sizes[seat]!;
    for (let k = 0; k < size; k++) {
      hands[seat]!.push(deck[cursor++]!);
    }
  }
  return hands;
}
