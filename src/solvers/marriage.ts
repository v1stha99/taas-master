import type { Card, MarriageRules, SolverRecommendation, Suit } from '../types/cards';
import { cardToSymbol, getRankValue, rankFromValue, SUIT_COLORS } from '../utils/cardUtils';

export interface MarriageContext {
  hand: Card[]; // 21 or 22 cards
  offeredCard: Card | null;
  phase: 1 | 2;
  tipluCard: Card | null;
  turnNumber: number; // Turn 1 has special Tunnella rules
  justPickedOfferedCard: boolean;
  opponentSeenTipluPickups: Card[];
}

export interface MeldGroup {
  type: 'pure_sequence' | 'dirty_sequence' | 'tunnella' | 'trial' | 'dublee';
  cards: Card[];
  description: string;
}

// Check if 3 cards form a Tunnella (identical rank AND identical suit in 3-deck shoe)
export function isTunnella(c1: Card, c2: Card, c3: Card): boolean {
  return c1.rank === c2.rank && c2.rank === c3.rank && c1.suit === c2.suit && c2.suit === c3.suit;
}

// Check if 2 cards form a Dublee (identical rank AND identical suit)
export function isDubleePair(c1: Card, c2: Card): boolean {
  return c1.rank === c2.rank && c1.suit === c2.suit;
}

// Check if 3 cards form a Pure Sequence (same suit, strictly consecutive, no wildcards, A-2-3 and Q-K-A valid, K-A-2 invalid)
export function isPureSequence(c1: Card, c2: Card, c3: Card): boolean {
  if (c1.suit !== c2.suit || c2.suit !== c3.suit) return false;
  const vals = [getRankValue(c1.rank), getRankValue(c2.rank), getRankValue(c3.rank)].sort((a, b) => a - b);
  // Standard run: x, x+1, x+2
  if (vals[0] + 1 === vals[1] && vals[1] + 1 === vals[2]) return true;
  // Ace wrap: A(1), Q(12), K(13)
  if (vals[0] === 1 && vals[1] === 12 && vals[2] === 13) return true;
  return false;
}

// Identify Maal and Jokers based on Tiplu (r_T, s_T)
export function evaluateMaalInfo(tiplu: Card | null, includeAlter: boolean = true) {
  if (!tiplu) {
    return {
      isTiplu: () => false,
      isPoplu: () => false,
      isJhiplu: () => false,
      isAlter: () => false,
      isOrdinaryJoker: () => false,
      isAnyWildcard: () => false,
      getMaalPoints: () => 0,
    };
  }

  const rT = tiplu.rank;
  const sT = tiplu.suit;
  const valT = getRankValue(rT);
  const colorT = SUIT_COLORS[sT];

  // Poplu: rT + 1 (with A above K, 2 above A)
  const popluRank = rankFromValue(valT + 1);
  // Jhiplu: rT - 1
  const jhipluRank = rankFromValue(valT - 1);

  // Alter: same rank, same color, opposite suit
  const alterSuit: Suit = sT === 'H' ? 'D' : sT === 'D' ? 'H' : sT === 'S' ? 'C' : 'S';

  const isTiplu = (c: Card) => c.rank === rT && c.suit === sT;
  const isPoplu = (c: Card) => c.rank === popluRank && c.suit === sT;
  const isJhiplu = (c: Card) => c.rank === jhipluRank && c.suit === sT;
  const isAlter = (c: Card) => includeAlter && c.rank === rT && c.suit === alterSuit;
  const isOrdinaryJoker = (c: Card) => c.rank === rT && SUIT_COLORS[c.suit] !== colorT;

  const isAnyWildcard = (c: Card) =>
    isTiplu(c) || isPoplu(c) || isJhiplu(c) || isAlter(c) || isOrdinaryJoker(c);

  const getMaalPoints = (c: Card): number => {
    if (isTiplu(c)) return 3;
    if (isPoplu(c)) return 2;
    if (isJhiplu(c)) return 2;
    if (isAlter(c)) return 5;
    return 0; // Ordinary jokers are wildcards with 0 maal points
  };

  return {
    isTiplu,
    isPoplu,
    isJhiplu,
    isAlter,
    isOrdinaryJoker,
    isAnyWildcard,
    getMaalPoints,
    popluRank,
    jhipluRank,
    alterSuit,
  };
}

