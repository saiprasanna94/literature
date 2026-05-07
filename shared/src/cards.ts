export type Suit = 'H' | 'D' | 'S' | 'C';
export type Rank =
  | '2' | '3' | '4' | '5' | '6' | '7'
  | '8'
  | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export type StandardCard = { kind: 'standard'; suit: Suit; rank: Rank };
export type JokerCard = { kind: 'joker'; color: 'big' | 'small' };
export type Card = StandardCard | JokerCard;

export const SUITS: Suit[] = ['H', 'D', 'S', 'C'];
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const LOW_RANKS: Rank[] = ['2', '3', '4', '5', '6', '7'];
export const HIGH_RANKS: Rank[] = ['9', '10', 'J', 'Q', 'K', 'A'];

export function cardId(card: Card): string {
  if (card.kind === 'joker') return `JK-${card.color}`;
  return `${card.suit}-${card.rank}`;
}

export function parseCardId(id: string): Card {
  if (id.startsWith('JK-')) {
    const color = id.slice(3) as 'big' | 'small';
    return { kind: 'joker', color };
  }
  const [suit, rank] = id.split('-') as [Suit, Rank];
  return { kind: 'standard', suit, rank };
}

export function cardsEqual(a: Card, b: Card): boolean {
  return cardId(a) === cardId(b);
}

export function buildFullDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ kind: 'standard', suit, rank });
    }
  }
  deck.push({ kind: 'joker', color: 'big' });
  deck.push({ kind: 'joker', color: 'small' });
  return deck;
}
