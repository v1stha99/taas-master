import React from 'react';
import type { Card } from '../types/cards';
import { cardToSymbol } from '../utils/cardUtils';
import { ArrowDownToLine, ArrowUpFromLine, RotateCcw, Plus, Layers } from 'lucide-react';

interface TurnStateControllerProps {
  turnNumber: number;
  offeredCard: Card | null;
  recommendedDiscardCard: Card | null;
  onPickStock: () => void;
  onPickOfferedCard: () => void;
  onDiscardCard: (card: Card) => void;
  onResetHand: () => void;
  onOpenFloorSelector?: () => void;
}

export const TurnStateController: React.FC<TurnStateControllerProps> = ({
  turnNumber,
  offeredCard,
  recommendedDiscardCard,
  onPickStock,
  onPickOfferedCard,
  onDiscardCard,
  onResetHand,
  onOpenFloorSelector,
}) => {
  return (
    <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-xs rounded-xl flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            TURN #{turnNumber}
          </span>
          <span className="text-xs font-bold text-slate-300">
            {recommendedDiscardCard ? 'Phase: Picked card → Ready to Discard' : 'Phase: Draw or Pick a Card'}
          </span>
        </div>

        <button
          onClick={onResetHand}
          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition-all font-semibold"
          title="Reset Hand / New Deal"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>New Deal</span>
        </button>
      </div>

      {/* Prominent Mobile Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Draw from Stock Card */}
        <button
          onClick={onPickStock}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-500 active:scale-98 text-white font-black text-xs rounded-2xl shadow-lg shadow-blue-950/40 transition-all"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>+ DRAW STOCK CARD (GADDI)</span>
        </button>

        {/* Take Floor Card (or Set Floor Card if none) */}
        {offeredCard ? (
          <button
            onClick={onPickOfferedCard}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 active:scale-98 text-slate-950 font-black text-xs rounded-2xl shadow-lg shadow-amber-950/40 transition-all"
          >
            <ArrowDownToLine className="w-4 h-4 text-slate-950" />
            <span>+ TAKE FLOOR CARD ({cardToSymbol(offeredCard)})</span>
          </button>
        ) : (
          <button
            onClick={onOpenFloorSelector}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 active:scale-98 border border-dashed border-slate-600 text-slate-300 font-bold text-xs rounded-2xl transition-all"
          >
            <ArrowDownToLine className="w-4 h-4 text-amber-400" />
            <span>+ SET FLOOR CARD FIRST</span>
          </button>
        )}
      </div>

      {/* Discard Button (Shows when ready to discard) */}
      {recommendedDiscardCard && (
        <div className="pt-2 border-t border-slate-800">
          <button
            onClick={() => onDiscardCard(recommendedDiscardCard)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:scale-98 text-white font-black text-xs rounded-2xl shadow-lg shadow-rose-950/50 transition-all animate-pulse"
          >
            <ArrowUpFromLine className="w-4 h-4 text-white" />
            <span>- THROW / DISCARD {cardToSymbol(recommendedDiscardCard)}</span>
          </button>
        </div>
      )}
    </div>
  );
};
