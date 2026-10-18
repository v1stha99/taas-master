import type { CallbreakRules, Card, Rank, SolverRecommendation, Suit } from '../types/cards';
import { cardToSymbol, getRankValue } from '../utils/cardUtils';

export interface TrickCard {
  playerIndex: number;
  card: Card;
}

export interface CallbreakContext {
  hand: Card[]; // 13 cards (or remaining cards in round)
  phase: 'bid' | 'play';
  trickNumber: number; // 1 to 13
  ledSuit: Suit | null;
  currentTrick: TrickCard[]; // cards played in active trick so far
  tricksWon: number;
  bidAnnounced: number;
}

// Convert rank to Callbreak trick hierarchy (2 lowest, A highest)
export function getCallbreakRankStrength(rank: Rank): number {
  if (rank === 'A') return 14;
  return getRankValue(rank);
}

// 1. Five-Step Ten-Second Floor Counting Algorithm
export function calculateCallbreakFloorBid(hand: Card[], minBid: number = 1): {
  bid: number;
  rawCount: number;
  spadeScore: number;
  sideScore: number;
  isRedealClaimable: boolean;
  redealReason?: string;
  details: string[];
} {
  const details: string[] = [];

  // Check Redeal conditions
  const spades = hand.filter(c => c.suit === 'S');
  const courtCards = hand.filter(c => ['J', 'Q', 'K', 'A'].includes(c.rank));

  if (spades.length === 0) {
    return {
      bid: 0,
      rawCount: 0,
      spadeScore: 0,
      sideScore: 0,
      isRedealClaimable: true,
      redealReason: 'Zero Spades in hand (Valid Redeal Claim)',
      details: ['Redeal allowed: Hand contains 0 Spades.'],
    };
  }

  if (courtCards.length === 0) {
    return {
      bid: 0,
      rawCount: 0,
      spadeScore: 0,
      sideScore: 0,
      isRedealClaimable: true,
      redealReason: 'No card ranked higher than 10 (Valid Redeal Claim)',
      details: ['Redeal allowed: No face cards (J, Q, K, A) held.'],
    };
  }

  // 1. Spades Trump Evaluation
  let spadeScore = 0;
  const numSpades = spades.length;
  const hasSpadeAce = spades.some(c => c.rank === 'A');
  const hasSpadeKing = spades.some(c => c.rank === 'K');
  const hasSpadeQueen = spades.some(c => c.rank === 'Q');

  if (hasSpadeAce) {
    spadeScore += 1.0;
    details.push('A♠ (+1.0)');
  }
  if (hasSpadeKing && (hasSpadeAce || numSpades >= 2)) {
    spadeScore += 1.0;
    details.push('K♠ (+1.0 supported)');
  }
  if (hasSpadeQueen && numSpades >= 4) {
    spadeScore += 0.75;
    details.push('Q♠ (+0.75 with 4+ spades)');
  }

  // Extra spade length past 4
  if (numSpades > 4) {
    const extra = (numSpades - 4) * 0.5;
    spadeScore += extra;
    details.push(`Extra Trump Length (${numSpades} spades: +${extra.toFixed(1)})`);
  }

  // 2. Side Suits Evaluation (H, D, C)
  let sideScore = 0;
  const sideSuits: Suit[] = ['H', 'D', 'C'];

  for (const s of sideSuits) {
    const suitCards = hand.filter(c => c.suit === s);
    const len = suitCards.length;
    const hasAce = suitCards.some(c => c.rank === 'A');

    if (hasAce) {
      if (len >= 2 && len <= 5) {
        sideScore += 1.0;
        details.push(`A${s} (+1.0, length ${len})`);
      } else if (len === 1) {
        // Bare singleton Ace often trumped
        details.push(`A${s} (+0.0 bare singleton risk)`);
      } else if (len >= 6) {
        details.push(`A${s} (+0.0 excessive suit length risk)`);
      }
    }
  }

  const rawCount = spadeScore + sideScore;
  const floorBid = Math.max(minBid, Math.floor(rawCount));

  return {
    bid: floorBid,
    rawCount,
    spadeScore,
    sideScore,
    isRedealClaimable: false,
    details,
  };
}

