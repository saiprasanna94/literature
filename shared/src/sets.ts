import { Card, cardId, HIGH_RANKS, LOW_RANKS, SUITS } from './cards.js';

export type SetId =
  | 'low_H' | 'high_H'
  | 'low_D' | 'high_D'
  | 'low_S' | 'high_S'
  | 'low_C' | 'high_C'
  | 'eights';

export const ALL_SETS: SetId[] = [
  'low_H', 'high_H',
  'low_D', 'high_D',
  'low_S', 'high_S',
  'low_C', 'high_C',
  'eights',
];

export const SET_LABELS: Record<SetId, string> = {
  low_H: 'Low Hearts',
  high_H: 'High Hearts',
  low_D: 'Low Diamonds',
  high_D: 'High Diamonds',
  low_S: 'Low Spades',
  high_S: 'High Spades',
  low_C: 'Low Clubs',
  high_C: 'High Clubs',
  eights: 'The 8s',
};

export function setOfCard(card: Card): SetId {
  if (card.kind === 'joker') return 'eights';
  if (card.rank === '8') return 'eights';
  const half = LOW_RANKS.includes(card.rank) ? 'low' : 'high';
  return `${half}_${card.suit}` as SetId;
}

const _cardsInSetCache = new Map<SetId, string[]>();

export function cardIdsInSet(setId: SetId): string[] {
  const cached = _cardsInSetCache.get(setId);
  if (cached) return cached;
  const ids: string[] = [];
  if (setId === 'eights') {
    for (const suit of SUITS) ids.push(cardId({ kind: 'standard', suit, rank: '8' }));
    ids.push(cardId({ kind: 'joker', color: 'big' }));
    ids.push(cardId({ kind: 'joker', color: 'small' }));
  } else {
    const [half, suit] = setId.split('_') as ['low' | 'high', 'H' | 'D' | 'S' | 'C'];
    const ranks = half === 'low' ? LOW_RANKS : HIGH_RANKS;
    for (const rank of ranks) ids.push(cardId({ kind: 'standard', suit, rank }));
  }
  _cardsInSetCache.set(setId, ids);
  return ids;
}
