import { parseCardString } from '../src/utils/cardUtils';
import { solveJutpatti } from '../src/solvers/jutpatti';
import { solveKitti } from '../src/solvers/kitti';
import { solveMarriage, evaluateMaalInfo } from '../src/solvers/marriage';
import { solveDhumbal, calculateDhumbalHandSum } from '../src/solvers/dhumbal';
import { solveCallbreak, calculateCallbreakFloorBid, determineLegalCallbreakPlays } from '../src/solvers/callbreak';
import { solveFaras, solveInBetween, evaluateFarasHand } from '../src/solvers/faras';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

console.log('====================================================');
console.log('🧪 VERIFYING DETERMINISTIC GAME-THEORY SOLVERS');
console.log('====================================================\n');

// 1. JUTPATTI VERIFICATION
console.log('--- 1. Jutpatti Solver Tests ---');
const jutHand = ['7H', '7S', '9D', '9C', 'JH'].map(s => parseCardString(s)!);
const flipped = parseCardString('5H')!; // +1 rule means 6 is wild
const offeredWin = parseCardString('JS')!;

const jutResultWin = solveJutpatti({
  hand: jutHand,
  flippedCard: flipped,
  offeredCard: offeredWin,
  phase: 'draw',
  discardHistory: [],
  nextPlayerPickups: [],
  justPickedOfferedCard: false,
}, { wildRule: 'plus1', handSize: 5 });

assert(jutResultWin.isWinningDeclaration === true, 'Jutpatti detects instant winning pickup and declaration');
console.log(`Jutpatti Action: ${jutResultWin.primaryAction}`);

// Discard phase safety
const jutHand6 = ['7H', '7S', '9D', '9C', 'JH', '2C'].map(s => parseCardString(s)!);
const jutDiscard = solveJutpatti({
  hand: jutHand6,
  flippedCard: flipped,
  offeredCard: null,
  phase: 'discard',
  discardHistory: [parseCardString('2D')!, parseCardString('2S')!], // 2 2s already dead
  nextPlayerPickups: [parseCardString('JH')!], // Next player wants J
  justPickedOfferedCard: false,
}, { wildRule: 'plus1', handSize: 5 });

console.log(`Jutpatti Discard Result: ${jutDiscard.primaryAction}`);
assert(jutDiscard.primaryAction.includes('2') && jutDiscard.cardsToDiscard?.[0] === jutHand6[5].id, 'Jutpatti discards 2♣ (dead in discard, avoids feeding Jack to next player)');

// Pair throw test: Opponent throws pair of 6s (6C, 6S)
const pairThrowResult = solveJutpatti({
  hand: ['7H', '7S', '9D', '9C', '6H'].map(s => parseCardString(s)!),
  flippedCard: parseCardString('AH')!, // King is wild
  offeredCards: [parseCardString('6C')!, parseCardString('6S')!], // Opponent threw a pair of 6s
  phase: 'draw',
  discardHistory: [],
  nextPlayerPickups: [],
  justPickedOfferedCard: false,
}, { wildRule: 'plus1', handSize: 5 });

assert(pairThrowResult.isWinningDeclaration === true, 'Jutpatti detects instant win by picking one card from opponent pair of 6s');
console.log(`Jutpatti Pair-Throw Response: ${pairThrowResult.primaryAction}`);

// 2. KITTI VERIFICATION (Document Benchmark Hand)
console.log('\n--- 2. Kitti 280-Partition Solver Tests ---');
// Benchmark hand: [5H, 6H, 7H, 7S, 7D, KH, KD, 9C, 2S]
const kittiHand = ['5H', '6H', '7H', '7S', '7D', 'KH', 'KD', '9C', '2S'].map(s => parseCardString(s)!);
const kittiResult = solveKitti(kittiHand, {
  ruleVariant: 'standard',
  salamiRule: true,
  aceLowInRun: true,
  numOpponents: 3,
});

assert(kittiResult.confidenceScore! >= 90, `Kitti optimal partition achieves >90% win equity (Got: ${kittiResult.confidenceScore}%)`);
console.log(`Kitti Optimal Split: ${kittiResult.primaryAction}`);
console.log(`H1, H2, H3: ${kittiResult.secondaryAction}`);
assert(kittiResult.suggestedMelds !== undefined && kittiResult.suggestedMelds.length === 3, 'Kitti returns exactly 3 split hands');

// Check Chauka instant win
const chaukaHand = ['7H', '7S', '7D', '7C', 'KH', 'KD', '9C', '2S', '3D'].map(s => parseCardString(s)!);
const chaukaResult = solveKitti(chaukaHand, {
  ruleVariant: 'standard',
  salamiRule: true,
  aceLowInRun: true,
  numOpponents: 3,
});
assert(chaukaResult.winType === 'Chauka', 'Kitti detects instant Four-of-a-kind (Chauka) pot win');

// 3. MARRIAGE VERIFICATION
console.log('\n--- 3. Marriage (21 Cards) Solver Tests ---');
// Pure sets test
const pureSetHand = [
  '4S', '5S', '6S',
  '9H', '10H', 'JH',
  'QD', 'KD', 'AD', // Ace-high pure sequence
  '2C', '3C', '7C', '8C', '10C', 'JC', 'QC',
  '2D', '3D', '7D', '9S', 'KS',
].map(s => parseCardString(s)!);

const marriageResult = solveMarriage({
  hand: pureSetHand,
  offeredCard: null,
  phase: 1,
  tipluCard: null,
  turnNumber: 2,
  justPickedOfferedCard: false,
  opponentSeenTipluPickups: [],
}, {
  phase: 1,
  tipluCard: null,
  includeAlter: true,
  includeSuperman: false,
  murderRule: true,
  kidnapRule: true,
});