// 2. Legal Play Engine (Mandatory Follow, Mandatory Upgrade, Mandatory Overtrump)
export function determineLegalCallbreakPlays(
  hand: Card[],
  ledSuit: Suit | null,
  currentTrick: TrickCard[]
): { legalCardIds: string[]; winningCardInTrick: Card | null } {
  // If leading the trick, any card is legal
  if (!ledSuit || currentTrick.length === 0) {
    return {
      legalCardIds: hand.map(c => c.id),
      winningCardInTrick: null,
    };
  }

  // Find the current winning card in the trick
  let winningCard: Card = currentTrick[0].card;

  for (let i = 1; i < currentTrick.length; i++) {
    const candidate = currentTrick[i].card;
    if (winningCard.suit === 'S') {
      if (candidate.suit === 'S' && getCallbreakRankStrength(candidate.rank) > getCallbreakRankStrength(winningCard.rank)) {
        winningCard = candidate;
      }
    } else {
      if (candidate.suit === 'S') {
        winningCard = candidate;
      } else if (candidate.suit === winningCard.suit && getCallbreakRankStrength(candidate.rank) > getCallbreakRankStrength(winningCard.rank)) {
        winningCard = candidate;
      }
    }
  }

  const cardsOfLedSuit = hand.filter(c => c.suit === ledSuit);

  // Case 1: Player holds cards of led suit -> MUST FOLLOW SUIT
  if (cardsOfLedSuit.length > 0) {
    // If the winning card is of the led suit, check if player can beat it (Mandatory Upgrade)
    if (winningCard.suit === ledSuit) {
      const winningStrength = getCallbreakRankStrength(winningCard.rank);
      const higherCards = cardsOfLedSuit.filter(c => getCallbreakRankStrength(c.rank) > winningStrength);
      if (higherCards.length > 0) {
        // Must upgrade!
        return {
          legalCardIds: higherCards.map(c => c.id),
          winningCardInTrick: winningCard,
        };
      }
    }
    // Cannot beat or winning card was trumped: any card of led suit is legal
    return {
      legalCardIds: cardsOfLedSuit.map(c => c.id),
      winningCardInTrick: winningCard,
    };
  }

  // Case 2: Player is void in led suit -> MUST PLAY SPADE (Trump) if held
  const spadesInHand = hand.filter(c => c.suit === 'S');
  if (spadesInHand.length > 0) {
    // If a spade has already been played, must overtrump if possible
    if (winningCard.suit === 'S') {
      const winningTrumpStrength = getCallbreakRankStrength(winningCard.rank);
      const higherSpades = spadesInHand.filter(c => getCallbreakRankStrength(c.rank) > winningTrumpStrength);
      if (higherSpades.length > 0) {
        return {
          legalCardIds: higherSpades.map(c => c.id),
          winningCardInTrick: winningCard,
        };
      }
    }
    // Any spade is legal
    return {
      legalCardIds: spadesInHand.map(c => c.id),
      winningCardInTrick: winningCard,
    };
  }

  // Case 3: Void in led suit and void in Spades -> Can throw any card
  return {
    legalCardIds: hand.map(c => c.id),
    winningCardInTrick: winningCard,
  };
}

