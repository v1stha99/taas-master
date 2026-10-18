import React from 'react';
import type { Card } from '../types/cards';
import { cardToSymbol } from '../utils/cardUtils';
import { ArrowDownToLine, ArrowUpFromLine, RotateCcw, Layers, Package, ArrowRightLeft } from 'lucide-react';
interface TurnStateControllerProps {
  turnNumber: number;
  offeredCard?: Card | null;
  offeredCards?: Card[];
  recommendedDiscardCard: Card | null;
  currentPhase: 'draw' | 'discard';
  onPickStock: () => void;
  onPickOfferedCard: (card?: Card) => void;
  onPickAllOfferedCards?: () => void;
  onDiscardCard: (card: Card) => void;
  onResetHand: () => void;
  onOpenFloorSelector?: () => void;
  onTogglePhase?: () => void;
}

export const TurnStateController: React.FC<TurnStateControllerProps> = ({
  turnNumber,
  offeredCard,
  offeredCards = [],
  recommendedDiscardCard,
  currentPhase,
  onPickStock,
  onPickOfferedCard,
  onPickAllOfferedCards,
  onDiscardCard,
  onResetHand,
  onOpenFloorSelector,
  onTogglePhase,
}) => {
  const isDiscardPhase = currentPhase === 'discard';
  const effectiveFloorCards = offeredCards.length > 0 ? offeredCards : (offeredCard ? [offeredCard] : []);

  return (
    <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3.5">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-xs rounded-xl flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            TURN #{turnNumber}
          </span>
          <span className="text-xs font-bold text-slate-300">
            {isDiscardPhase ? 'Phase: Ready to Throw / Discard' : 'Phase: Draw from Pile or Pick Floor'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {onTogglePhase && (
            <button
              onClick={onTogglePhase}
              className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 transition-all font-bold"
              title="Switch between Draw and Discard phase"
            >
              <ArrowRightLeft className="w-3 h-3" />
              <span>{isDiscardPhase ? 'Need to Draw' : "Throw First"}</span>
            </button>
          )}

          <button
            onClick={onResetHand}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition-all font-semibold"
            title="Reset Hand / New Deal"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Deal</span>
          </button>
        </div>
      </div>

      {/* DRAW PHASE CONTROLS */}
      {!isDiscardPhase ? (
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* 1. Pick from deck pile (Gaddi) */}
            <button
              onClick={onPickStock}
              className="w-full flex flex-col items-center justify-center py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-98 text-white rounded-2xl shadow-lg shadow-blue-950/40 transition-all border border-blue-400/30"
            >
              <div className="flex items-center gap-2 font-black text-xs tracking-wide">
                <Package className="w-4 h-4 text-blue-200" />
                <span>DRAW FROM DECK PILE (GADDI)</span>
              </div>
              <span className="text-[10px] text-blue-200/80 mt-0.5 font-medium">
                Floor card doesn't help? Draw 1 blind card from the pile
              </span>
            </button>

            {/* 2. Take Floor cards (Single card or Pair) */}
            {effectiveFloorCards.length >= 2 ? (
              <div className="flex flex-col gap-2 w-full">
                <button
                  onClick={() => onPickAllOfferedCards ? onPickAllOfferedCards() : onPickOfferedCard(effectiveFloorCards[0])}
                  className="w-full flex flex-col items-center justify-center py-2.5 px-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 active:scale-98 text-slate-950 rounded-2xl shadow-lg border border-yellow-300 transition-all"
                >
                  <div className="flex items-center gap-2 font-black text-xs">
                    <ArrowDownToLine className="w-4 h-4 text-slate-950" />
                    <span>TAKE PAIR [{effectiveFloorCards.map(cardToSymbol).join(' + ')}]</span>
                  </div>
                  <span className="text-[10px] text-slate-900/80 font-bold mt-0.5">
                    Pick both cards of opponent's pair
                  </span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  {effectiveFloorCards.map(c => (
                    <button
                      key={c.id}
                      onClick={() => onPickOfferedCard(c)}
                      className="py-2 px-2 bg-slate-800 hover:bg-slate-700 active:scale-95 border border-amber-400/40 text-amber-300 font-bold text-xs rounded-xl truncate"
                    >
                      + Take {cardToSymbol(c)} Only
                    </button>
                  ))}
                </div>
              </div>
            ) : effectiveFloorCards.length === 1 ? (
              <button
                onClick={() => onPickOfferedCard(effectiveFloorCards[0])}
                className="w-full flex flex-col items-center justify-center py-3.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 active:scale-98 text-slate-950 rounded-2xl shadow-lg shadow-amber-950/40 transition-all border border-yellow-300"
              >
                <div className="flex items-center gap-2 font-black text-xs tracking-wide">
                  <ArrowDownToLine className="w-4 h-4 text-slate-950" />
                  <span>TAKE FLOOR CARD ({cardToSymbol(effectiveFloorCards[0])})</span>
                </div>
                <span className="text-[10px] text-slate-900/80 mt-0.5 font-semibold">
                  Pick the card thrown by the player before you
                </span>
              </button>
            ) : (
              <button
                onClick={onOpenFloorSelector}
                className="w-full flex flex-col items-center justify-center py-3.5 px-4 bg-slate-800/80 hover:bg-slate-800 active:scale-98 border border-dashed border-slate-600 text-slate-300 rounded-2xl transition-all"
              >
                <div className="flex items-center gap-2 font-bold text-xs text-amber-300">
                  <ArrowDownToLine className="w-4 h-4 text-amber-400" />
                  <span>SET WHAT OPPONENT THREW</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  Opponent threw a card or pair? Tap to set it
                </span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* DISCARD / THROW PHASE CONTROLS */
        <div className="space-y-2">
          {recommendedDiscardCard ? (
            <button
              onClick={() => onDiscardCard(recommendedDiscardCard)}
              className="w-full flex flex-col items-center justify-center py-4 px-4 bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-500 active:scale-98 text-white rounded-2xl shadow-xl shadow-rose-950/60 transition-all border border-rose-400/40 animate-pulse"
            >
              <div className="flex items-center gap-2 font-black text-sm tracking-wide">
                <ArrowUpFromLine className="w-5 h-5 text-white" />
                <span>THROW / DISCARD {cardToSymbol(recommendedDiscardCard)}</span>
              </div>
              <span className="text-[11px] text-rose-100/90 mt-0.5 font-medium">
                Tap to confirm discard and advance to next turn
              </span>
            </button>
          ) : (
            <div className="text-center py-3 text-xs text-slate-400">
              No singletons to discard. You may have a complete winning hand!
            </div>
          )}
        </div>
      )}
    </div>
  );
};
