import React from 'react';
import type { Card } from '../types/cards';
import { cardToSymbol } from '../utils/cardUtils';
import { ArrowDownToLine, ArrowUpFromLine, RotateCcw, Plus } from 'lucide-react';

interface TurnStateControllerProps {
  turnNumber: number;
  offeredCard: Card | null;
  recommendedDiscardCard: Card | null;
  onPickStock: () => void;
  onPickOfferedCard: () => void;
  onDiscardCard: (card: Card) => void;
  onResetHand: () => void;
}

export const TurnStateController: React.FC<TurnStateControllerProps> = ({
  turnNumber,
  offeredCard,
  recommendedDiscardCard,
  onPickStock,
  onPickOfferedCard,
  onDiscardCard,
  onResetHand,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-md flex flex-wrap items-center justify-between gap-2.5">
      <div className="flex items-center gap-2">
        <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-extrabold text-xs rounded-xl">
          Turn #{turnNumber}
        </span>
        <span className="text-xs text-slate-400 font-semibold hidden sm:inline">
          Live Tap-Off Mode (No camera needed on turns)
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Draw from Stock */}
        <button
          onClick={onPickStock}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 text-xs font-bold text-slate-200 rounded-xl transition-all shadow-xs"
        >
          <Plus className="w-3.5 h-3.5 text-blue-400" />
          + Draw Stock Card
        </button>

        {/* Pick Floor Card */}
        {offeredCard && (
          <button
            onClick={onPickOfferedCard}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 active:scale-95 border border-amber-400/40 text-xs font-extrabold text-amber-300 rounded-xl transition-all shadow-xs"
          >
            <ArrowDownToLine className="w-3.5 h-3.5 text-amber-400" />
            + Take {cardToSymbol(offeredCard)}
          </button>
        )}

        {/* Discard Recommended Card */}
        {recommendedDiscardCard && (
          <button
            onClick={() => onDiscardCard(recommendedDiscardCard)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 active:scale-95 border border-rose-500/40 text-xs font-bold text-rose-300 rounded-xl transition-all shadow-xs"
          >
            <ArrowUpFromLine className="w-3.5 h-3.5 text-rose-400" />
            - Discard {cardToSymbol(recommendedDiscardCard)}
          </button>
        )}

        {/* Reset Deal */}
        <button
          onClick={onResetHand}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          title="Reset Hand / New Deal"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
