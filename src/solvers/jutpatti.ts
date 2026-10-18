import type { Card, JutpattiRules, Rank, SolverRecommendation } from '../types/cards';
import { cardToSymbol, getRankValue, rankFromValue } from '../utils/cardUtils';

export interface JutpattiContext {
  hand: Card[];
  flippedCard: Card | null;
  offeredCards?: Card[]; // Supports pair throws e.g. [6C, 6S]
  offeredCard?: Card | null; // Single card fallback
  phase: 'draw' | 'discard';
  discardHistory: Card[];
  nextPlayerPickups: Card[];
  justPickedOfferedCard: boolean;
}

export function determineJutpattiWildRank(flippedCard: Card | null, rule: JutpattiRules['wildRule']): Rank | null {
  if (!flippedCard) return null;
  const val = getRankValue(flippedCard.rank);
  if (rule === 'same') return flippedCard.rank;
  if (rule === 'plus1') {
    return rankFromValue(val + 1);
  }
  // minus1
  return rankFromValue(val - 1);
}

export function solveJutpatti(
  context: JutpattiContext,
  rules: JutpattiRules
): SolverRecommendation {
  const { hand, flippedCard, phase, discardHistory, nextPlayerPickups, justPickedOfferedCard } = context;
  const offeredCards = context.offeredCards && context.offeredCards.length > 0
    ? context.offeredCards
    : context.offeredCard
    ? [context.offeredCard]
    : [];

  const wildRank = determineJutpattiWildRank(flippedCard, rules.wildRule);

  // Mark wildcards
  const handWithWilds = hand.map(c => ({
    ...c,
    isWildcard: wildRank ? c.rank === wildRank : false,
  }));

  // Group cards into wildcards vs regular rank counts
  let wildCount = 0;
  const rankCounts: Record<string, number> = {};
  const rankCards: Record<string, Card[]> = {};

  for (const c of handWithWilds) {
    if (c.isWildcard) {
      wildCount += 1;
    } else {
      rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1;
      if (!rankCards[c.rank]) rankCards[c.rank] = [];
      rankCards[c.rank].push(c);
    }
  }

  // Calculate pairs and singletons
  const pairs: Card[][] = [];
  const singletons: Card[] = [];
  const unpairedRanks: Rank[] = [];

  for (const [rankStr, cards] of Object.entries(rankCards)) {
    const rank = rankStr as Rank;
    const numPairs = Math.floor(cards.length / 2);
    for (let i = 0; i < numPairs; i++) {
      pairs.push([cards[i * 2], cards[i * 2 + 1]]);
    }
    if (cards.length % 2 === 1) {
      singletons.push(cards[cards.length - 1]);
      unpairedRanks.push(rank);
    }
  }

  // Draw Phase Logic
  if (phase === 'draw') {
    if (offeredCards.length === 0) {
      return {
        primaryAction: 'DRAW FROM STOCK (GADDI)',
        breakdown: [
          { label: 'Unpaired Singletons', value: `${singletons.length} (${singletons.map(cardToSymbol).join(', ') || 'None'})` },
          { label: 'Wildcards in Hand', value: `${wildCount}` },
          { label: 'Active Wild Rank', value: wildRank ? `${wildRank} (${rules.wildRule} rule)` : 'None selected' },
        ],
      };
    }

    const deficiency = singletons.length - wildCount;

    // 1. Check if ANY offered card gives an immediate WIN
    for (const card of offeredCards) {
      const isWild = wildRank && card.rank === wildRank;
      const matchesSingleton = unpairedRanks.includes(card.rank);

      if (deficiency <= 1 && (isWild || matchesSingleton)) {
        return {
          primaryAction: `PICK ${cardToSymbol(card)} AND DECLARE "JUT!" TO WIN!`,
          secondaryAction: offeredCards.length > 1 ? `Opponent threw a pair (${offeredCards.map(cardToSymbol).join(' ')}). Taking ${cardToSymbol(card)} wins immediately!` : undefined,
          isInstantWin: true,
          isWinningDeclaration: true,
          winType: 'Jut',
          confidenceScore: 100,
          cardsToHighlight: [card.id],
          breakdown: [
            { label: 'Winning Move', value: `Picking ${cardToSymbol(card)} completes all pairs!` },
            { label: 'Pair Formed', value: isWild ? `Wildcard pairs with ${singletons[0] ? cardToSymbol(singletons[0]) : 'wild'}` : `Pairs with ${card.rank}` },
            { label: 'Floor Thrown', value: offeredCards.map(cardToSymbol).join(' ') },
          ],
        };
      }
    }

    // 2. Check if picking a single card from the thrown cards creates a new pair
    const matchingCard = offeredCards.find(c => (wildRank && c.rank === wildRank) || unpairedRanks.includes(c.rank));
    if (matchingCard) {
      const isWild = wildRank && matchingCard.rank === wildRank;
      return {
        primaryAction: `PICK ${cardToSymbol(matchingCard)} FROM FLOOR`,
        secondaryAction: isWild
          ? 'Guaranteed wildcard pickup'
          : `Pairs with your singleton ${matchingCard.rank}`,
        confidenceScore: 95,
        cardsToHighlight: [matchingCard.id],
        breakdown: [
          { label: 'Recommendation', value: `Take ${cardToSymbol(matchingCard)} from opponent's thrown cards` },
          { label: 'Remaining Singletons after Pick', value: `${Math.max(0, singletons.length - 1)}` },
          { label: 'Floor Cards', value: offeredCards.map(cardToSymbol).join(' ') },
        ],
      };
    }

    // 3. Opponent threw a PAIR of identical ranks (e.g. 6C + 6S):
    // In pair-throw rules, if opponent throws a pair, taking BOTH cards adds a brand new pair to your hand!
    const isOfferedPair = offeredCards.length === 2 && offeredCards[0].rank === offeredCards[1].rank;
    if (isOfferedPair && rules.allowPairThrows !== false) {
      const pairRank = offeredCards[0].rank;
      return {
        primaryAction: `TAKE PAIR [${offeredCards.map(cardToSymbol).join(' ')}] OR DRAW GADDI`,
        secondaryAction: `Taking this pair gives you a new Jut of ${pairRank}s (must discard 2 singletons if you take 2)`,
        confidenceScore: 80,
        cardsToHighlight: offeredCards.map(c => c.id),
        breakdown: [
          { label: 'Opponent Action', value: `Threw a pair of ${pairRank}s (${offeredCards.map(cardToSymbol).join(' ')})` },
          { label: 'Strategy', value: `If you want this ready-made pair, take it. Otherwise draw from face-down Gaddi pile.` },
        ],
      };
    }

    // Otherwise, none of the thrown cards help
    return {
      primaryAction: 'DRAW FROM FACE-DOWN STOCK (GADDI)',
      secondaryAction: `Do not take ${offeredCards.map(cardToSymbol).join(' ')} (does not match your singletons)`,
      confidenceScore: 90,
      breakdown: [
        { label: 'Stock Draw Advice', value: `Floor card(s) ${offeredCards.map(cardToSymbol).join(' ')} do not pair with your cards.` },
        { label: 'Unpaired Singletons in Hand', value: singletons.map(cardToSymbol).join(', ') || 'None' },
        { label: 'Wildcards in Hand', value: `${wildCount}` },
      ],
    };
  }

  // Discard Phase Logic (Hand has N+1 cards)
  const remainingDeficiency = singletons.length - wildCount;

  if (remainingDeficiency <= 0) {
    return {
      primaryAction: 'DECLARE "JUT!" — WINNING HAND COMPLETE!',
      isWinningDeclaration: true,
      winType: 'Jut',
      confidenceScore: 100,
      breakdown: [
        { label: 'Result', value: 'All cards successfully paired with natural pairs and wildcards!' },
        { label: 'Pairs Formed', value: `${pairs.length}` },
        { label: 'Wildcards Used', value: `${wildCount}` },
      ],
    };
  }

  // Score candidate singletons to discard
  // LiveOuts: 4 - 1 - (seen in discard) - (1 if flippedCard is this rank)
  const candidateScores = singletons.map(card => {
    // If just picked offered card from floor, cannot discard that exact card on same turn
    const isIllegal = justPickedOfferedCard && offeredCards.some(oc => oc.rank === card.rank && oc.suit === card.suit);

    const rank = card.rank;
    const deadInDiscard = discardHistory.filter(d => d.rank === rank).length;
    const flippedIsThisRank = flippedCard && flippedCard.rank === rank ? 1 : 0;
    const handCount = hand.filter(h => h.rank === rank).length;
    
    // Total in standard deck is 4
    const liveOuts = Math.max(0, 4 - handCount - deadInDiscard - flippedIsThisRank);

    // Is this rank picked by next player?
    const pickedByNext = nextPlayerPickups.some(p => p.rank === rank);

    // Was this rank recently discarded by opponents?
    const recentDiscard = discardHistory.slice(-4).some(d => d.rank === rank);

    // V(r): Higher score means KEEP the card. Lower score means DISCARD the card.
    // We want to KEEP cards that the next player wants (to avoid feeding them).
    // We want to DISCARD cards with lowest live outs in the deck.
    // If recently discarded by others, it is safer to discard (+discard bonus).
    const keepScore =
      (isIllegal ? 99999 : 0) +
      (pickedByNext ? 1000 : 0) + // Strictly refuse to discard cards next player wants
      (10 * liveOuts) -
      (recentDiscard ? 15 : 0); // Safer to discard if opponents recently threw it

    return {
      card,
      liveOuts,
      pickedByNext,
      recentDiscard,
      keepScore,
      isIllegal,
    };
  });

  // Lowest keepScore is the worst card to keep -> BEST TO DISCARD
  // Filter out illegal discards if possible
  const legalCandidates = candidateScores.filter(c => !c.isIllegal);
  const pool = legalCandidates.length > 0 ? legalCandidates : candidateScores;
  pool.sort((a, b) => a.keepScore - b.keepScore);

  const bestDiscard = pool[0];

  return {
    primaryAction: `DISCARD ${cardToSymbol(bestDiscard.card)}`,
    secondaryAction: `Lowest pairing potential (${bestDiscard.liveOuts} live outs remaining in deck)`,
    confidenceScore: 92,
    cardsToDiscard: [bestDiscard.card.id],
    breakdown: [
      { label: 'Recommended Discard', value: `${cardToSymbol(bestDiscard.card)} (Rank ${bestDiscard.card.rank})` },
      { label: 'Live Outs Remaining', value: `${bestDiscard.liveOuts} unseen cards in stock` },
      { label: 'Next Player Safety', value: bestDiscard.pickedByNext ? '⚠️ Warning: Next player was collecting this rank!' : '✅ Safe (Next player not tracking)' },
      { label: 'Natural Pairs Held', value: pairs.map(p => `${p[0].rank}${p[0].suit}-${p[1].rank}${p[1].suit}`).join(', ') || 'None' },
    ],
  };
}