export function solveCallbreak(
  context: CallbreakContext,
  rules: CallbreakRules
): SolverRecommendation {
  const { hand, phase, ledSuit, currentTrick, tricksWon, bidAnnounced } = context;

  // Bidding Phase
  if (phase === 'bid') {
    const bidInfo = calculateCallbreakFloorBid(hand, rules.minBid);

    if (bidInfo.isRedealClaimable) {
      return {
        primaryAction: `DEMAND REDEAL: ${bidInfo.redealReason}`,
        secondaryAction: 'Zero Spades or No Face Cards held',
        isWinningDeclaration: true,
        confidenceScore: 100,
        breakdown: [
          { label: 'Redeal Rule', value: bidInfo.redealReason || 'Redeal available' },
          { label: 'Action', value: 'Call for a redeal before anyone announces bids.' },
        ],
      };
    }

    return {
      primaryAction: `RECOMMENDED BID: CALL ${bidInfo.bid} TRICKS`,
      secondaryAction: `Safe Floor Count: ${bidInfo.rawCount.toFixed(2)} tricks (Penalty-to-Reward is 10:1)`,
      confidenceScore: 94,
      breakdown: [
        { label: 'Conservative Bid', value: `${bidInfo.bid} tricks` },
        { label: 'Raw Trump Power', value: `${bidInfo.spadeScore.toFixed(2)} tricks from Spades` },
        { label: 'Side Aces Power', value: `${bidInfo.sideScore.toFixed(2)} tricks from Side Aces` },
        { label: 'Floor Calculation', value: bidInfo.details.join(' + ') || 'Basic counts' },
        { label: 'Strategy Note', value: 'Never over-bid. Missing a bid loses 10x what an extra overtrick gains!' },
      ],
    };
  }

  // Trick Play Phase
  const { legalCardIds, winningCardInTrick } = determineLegalCallbreakPlays(hand, ledSuit, currentTrick);
  const legalCards = hand.filter(c => legalCardIds.includes(c.id));

  // Determine optimal legal card to play
  let optimalCard = legalCards[0];
  let playRationale = 'Legal play';

  if (legalCards.length > 1) {
    // If leading: cash backed Aces first
    if (!ledSuit) {
      const sideAce = legalCards.find(c => c.rank === 'A' && c.suit !== 'S');
      if (sideAce) {
        optimalCard = sideAce;
        playRationale = `Lead backed ${cardToSymbol(sideAce)} early before opponents void out`;
      } else {
        // Lead low from non-trump suit
        const nonSpades = legalCards.filter(c => c.suit !== 'S');
        if (nonSpades.length > 0) {
          nonSpades.sort((a, b) => getRankValue(a.rank) - getRankValue(b.rank));
          optimalCard = nonSpades[0];
          playRationale = `Lead safe low card ${cardToSymbol(optimalCard)}`;
        }
      }
    } else {
      // In active trick: if winning, play lowest card that wins
      const winningCards = legalCards.filter(c => {
        if (!winningCardInTrick) return true;
        if (c.suit === 'S' && winningCardInTrick.suit !== 'S') return true;
        if (c.suit === winningCardInTrick.suit && getCallbreakRankStrength(c.rank) > getCallbreakRankStrength(winningCardInTrick.rank)) return true;
        return false;
      });

      if (winningCards.length > 0) {
        winningCards.sort((a, b) => getCallbreakRankStrength(a.rank) - getCallbreakRankStrength(b.rank));
        optimalCard = winningCards[0];
        playRationale = `Win trick with lowest winning card: ${cardToSymbol(optimalCard)}`;
      } else {
        // Cannot win: duck with lowest legal card to conserve high cards
        legalCards.sort((a, b) => getCallbreakRankStrength(a.rank) - getCallbreakRankStrength(b.rank));
        optimalCard = legalCards[0];
        playRationale = `Duck trick with lowest legal card: ${cardToSymbol(optimalCard)}`;
      }
    }
  }

  return {
    primaryAction: `PLAY ${cardToSymbol(optimalCard)}`,
    secondaryAction: playRationale,
    cardsToHighlight: [optimalCard.id],
    cardsToDiscard: [optimalCard.id],
    breakdown: [
      { label: 'Current Progress', value: `Won: ${tricksWon} / Bid: ${bidAnnounced}` },
      { label: 'Led Suit', value: ledSuit ? `${ledSuit}` : 'You are leading this trick' },
      { label: 'Winning Card on Table', value: winningCardInTrick ? cardToSymbol(winningCardInTrick) : 'None' },
      { label: 'Mandatory Rule', value: 'Must follow suit & upgrade if possible. Illegal cards grayed out.' },
      { label: 'Legal Options', value: `${legalCards.length} legal cards available` },
    ],
  };
}
