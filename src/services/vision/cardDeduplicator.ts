import type { Card, DetectedCardBox, GameType } from '../../types/cards';
import { createCard, parseCardString } from '../../utils/cardUtils';

export interface DeduplicationOptions {
  gameType: GameType;
  confidenceThreshold?: number; // default 0.60
  expectedCount?: number;
}

export function deduplicateDetectedCards(
  boxes: DetectedCardBox[],
  options: DeduplicationOptions
): { cards: Card[]; warnings: string[] } {
  const minConfidence = options.confidenceThreshold ?? 0.60;
  const warnings: string[] = [];

  // Filter low-confidence detections
  const confidentBoxes = boxes.filter(b => b.confidence >= minConfidence);

  if (confidentBoxes.length < boxes.length) {
    warnings.push(`Filtered out ${boxes.length - confidentBoxes.length} low-confidence detections (<${Math.round(minConfidence * 100)}%).`);
  }

  // Sort boxes left-to-right (by x coordinate)
  const sortedBoxes = [...confidentBoxes].sort((a, b) => a.x - b.x);

  // In Single-Deck Games: strictly 1 copy of each (rank, suit) allowed
  const isMultiDeck = options.gameType === 'marriage';

  const validCards: Card[] = [];
  const seenClassKeys = new Set<string>();

  for (let i = 0; i < sortedBoxes.length; i++) {
    const box = sortedBoxes[i];
    const card = parseCardString(box.class);
    if (!card) continue;

    const classKey = `${card.rank}_${card.suit}`;

    if (!isMultiDeck) {
      if (seenClassKeys.has(classKey)) {
        // Corner deduplication: top-most card exposes top-left and bottom-right indices
        continue;
      }
      seenClassKeys.add(classKey);
      validCards.push(createCard(card.rank, card.suit));
    } else {
      // In Marriage (3 decks): up to 3 identical copies are valid (Tunnella)
      // Check spatial corner deduplication: if two identical boxes share approximately the same x_c
      // but one is vertically lower (bottom corner of same card), deduplicate it.
      const isDuplicateCorner = sortedBoxes.some((other, j) => {
        if (i === j) return false;
        if (other.class !== box.class) return false;
        const xDiff = Math.abs(other.x - box.x);
        const yDiff = box.y - other.y;
        // Same horizontal column, but vertically separated
        return xDiff < 30 && yDiff > 35;
      });

      if (!isDuplicateCorner) {
        // Limit max 3 copies of same card (3 decks)
        const currentCount = validCards.filter(c => c.rank === card.rank && c.suit === card.suit).length;
        if (currentCount < 3) {
          validCards.push(createCard(card.rank, card.suit));
        }
      }
    }
  }

  // Check expected count
  if (options.expectedCount && validCards.length !== options.expectedCount) {
    warnings.push(`Detected ${validCards.length} cards, but ${options.gameType.toUpperCase()} expects ${options.expectedCount} cards.`);
  }

  return { cards: validCards, warnings };
}