assert(marriageResult.primaryAction.includes('SHOW 3 PURE SETS'), 'Marriage detects 3 pure sequences completed for Phase 1');
console.log(`Marriage Phase 1: ${marriageResult.primaryAction}`);

// Maal evaluation
const tiplu = parseCardString('8D')!;
const maalInfo = evaluateMaalInfo(tiplu, true);
assert(maalInfo.popluRank === '9', 'Poplu of 8 is 9');
assert(maalInfo.jhipluRank === '7', 'Jhiplu of 8 is 7');
assert(maalInfo.alterSuit === 'H', 'Alter of Diamond is Heart (same color opposite suit)');

// 4. DHUMBAL VERIFICATION
console.log('\n--- 4. Dhumbal (Jhyap) Solver Tests ---');
const dhumbalHandSafe = ['JH', '2S', '3D'].map(s => parseCardString(s)!);
const sumZeroJack = calculateDhumbalHandSum(dhumbalHandSafe, {
  jackValue: 'zero',
  callThreshold: 5,
  includeJokers: true,
  canPickFloorFirstTurn: true,
});
assert(sumZeroJack === 5, `Zero-Jack calculates Jack as 0 pts (Sum: ${sumZeroJack})`);

const dhumbalCall = solveDhumbal({
  hand: dhumbalHandSafe,
  offeredCard: null,
  turnNumber: 1,
  opponentHandSizes: [5, 5, 5],
  isTurnStart: true,
  hasThrownMultiCard: false,
}, {
  jackValue: 'zero',
  callThreshold: 5,
  includeJokers: true,
  canPickFloorFirstTurn: true,
});
assert(dhumbalCall.winType === 'Jhyap', 'Dhumbal recommends calling Jhyap on turn 1 at 5 points');
console.log(`Dhumbal Action: ${dhumbalCall.primaryAction}`);

// Multi-card sequence throw test
const dhumbalThrowHand = ['4S', '5S', '6S', 'KC', 'QD'].map(s => parseCardString(s)!);
const dhumbalThrow = solveDhumbal({
  hand: dhumbalThrowHand,
  offeredCard: parseCardString('AS')!,
  turnNumber: 3,
  opponentHandSizes: [4, 4, 3],
  isTurnStart: false,
  hasThrownMultiCard: false,
}, {
  jackValue: 'zero',
  callThreshold: 5,
  includeJokers: true,
  canPickFloorFirstTurn: true,
});
console.log(`Dhumbal Throw Result: ${dhumbalThrow.primaryAction}`);
assert(dhumbalThrow.cardsToDiscard?.length === 3 && dhumbalThrow.primaryAction.includes('SHED 15 PTS'), 'Dhumbal throws 3-card sequence shedding 15 points');

// 5. CALLBREAK VERIFICATION
console.log('\n--- 5. Callbreak Floor Bidding & Play Tests ---');
const callbreakHand = [
  'AS', 'KS', 'QS', '2S', // 4 Spades: AS(1) + KS(1) + QS(0.75) = 2.75
  'AH', '4H',             // AH in length 2 = 1.0
  'AD', '5D',             // AD in length 2 = 1.0
  'AC', '2C', '3C', '4C', '5C', // AC in length 5 = 1.0
].map(s => parseCardString(s)!);

const bidInfo = calculateCallbreakFloorBid(callbreakHand, 1);
assert(bidInfo.bid === 5, `Floor bid calculated as 5 tricks (Raw score: ${bidInfo.rawCount})`);
console.log(`Callbreak Bid: ${bidInfo.bid} tricks (Score: ${bidInfo.rawCount.toFixed(2)})`);

// Mandatory follow and mandatory upgrade test
const cbTrickHand = ['10H', 'KH', '4S'].map(s => parseCardString(s)!);
const legalPlays = determineLegalCallbreakPlays(
  cbTrickHand,
  'H', // Led suit is Hearts
  [{ playerIndex: 0, card: parseCardString('JH')! }] // JH is current winning card
);
// KH is higher than JH -> must upgrade! 10H cannot be played because KH is higher
assert(legalPlays.legalCardIds.length === 1 && legalPlays.legalCardIds[0] === cbTrickHand[1].id, 'Mandatory upgrade forces playing KH over JH');
console.log('Callbreak Mandatory Upgrade: Successfully enforced playing KH over JH');

// 6. FARAS & IN-BETWEEN VERIFICATION
console.log('\n--- 6. Faras (Teen Patti) & In-Between Tests ---');
const trioAAA = ['AS', 'AH', 'AD'].map(s => parseCardString(s)!);
const farasEval = evaluateFarasHand(trioAAA);
assert(farasEval.handType === 'trail', 'Trio AAA identified as Trail');
assert(farasEval.percentile >= 99.7, 'Trail has >99.7% equity');

const inBetweenAggressive = solveInBetween(parseCardString('2S')!, parseCardString('KD')!); // Gap: 13 - 2 = 11, interior ranks = 10 -> 40/50 = 80%
assert(inBetweenAggressive.primaryAction.includes('FAVORABLE ODDS'), 'In-Between detects favorable odds on wide spread');
console.log(`In-Between Action: ${inBetweenAggressive.primaryAction} (${inBetweenAggressive.secondaryAction})`);

console.log('\n====================================================');
console.log('🎉 ALL 6 DASHIN GAME-THEORY SOLVERS PASSED BENCHMARKS!');
console.log('====================================================');