// Find all disjoint pure melds (Pure Sequences + Tunnellas)
export function extractPureMelds(cards: Card[]): { melds: MeldGroup[]; remaining: Card[] } {
  const melds: MeldGroup[] = [];
  let pool = [...cards];

  // First, extract Tunnellas (3 identical cards in rank and suit)
  const groupedExact: Record<string, Card[]> = {};
  for (const c of pool) {
    const key = `${c.rank}_${c.suit}`;
    if (!groupedExact[key]) groupedExact[key] = [];
    groupedExact[key].push(c);
  }

  for (const [key, group] of Object.entries(groupedExact)) {
    if (group.length >= 3) {
      const tunnellaCards = group.slice(0, 3);
      melds.push({
        type: 'tunnella',
        cards: tunnellaCards,
        description: `Tunnella (${key.replace('_', '')})`,
      });
      // Remove from pool
      const ids = tunnellaCards.map(c => c.id);
      pool = pool.filter(c => !ids.includes(c.id));
    }
  }

  // Next, greedily extract 3-card pure sequences
  const suits: Suit[] = ['S', 'H', 'D', 'C'];
  for (const s of suits) {
    let suitCards = pool.filter(c => c.suit === s);
    let foundSeq = true;

    while (foundSeq && suitCards.length >= 3) {
      foundSeq = false;
      const sorted = [...suitCards].sort((a, b) => getRankValue(a.rank) - getRankValue(b.rank));

      for (let i = 0; i < sorted.length - 2; i++) {
        for (let j = i + 1; j < sorted.length - 1; j++) {
          for (let k = j + 1; k < sorted.length; k++) {
            if (isPureSequence(sorted[i], sorted[j], sorted[k])) {
              const seqCards = [sorted[i], sorted[j], sorted[k]];
              melds.push({
                type: 'pure_sequence',
                cards: seqCards,
                description: `Pure Seq (${seqCards.map(c => c.rank).join('-')}${s})`,
              });
              const seqIds = seqCards.map(c => c.id);
              pool = pool.filter(c => !seqIds.includes(c.id));
              suitCards = pool.filter(c => c.suit === s);
              foundSeq = true;
              break;
            }
          }
          if (foundSeq) break;
        }
        if (foundSeq) break;
      }
    }
  }

  return { melds, remaining: pool };
}

// Count Dublees (Pairs of identical cards)
export function countDublees(cards: Card[]): { dubleePairs: Card[][]; dubleeCount: number; remaining: Card[] } {
  const groupedExact: Record<string, Card[]> = {};
  for (const c of cards) {
    const key = `${c.rank}_${c.suit}`;
    if (!groupedExact[key]) groupedExact[key] = [];
    groupedExact[key].push(c);
  }

  const dubleePairs: Card[][] = [];
  const usedIds: string[] = [];

  for (const group of Object.values(groupedExact)) {
    const numPairs = Math.floor(group.length / 2);
    for (let i = 0; i < numPairs; i++) {
      const p = [group[i * 2], group[i * 2 + 1]];
      dubleePairs.push(p);
      usedIds.push(p[0].id, p[1].id);
    }
  }

  const remaining = cards.filter(c => !usedIds.includes(c.id));
  return { dubleePairs, dubleeCount: dubleePairs.length, remaining };
}

// 3-Deck Proto-Meld score K(c)
export function computeProtoKeepScore(
  card: Card,
  remainingCards: Card[],
  opponentPickups: Card[]
): number {
  const rVal = getRankValue(card.rank);
  const suit = card.suit;
  const otherSameSuit = remainingCards.filter(c => c.id !== card.id && c.suit === suit);

  // adj_1: r +- 1 in same suit (up to 6 outs in 3 decks)
  const hasAdj1 = otherSameSuit.some(c => {
    const v = getRankValue(c.rank);
    return Math.abs(v - rVal) === 1 || (rVal === 1 && v === 13) || (rVal === 13 && v === 1);
  });

  // adj_2: r +- 2 gutshot in same suit (up to 3 outs)
  const hasAdj2 = otherSameSuit.some(c => {
    const v = getRankValue(c.rank);
    return Math.abs(v - rVal) === 2 || (rVal === 1 && v === 12) || (rVal === 12 && v === 1);
  });

  // identical duplicates in remaining (pair / tunnella potential)
  const hasDuplicate = remainingCards.filter(c => c.id !== card.id && c.rank === card.rank && c.suit === card.suit).length >= 1;

  // Middle ranks 4-10 are easier to connect into sequences
  const isMiddle = rVal >= 4 && rVal <= 10;

  // Near opponent pickups
  const nearOpponent = opponentPickups.some(p => p.suit === suit && Math.abs(getRankValue(p.rank) - rVal) <= 1);

  return (
    (hasAdj1 ? 6 : 0) +
    (hasAdj2 ? 3 : 0) +
    (hasDuplicate ? 3 : 0) +
    (isMiddle ? 1 : 0) -
    (nearOpponent ? 50 : 0)
  );
}

