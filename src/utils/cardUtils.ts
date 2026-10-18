import type { Card, Rank, Suit } from '../types/cards';

export const ALL_RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const ALL_SUITS: Suit[] = ['S', 'H', 'D', 'C'];

export const SUIT_SYMBOLS: Record<Suit, string> = {
  S: '♠',
  H: '♥',
  D: '♦',
  C: '♣',
};

export const SUIT_NAMES: Record<Suit, string> = {
  S: 'Spades',
  H: 'Hearts',
  D: 'Diamonds',
  C: 'Clubs',
};

export const SUIT_COLORS: Record<Suit, 'red' | 'black'> = {
  S: 'black',
  H: 'red',
  D: 'red',
  C: 'black',
};

// Numerical rank value (Ace = 1 by default, King = 13)
export function getRankValue(rank: Rank): number {
  switch (rank) {
    case 'A': return 1;
    case '2': return 2;
    case '3': return 3;
    case '4': return 4;
    case '5': return 5;
    case '6': return 6;
    case '7': return 7;
    case '8': return 8;
    case '9': return 9;
    case '10': return 10;
    case 'J': return 11;
    case 'Q': return 12;
    case 'K': return 13;
  }
}

// Rank from numerical value (1 = A, 13 = K, with cyclic wrap)
export function rankFromValue(val: number): Rank {
  const normalized = ((val - 1) % 13 + 13) % 13 + 1;
  return ALL_RANKS[normalized - 1];
}

// Generate unique card ID
let cardCounter = 0;
export function createCard(rank: Rank, suit: Suit, extra?: Partial<Card>): Card {
  cardCounter += 1;
  return {
    id: `card-${rank}${suit}-${cardCounter}-${Math.random().toString(36).substr(2, 5)}`,
    rank,
    suit,
    ...extra,
  };
}

// Parse string such as "10H", "AS", "4d", "k_c" into Card object
export function parseCardString(str: string): Card | null {
  if (!str) return null;
  const clean = str.trim().toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (clean.length < 2) return null;

  const suitChar = clean.slice(-1) as Suit;
  const rankStr = clean.slice(0, -1) as Rank;

  if (!ALL_SUITS.includes(suitChar)) return null;
  if (!ALL_RANKS.includes(rankStr)) return null;

  return createCard(rankStr, suitChar);
}

// Convert Card to human-readable string with suit symbol
export function cardToSymbol(c: Card | null | undefined): string {
  if (!c) return 'None';
  return `${c.rank}${SUIT_SYMBOLS[c.suit]}`;
}

// Convert Card to plain ASCII code e.g. "10H", "AS"
export function cardToCode(c: Card | null | undefined): string {
  if (!c) return '';
  return `${c.rank}${c.suit}`;
}

// Standard sorting: suit first, then rank
export function sortCards(cards: Card[]): Card[] {
  const suitOrder: Record<Suit, number> = { S: 0, H: 1, C: 2, D: 3 };
  return [...cards].sort((a, b) => {
    if (a.suit !== b.suit) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    return getRankValue(a.rank) - getRankValue(b.rank);
  });
}

// Standard sorting by rank first
export function sortCardsByRank(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => getRankValue(a.rank) - getRankValue(b.rank));
}
