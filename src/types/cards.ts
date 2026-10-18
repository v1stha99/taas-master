// Card Ranks and Suits
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
export type Suit = 'S' | 'H' | 'D' | 'C'; // Spades, Hearts, Diamonds, Clubs

export interface Card {
  id: string; // Unique identifier (useful in multi-deck games like Marriage where identical cards exist)
  rank: Rank;
  suit: Suit;
  isWildcard?: boolean;
  isMaal?: boolean;
  maalValue?: number;
}

export type GameType = 
  | 'jutpatti' 
  | 'marriage' 
  | 'kitti' 
  | 'dhumbal' 
  | 'callbreak' 
  | 'faras' 
  | 'inbetween';

// Bounding box detection from vision models
export interface DetectedCardBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class: string; // e.g. "10H", "AS", "KD"
}

// Rule Configurations for each game
export interface JutpattiRules {
  wildRule: 'minus1' | 'plus1' | 'same'; // Nepali.games (-1) vs Bhoos (+1) vs Same
  handSize: 5 | 7;
}

export interface MarriageRules {
  phase: 1 | 2; // Phase 1 (Pure) vs Phase 2 (Dirty - Seen Tiplu)
  tipluCard: Card | null;
  includeAlter: boolean; // Same rank & color, opposite suit
  includeSuperman: boolean; // Extra printed jokers
  murderRule: boolean; // Un-opened players lose all Maal
  kidnapRule: boolean; // Winner confiscates un-opened players' Maal
}

export interface KittiRules {
  ruleVariant: 'standard' | 'twoInARow';
  salamiRule: boolean;
  aceLowInRun: boolean; // whether A-2-3 is lowest run or 2nd highest
  numOpponents: number; // 1 to 4
}

export interface DhumbalRules {
  jackValue: 'zero' | 'ten' | 'eleven'; // Nepali Zero-Jack vs Flat-10 vs Ascending
  callThreshold: 5 | 10;
  includeJokers: boolean;
  canPickFloorFirstTurn: boolean;
}

export interface CallbreakRules {
  minBid: 1 | 2;
  penaltyMultiplier: 1; // standard -B penalty
}

export interface FarasRules {
  playerType: 'seen' | 'blind';
  numOpponents: number;
}

export interface InBetweenRules {
  boundaryPostLoss: boolean; // default true in standard rules
}

// Recommended Action output from deterministic solvers
export interface SolverRecommendation {
  primaryAction: string; // e.g., "PICK OFFERED CARD AND DECLARE JUT!"
  secondaryAction?: string; // e.g., "Optimal Discard: Jack of Spades"
  isInstantWin?: boolean;
  isWinningDeclaration?: boolean;
  winType?: 'Jut' | 'Jhyap' | 'Salami' | 'Chauka' | 'FourPairs' | 'MarriageShow';
  confidenceScore?: number; // 0 to 100%
  breakdown: {
    label: string;
    value: string;
  }[];
  cardsToHighlight?: string[]; // IDs or card strings
  cardsToDiscard?: string[]; // IDs or card strings
  suggestedMelds?: Card[][]; // Organized groups for display
  warning?: string;
}