export function solveMarriage(
  context: MarriageContext,
  rules: MarriageRules
): SolverRecommendation {
  const { hand, offeredCard, turnNumber, tipluCard, justPickedOfferedCard, opponentSeenTipluPickups } = context;
  const isPhase1 = !tipluCard || rules.phase === 1;
  const maalInfo = evaluateMaalInfo(tipluCard, rules.includeAlter);

  // 1. Initial Tunnella Check (Turn 1 alert)
  const initialTunnellas: Card[][] = [];
  const groupedExact: Record<string, Card[]> = {};
  for (const c of hand) {
    const key = `${c.rank}_${c.suit}`;
    if (!groupedExact[key]) groupedExact[key] = [];
    groupedExact[key].push(c);
  }
  for (const group of Object.values(groupedExact)) {
    if (group.length >= 3) {
      initialTunnellas.push(group.slice(0, 3));
    }
  }

  if (turnNumber <= 1 && initialTunnellas.length > 0) {
    const tunDesc = initialTunnellas.map(t => `${t[0].rank}${t[0].suit} x3`).join(', ');
    return {
      primaryAction: `EXPOSE TUNNELLA (${tunDesc}) BEFORE FIRST DRAW!`,
      secondaryAction: 'Must be placed face-up on Turn 1 for 5-point Maal bonus',
      isWinningDeclaration: false,
      confidenceScore: 100,
      cardsToHighlight: initialTunnellas.flat().map(c => c.id),
      breakdown: [
        { label: 'Turn 1 Alert', value: 'Exposing Tunnella before drawing card secures 5 bonus points.' },
        { label: 'Tunnellas Found', value: tunDesc },
        { label: 'Rule Warning', value: 'If kept concealed or acquired later, non-Maal Tunnella scores 0 points.' },
      ],
    };
  }

  // 2. Pure Meld & Dublee Evaluation
  const { melds: pureMelds, remaining: unmelded } = extractPureMelds(hand);
  const { dubleePairs, dubleeCount } = countDublees(hand);

  // Strategy path selector: Dublee path vs Sequence path
  const useDubleePath = (pureMelds.length === 0 && dubleeCount >= 5) || (pureMelds.length === 1 && dubleeCount >= 6);

  // Phase 1 Logic (Target: 3 Pure Melds or 7 Dublees to see Tiplu)
  if (isPhase1) {
    if (useDubleePath) {
      if (dubleeCount >= 7) {
        return {
          primaryAction: 'SHOW 7 DUBLEES — UNLOCK AND SEE TIPLU!',
          secondaryAction: 'Phase 1 Complete via Dublee Path',
          isWinningDeclaration: true,
          confidenceScore: 100,
          suggestedMelds: dubleePairs,
          breakdown: [
            { label: 'Dublees Completed', value: `${dubleeCount} / 7 pairs` },
            { label: 'Next Action', value: 'Reveal your 7 Dublees to view the hidden Tiplu card.' },
          ],
        };
      }

      // Recommend optimal discard on Dublee path
      const nonDubleeCards = unmelded;
      const discardCandidates = nonDubleeCards.map(c => ({
        card: c,
        score: computeProtoKeepScore(c, nonDubleeCards, opponentSeenTipluPickups),
      }));
      discardCandidates.sort((a, b) => a.score - b.score);
      const bestDiscard = discardCandidates[0] || { card: hand[0], score: 0 };

      return {
        primaryAction: `DUBLEE PATH: TARGET 7 DUBLEES (CURRENT: ${dubleeCount}/7)`,
        secondaryAction: `Optimal Discard: ${cardToSymbol(bestDiscard.card)}`,
        cardsToDiscard: [bestDiscard.card.id],
        suggestedMelds: dubleePairs,
        breakdown: [
          { label: 'Dublee Strategy', value: `Holding ${dubleeCount} identical pairs. Dublee path is faster than sequences.` },
          { label: 'Recommended Discard', value: `${cardToSymbol(bestDiscard.card)} (Isolated rank)` },
          { label: 'Dublees Held', value: dubleePairs.map(p => `${p[0].rank}${p[0].suit}x2`).join(', ') },
        ],
      };
    }

    // Sequence Path
    if (pureMelds.length >= 3) {
      return {
        primaryAction: 'SHOW 3 PURE SETS — UNLOCK AND SEE TIPLU!',
        secondaryAction: 'Phase 1 Complete! Enter Tiplu card to unlock Maal & Phase 2.',
        isWinningDeclaration: true,
        confidenceScore: 100,
        suggestedMelds: pureMelds.map(m => m.cards),
        breakdown: [
          { label: 'Pure Melds Completed', value: `${pureMelds.length} / 3 sets ready` },
          { label: 'Sets', value: pureMelds.map(m => m.description).join(' | ') },
          { label: 'Action', value: 'Place your 3 pure sets on table and view the Tiplu.' },
        ],
      };
    }

    // Score unmelded cards to find optimal discard
    const discardCandidates = unmelded.map(c => {
      const isIllegal = justPickedOfferedCard && offeredCard && offeredCard.rank === c.rank && offeredCard.suit === c.suit;
      const score = (isIllegal ? 99999 : 0) + computeProtoKeepScore(c, unmelded, opponentSeenTipluPickups);
      return { card: c, score, isIllegal };
    });

    discardCandidates.sort((a, b) => a.score - b.score);
    const bestDiscard = discardCandidates[0] || { card: unmelded[0], score: 0 };

    return {
      primaryAction: `SEQUENCE PATH: BUILD 3 PURE SETS (${pureMelds.length}/3 COMPLETE)`,
      secondaryAction: `Optimal Discard: ${cardToSymbol(bestDiscard.card)}`,
      cardsToDiscard: [bestDiscard.card.id],
      suggestedMelds: pureMelds.map(m => m.cards),
      breakdown: [
        { label: 'Pure Melds Ready', value: pureMelds.map(m => m.description).join(' | ') || '0 / 3' },
        { label: 'Recommended Discard', value: `${cardToSymbol(bestDiscard.card)} (Lowest connection score)` },
        { label: 'Top Priority', value: 'Reach Phase 1 rapidly to avoid -10 pt penalty and Maal murder!' },
      ],
    };
  }

  // Phase 2 Logic (Dirty Round - Post-Tiplu)
  // Calculate Maal points held in hand
  let totalMaal = 0;
  const maalDetails: string[] = [];

  for (const c of hand) {
    const pts = maalInfo.getMaalPoints(c);
    if (pts > 0) {
      totalMaal += pts;
      const tag = maalInfo.isTiplu(c) ? 'Tiplu (3pt)' : maalInfo.isPoplu(c) ? 'Poplu (2pt)' : maalInfo.isJhiplu(c) ? 'Jhiplu (2pt)' : 'Alter (5pt)';
      maalDetails.push(`${cardToSymbol(c)}: ${tag}`);
    }
  }

  // Add initial Tunnellas bonus if applicable (5 pts each)
  if (initialTunnellas.length > 0) {
    totalMaal += initialTunnellas.length * 5;
    maalDetails.push(`${initialTunnellas.length}x Tunnella (5pt each)`);
  }

  // Discard evaluation in Phase 2: ALL MAAL CARDS HAVE KEEP SCORE = +INFINITY
  const discardPool = unmelded.filter(c => maalInfo.getMaalPoints(c) === 0);
  const candidates = (discardPool.length > 0 ? discardPool : unmelded).map(c => {
    const isIllegal = justPickedOfferedCard && offeredCard && offeredCard.rank === c.rank && offeredCard.suit === c.suit;
    // Protect wildcards with 0 maal (ordinary jokers)
    const isOrdinaryWild = maalInfo.isOrdinaryJoker(c);
    const score = (isIllegal ? 99999 : 0) + (isOrdinaryWild ? 500 : 0) + computeProtoKeepScore(c, unmelded, opponentSeenTipluPickups);
    return { card: c, score, isIllegal };
  });

  candidates.sort((a, b) => a.score - b.score);
  const bestDiscard = candidates[0] || { card: hand[0], score: 0 };

  return {
    primaryAction: `PHASE 2 (SEEN TIPLU ${cardToSymbol(tipluCard)}): MAAL POINTS = ${totalMaal} PTS`,
    secondaryAction: `Optimal Discard: ${cardToSymbol(bestDiscard.card)} (Never discard Maal!)`,
    cardsToDiscard: [bestDiscard.card.id],
    suggestedMelds: pureMelds.map(m => m.cards),
    breakdown: [
      { label: 'Active Tiplu', value: `${cardToSymbol(tipluCard)} | Poplu: ${maalInfo.popluRank}${tipluCard.suit} | Jhiplu: ${maalInfo.jhipluRank}${tipluCard.suit}` },
      { label: 'Total Maal Points in Hand', value: `${totalMaal} points` },
      { label: 'Maal Breakdown', value: maalDetails.join(', ') || 'No Maal cards yet' },
      { label: 'Recommended Discard', value: `${cardToSymbol(bestDiscard.card)} (Safe non-Maal deadwood)` },
    ],
  };
}
