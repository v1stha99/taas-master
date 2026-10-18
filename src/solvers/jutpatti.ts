import type { Card, JutpattiRules, Rank, SolverRecommendation } from '../types/cards';
import { cardToSymbol, getRankValue, rankFromValue } from '../utils/cardUtils';

export interface JutpattiContext {
  hand: Card[];
  flippedCard: Card | null;
  offeredCard: Card | null;
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
  const { hand, flippedCard, offeredCard, phase, discardHistory, nextPlayerPickups, justPickedOfferedCard } = context;
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
    if (!offeredCard) {
      return {
        primaryAction: 'DRAW FROM STOCK (GADDI)',
        breakdown: [
          { label: 'Unpaired Singletons', value: `${singletons.length} (${singletons.map(cardToSymbol).join(', ') || 'None'})` },
          { label: 'Wildcards in Hand', value: `${wildCount}` },
          { label: 'Active Wild Rank', value: wildRank ? `${wildRank} (${rules.wildRule} rule)` : 'None selected' },
        ],
      };
    }

    const offeredIsWild = wildRank && offeredCard.rank === wildRank;
    const offeredMatchesSingleton = unpairedRanks.includes(offeredCard.rank);

    // Can we win immediately on pickup?
    // In Jutpatti, if we have N cards (odd), picking (N+1) with all pairs covered means |U'| <= w'
    // Deficit before pickup is |singletons| - wildCount
    const deficiency = singletons.length - wildCount;

    if (deficiency <= 1 && (offeredIsWild || offeredMatchesSingleton)) {
      return {
        primaryAction: `PICK OFFERED DISCARD (${cardToSymbol(offeredCard)}) AND DECLARE "JUT!" TO WIN!`,
        isInstantWin: true,
        isWinningDeclaration: true,
        winType: 'Jut',
        confidenceScore: 100,
        cardsToHighlight: [offeredCard.id],
        breakdown: [
          { label: 'Winning Move', value: `Picking ${cardToSymbol(offeredCard)} pairs all remaining cards!` },
          { label: 'Pair Formed', value: offeredIsWild ? `Wildcard pairs with ${singletons[0] ? cardToSymbol(singletons[0]) : 'wild'}` : `Pairs with ${offeredCard.rank}` },
          { label: 'Wildcards', value: `${wildCount + (offeredIsWild ? 1 : 0)}` },
        ],
      };
    }

    if (offeredIsWild || offeredMatchesSingleton) {
      return {
        primaryAction: `PICK OFFERED DISCARD (${cardToSymbol(offeredCard)})`,
        secondaryAction: offeredIsWild ? 'Guaranteed wildcard pickup' : `Pairs with your singleton ${offeredCard.rank}`,
        confidenceScore: 95,
        cardsToHighlight: [offeredCard.id],
        breakdown: [
          { label: 'Recommendation', value: `Take ${cardToSymbol(offeredCard)} to create a new pair` },
          { label: 'Remaining Singletons after Pick', value: `${Math.max(0, singletons.length - 1)}` },
          { label: 'Wild Rank', value: wildRank || 'N/A' },
        ],
      };
    }

    return {
      primaryAction: 'DRAW FROM FACE-DOWN STOCK (GADDI)',
      secondaryAction: `Do not take ${cardToSymbol(offeredCard)} (adds useless deadwood singleton)`,
      confidenceScore: 90,
      breakdown: [
        { label: 'Stock Draw Advice', value: `${cardToSymbol(offeredCard)} does not match any singleton in hand.` },
        { label: 'Unpaired Singletons', value: singletons.map(cardToSymbol).join(', ') || 'None' },
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
    // If just picked offered card from floor, cannot discard that exact card
    const isIllegal = justPickedOfferedCard && offeredCard && offeredCard.rank === card.rank && offeredCard.suit === card.suit;

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
