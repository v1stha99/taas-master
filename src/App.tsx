import { useState, useMemo } from 'react';
import type {
  Card,
  GameType,
  JutpattiRules,
  MarriageRules,
  KittiRules,
  DhumbalRules,
  CallbreakRules,
  FarasRules,
  Suit,
  SolverRecommendation,
} from './types/cards';
import { Header } from './components/Header';
import { CardTray } from './components/CardTray';
import { TableContextBar } from './components/TableContextBar';
import { ActionBanner } from './components/ActionBanner';
import { TurnStateController } from './components/TurnStateController';
import { CameraModal } from './components/CameraModal';
import { CardSelectorModal } from './components/CardSelectorModal';
import { SettingsModal } from './components/SettingsModal';

import { solveJutpatti } from './solvers/jutpatti';
import { solveMarriage } from './solvers/marriage';
import { solveKitti } from './solvers/kitti';
import { solveDhumbal } from './solvers/dhumbal';
import { solveCallbreak } from './solvers/callbreak';
import { solveFaras, solveInBetween } from './solvers/faras';
import { parseCardString } from './utils/cardUtils';

export function App() {
  // Active Game Mode
  const [activeGame, setActiveGame] = useState<GameType>('jutpatti');

  // Player's Hand
  const [hand, setHand] = useState<Card[]>(() => [
    parseCardString('7H')!,
    parseCardString('7S')!,
    parseCardString('9D')!,
    parseCardString('9C')!,
    parseCardString('JH')!,
  ]);

  // Turn tracking & table context
  const [turnNumber, setTurnNumber] = useState(1);
  const [flippedCard, setFlippedCard] = useState<Card | null>(() => parseCardString('5H'));
  const [tipluCard, setTipluCard] = useState<Card | null>(null);
  const [offeredCard, setOfferedCard] = useState<Card | null>(() => parseCardString('JS'));
  const [boundaryCards, setBoundaryCards] = useState<[Card | null, Card | null]>([
    parseCardString('3H'),
    parseCardString('KD'),
  ]);
  const [discardHistory, setDiscardHistory] = useState<Card[]>([]);
  const [nextPlayerPickups] = useState<Card[]>([]);
  const [justPickedOfferedCard, setJustPickedOfferedCard] = useState(false);

  // Callbreak specific state
  const [callbreakPhase, setCallbreakPhase] = useState<'bid' | 'play'>('bid');
  const [callbreakLedSuit, setCallbreakLedSuit] = useState<Suit | null>(null);
  const [callbreakTrickCards, setCallbreakTrickCards] = useState<Card[]>([]);
  const [callbreakBid, setCallbreakBid] = useState(3);
  const [callbreakWon, setCallbreakWon] = useState(0);

  // Rule Sets
  const [jutpattiRules, setJutpattiRules] = useState<JutpattiRules>({
    wildRule: 'plus1',
    handSize: 5,
  });

  const [marriageRules, setMarriageRules] = useState<MarriageRules>({
    phase: 1,
    tipluCard: null,
    includeAlter: true,
    includeSuperman: false,
    murderRule: true,
    kidnapRule: true,
  });

  const [kittiRules] = useState<KittiRules>({
    ruleVariant: 'standard',
    salamiRule: true,
    aceLowInRun: true,
    numOpponents: 3,
  });

  const [dhumbalRules, setDhumbalRules] = useState<DhumbalRules>({
    jackValue: 'zero',
    callThreshold: 5,
    includeJokers: true,
    canPickFloorFirstTurn: true,
  });

  const [callbreakRules] = useState<CallbreakRules>({
    minBid: 1,
    penaltyMultiplier: 1,
  });

  const [farasRules, setFarasRules] = useState<FarasRules>({
    playerType: 'seen',
    numOpponents: 3,
  });

  // Modals state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [cardSelectorConfig, setCardSelectorConfig] = useState<{
    isOpen: boolean;
    target: 'hand' | 'flipped' | 'tiplu' | 'offered' | 'boundary1' | 'boundary2' | 'callbreakTrick';
    title: string;
  }>({
    isOpen: false,
    target: 'hand',
    title: 'Add Card to Hand',
  });

  // Switch Game Preset Default Hands
  const handleSelectGame = (game: GameType) => {
    setActiveGame(game);
    setTurnNumber(1);
    setJustPickedOfferedCard(false);

    let defaultCodes: string[] = [];
    switch (game) {
      case 'jutpatti':
        defaultCodes = ['7H', '7S', '9D', '9C', 'JH'];
        setFlippedCard(parseCardString('5H'));
        setOfferedCard(parseCardString('JS'));
        break;
      case 'kitti':
        defaultCodes = ['5H', '6H', '7H', '7S', '7D', 'KH', 'KD', '9C', '2S'];
        break;
      case 'marriage':
        defaultCodes = [
          '4S', '5S', '6S',
          '9H', '10H', 'JH',
          'QD', 'KD', 'AD',
          '2C', '3C', '7C', '8C', '10C', 'JC', 'QC',
          '2D', '3D', '7D', '9S', 'KS',
        ];
        setTipluCard(null);
        setOfferedCard(parseCardString('10S'));
        break;
      case 'dhumbal':
        defaultCodes = ['JH', '2S', '3D', 'KC', 'QD'];
        setOfferedCard(parseCardString('AS'));
        break;
      case 'callbreak':
        defaultCodes = [
          'AS', 'KS', 'QS', '2S',
          'AH', '4H', 'AD', '5D',
          'AC', '2C', '3C', '4C', '5C',
        ];
        setCallbreakPhase('bid');
        setCallbreakLedSuit(null);
        setCallbreakTrickCards([]);
        break;
      case 'faras':
        defaultCodes = ['AS', 'KS', 'QS'];
        break;
      case 'inbetween':
        defaultCodes = [];
        setBoundaryCards([parseCardString('3H'), parseCardString('KD')]);
        break;
    }

    setHand(defaultCodes.map(s => parseCardString(s)!).filter(Boolean));
  };

  // Real-time Game Solver Execution
  const { recommendation, solveTimeMs } = useMemo(() => {
    const start = performance.now();
    let rec: SolverRecommendation | null = null;

    try {
      switch (activeGame) {
        case 'jutpatti': {
          const isDrawPhase = hand.length % 2 === 1; // 5 or 7 cards means draw phase
          rec = solveJutpatti(
            {
              hand,
              flippedCard,
              offeredCard,
              phase: isDrawPhase ? 'draw' : 'discard',
              discardHistory,
              nextPlayerPickups,
              justPickedOfferedCard,
            },
            jutpattiRules
          );
          break;
        }

        case 'marriage': {
          rec = solveMarriage(
            {
              hand,
              offeredCard,
              phase: marriageRules.phase,
              tipluCard,
              turnNumber,
              justPickedOfferedCard,
              opponentSeenTipluPickups: [],
            },
            {
              ...marriageRules,
              tipluCard,
            }
          );
          break;
        }

        case 'kitti': {
          rec = solveKitti(hand, kittiRules);
          break;
        }

        case 'dhumbal': {
          rec = solveDhumbal(
            {
              hand,
              offeredCard,
              turnNumber,
              opponentHandSizes: [hand.length, 5, 5],
              isTurnStart: turnNumber === 1 || hand.length === 5,
              hasThrownMultiCard: turnNumber > 1,
            },
            dhumbalRules
          );
          break;
        }

        case 'callbreak': {
          rec = solveCallbreak(
            {
              hand,
              phase: callbreakPhase,
              trickNumber: 13 - hand.length + 1,
              ledSuit: callbreakLedSuit,
              currentTrick: callbreakTrickCards.map((c, i) => ({ playerIndex: i, card: c })),
              tricksWon: callbreakWon,
              bidAnnounced: callbreakBid,
            },
            callbreakRules
          );
          break;
        }

        case 'faras': {
          rec = solveFaras(hand, farasRules);
          break;
        }

        case 'inbetween': {
          if (boundaryCards[0] && boundaryCards[1]) {
            rec = solveInBetween(boundaryCards[0], boundaryCards[1]);
          } else {
            rec = {
              primaryAction: 'SELECT 2 BOUNDARY CARDS',
              breakdown: [{ label: 'Status', value: 'Select two cards to compute spread equity' }],
            };
          }
          break;
        }
      }
    } catch (err: any) {
      console.error('Solver execution error:', err);
      rec = {
        primaryAction: 'COMPUTING MOVE...',
        breakdown: [{ label: 'Status', value: err.message || 'Error' }],
      };
    }

    const duration = performance.now() - start;
    return { recommendation: rec, solveTimeMs: duration };
  }, [
    activeGame,
    hand,
    flippedCard,
    tipluCard,
    offeredCard,
    boundaryCards,
    turnNumber,
    justPickedOfferedCard,
    discardHistory,
    nextPlayerPickups,
    jutpattiRules,
    marriageRules,
    kittiRules,
    dhumbalRules,
    callbreakPhase,
    callbreakLedSuit,
    callbreakTrickCards,
    callbreakBid,
    callbreakWon,
    callbreakRules,
    farasRules,
  ]);

  // Card Operations
  const handleUpdateCard = (updated: Card) => {
    setHand(prev => prev.map(c => (c.id === updated.id ? updated : c)));
  };

  const handleRemoveCard = (id: string) => {
    setHand(prev => prev.filter(c => c.id !== id));
  };

  const handleClearHand = () => {
    setHand([]);
  };

  const handleCardsDetected = (cards: Card[]) => {
    setHand(cards);
    setTurnNumber(1);
    setJustPickedOfferedCard(false);
  };

  // Card Selector Modal triggers
  const openSelector = (
    target: 'hand' | 'flipped' | 'tiplu' | 'offered' | 'boundary1' | 'boundary2' | 'callbreakTrick'
  ) => {
    let title = 'Select Card';
    if (target === 'hand') title = 'Add Card to Hand';
    else if (target === 'flipped') title = 'Select Flipped Wildcard';
    else if (target === 'tiplu') title = 'Select Tiplu Card (Phase 2)';
    else if (target === 'offered') title = 'Select Offered Floor Discard';
    else if (target === 'boundary1') title = 'Select Boundary Card 1';
    else if (target === 'boundary2') title = 'Select Boundary Card 2';
    else if (target === 'callbreakTrick') title = 'Select Opponent Trick Card';

    setCardSelectorConfig({
      isOpen: true,
      target,
      title,
    });
  };

  const handleSelectFromModal = (card: Card) => {
    const { target } = cardSelectorConfig;

    if (target === 'hand') {
      setHand(prev => [...prev, card]);
    } else if (target === 'flipped') {
      setFlippedCard(card);
    } else if (target === 'tiplu') {
      setTipluCard(card);
      setMarriageRules(prev => ({ ...prev, phase: 2 }));
    } else if (target === 'offered') {
      setOfferedCard(card);
    } else if (target === 'boundary1') {
      setBoundaryCards(prev => [card, prev[1]]);
    } else if (target === 'boundary2') {
      setBoundaryCards(prev => [prev[0], card]);
    } else if (target === 'callbreakTrick') {
      setCallbreakTrickCards(prev => [...prev, card]);
    }
  };

  // Tap-Off Turn Actions
  const handlePickStock = () => {
    openSelector('hand');
  };

  const handlePickOfferedCard = () => {
    if (!offeredCard) return;
    setHand(prev => [...prev, offeredCard]);
    setOfferedCard(null);
    setJustPickedOfferedCard(true);
  };

  const handleDiscardCard = (card: Card) => {
    setHand(prev => prev.filter(c => c.id !== card.id));
    setDiscardHistory(prev => [...prev, card]);
    setTurnNumber(prev => prev + 1);
    setJustPickedOfferedCard(false);
  };

  // Recommended discard card object from solver
  const recommendedDiscardCard = useMemo(() => {
    if (!recommendation?.cardsToDiscard || recommendation.cardsToDiscard.length === 0) return null;
    const targetId = recommendation.cardsToDiscard[0];
    return hand.find(c => c.id === targetId) || null;
  }, [hand, recommendation]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      <Header
        activeGame={activeGame}
        onSelectGame={handleSelectGame}
        onOpenScan={() => setIsCameraOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
        {/* Sub-50ms Game-Theory Action Recommendation Banner */}
        <ActionBanner
          recommendation={recommendation}
          solveTimeMs={solveTimeMs}
        />

        {/* Turn-by-Turn Tap-Off Controls */}
        <TurnStateController
          turnNumber={turnNumber}
          offeredCard={offeredCard}
          recommendedDiscardCard={recommendedDiscardCard}
          onPickStock={handlePickStock}
          onPickOfferedCard={handlePickOfferedCard}
          onDiscardCard={handleDiscardCard}
          onResetHand={() => handleSelectGame(activeGame)}
          onOpenFloorSelector={() => openSelector('offered')}
        />

        {/* Game-Specific Table Context & Rules */}
        <TableContextBar
          gameType={activeGame}
          flippedCard={flippedCard}
          tipluCard={tipluCard}
          offeredCard={offeredCard}
          boundaryCards={boundaryCards}
          jutpattiRules={jutpattiRules}
          marriageRules={marriageRules}
          dhumbalRules={dhumbalRules}
          callbreakRules={callbreakRules}
          farasRules={farasRules}
          callbreakPhase={callbreakPhase}
          callbreakLedSuit={callbreakLedSuit}
          callbreakTrickCards={callbreakTrickCards}
          callbreakBid={callbreakBid}
          callbreakWon={callbreakWon}
          dhumbalTurn={turnNumber}
          onOpenCardSelector={openSelector}
          onUpdateJutpattiRules={r => setJutpattiRules(prev => ({ ...prev, ...r }))}
          onUpdateMarriageRules={r => setMarriageRules(prev => ({ ...prev, ...r }))}
          onUpdateDhumbalRules={r => setDhumbalRules(prev => ({ ...prev, ...r }))}
          onUpdateFarasRules={r => setFarasRules(prev => ({ ...prev, ...r }))}
          onToggleCallbreakPhase={setCallbreakPhase}
          onSetCallbreakLedSuit={setCallbreakLedSuit}
          onSetCallbreakBid={setCallbreakBid}
          onSetCallbreakWon={setCallbreakWon}
          onClearOfferedCard={() => setOfferedCard(null)}
          onClearCallbreakTrick={() => setCallbreakTrickCards([])}
        />

        {/* Interactive Hand Cards Tray */}
        {activeGame !== 'inbetween' && (
          <CardTray
            hand={hand}
            gameType={activeGame}
            highlightedCardIds={recommendation?.cardsToHighlight}
            discardTargetCardIds={recommendation?.cardsToDiscard}
            suggestedMelds={recommendation?.suggestedMelds}
            onUpdateCard={handleUpdateCard}
            onRemoveCard={handleRemoveCard}
            onOpenCardSelector={() => openSelector('hand')}
            onClearHand={handleClearHand}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-500">
        <p>Dashain Real-Time Card Game Assistant (Taas Master) • sub-5s Turnaround • 100% Client-Side Solvers</p>
      </footer>

      {/* Camera Scanning Modal */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        gameType={activeGame}
        onCardsDetected={handleCardsDetected}
      />

      {/* 52-Card Selection Modal */}
      <CardSelectorModal
        isOpen={cardSelectorConfig.isOpen}
        onClose={() => setCardSelectorConfig(prev => ({ ...prev, isOpen: false }))}
        onSelectCard={handleSelectFromModal}
        title={cardSelectorConfig.title}
      />

      {/* Vision & Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

export default App;
