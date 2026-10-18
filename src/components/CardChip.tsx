import React, { useState } from 'react';
import type { Card, Suit } from '../types/cards';
import { ALL_RANKS, ALL_SUITS, SUIT_COLORS, SUIT_SYMBOLS } from '../utils/cardUtils';
import { X, ArrowLeftRight, Trash2 } from 'lucide-react';

interface CardChipProps {
  card: Card;
  onUpdate?: (updated: Card) => void;
  onRemove?: () => void;
  isHighlighted?: boolean;
  isDiscardTarget?: boolean;
  isWild?: boolean;
  isMaal?: boolean;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

export const CardChip: React.FC<CardChipProps> = ({
  card,
  onUpdate,
  onRemove,
  isHighlighted = false,
  isDiscardTarget = false,
  isWild = false,
  isMaal = false,
  size = 'md',
  interactive = true,
}) => {
  const [showEditor, setShowEditor] = useState(false);

  const isRed = SUIT_COLORS[card.suit] === 'red';
  const symbol = SUIT_SYMBOLS[card.suit];

  const sizeClasses = {
    sm: 'w-10 h-14 text-xs',
    md: 'w-12 h-18 text-sm',
    lg: 'w-16 h-24 text-base font-bold',
  }[size];

  // Quick swap suit (Spades <-> Clubs, Hearts <-> Diamonds)
  const handleQuickSuitSwap = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdate) return;
    const swapMap: Record<Suit, Suit> = {
      S: 'C',
      C: 'S',
      H: 'D',
      D: 'H',
    };
    onUpdate({ ...card, suit: swapMap[card.suit] });
  };

  // Quick swap rank (A <-> 4 optical confusion fix)
  const handleQuickRankSwap = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdate) return;
    if (card.rank === 'A') onUpdate({ ...card, rank: '4' });
    else if (card.rank === '4') onUpdate({ ...card, rank: 'A' });
  };

  return (
    <div className="relative inline-block select-none">
      <div
        onClick={() => interactive && setShowEditor(true)}
        className={`
          ${sizeClasses}
          flex flex-col justify-between p-1 rounded-lg border-2 bg-white shadow-md
          transition-all duration-150 transform active:scale-95
          ${interactive ? 'cursor-pointer hover:-translate-y-1 hover:shadow-lg' : ''}
          ${isHighlighted ? 'ring-3 ring-emerald-400 border-emerald-500 scale-105' : ''}
          ${isDiscardTarget ? 'ring-3 ring-rose-500 border-rose-600 animate-pulse' : ''}
          ${isWild ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}
        `}
      >
        {/* Top-left corner */}
        <div className="flex flex-col items-center leading-none">
          <span className={`font-black ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
            {card.rank}
          </span>
          <span className={`text-xs ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
            {symbol}
          </span>
        </div>

        {/* Center pip / indicator */}
        <div className="flex items-center justify-center">
          {isMaal ? (
            <span className="text-[10px] font-black uppercase tracking-tighter px-1 rounded bg-amber-500 text-black">
              MAAL
            </span>
          ) : isWild ? (
            <span className="text-[10px] font-black uppercase tracking-tighter px-1 rounded bg-purple-600 text-white">
              WILD
            </span>
          ) : (
            <span className={`text-lg opacity-80 ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
              {symbol}
            </span>
          )}
        </div>

        {/* Bottom-right inverted */}
        <div className="flex flex-col items-center leading-none rotate-180">
          <span className={`font-black ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
            {card.rank}
          </span>
          <span className={`text-xs ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
            {symbol}
          </span>
        </div>
      </div>

      {/* Editor Popover Modal */}
      {showEditor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setShowEditor(false)}
        >
          <div
            className="w-full max-w-xs bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-2xl text-white space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-sm text-amber-400">
                Edit Card: {card.rank}{symbol}
              </span>
              <button
                onClick={() => setShowEditor(false)}
                className="p-1 hover:bg-slate-800 rounded-full"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Quick 1-Tap Optical Fixes */}
            <div className="flex gap-2">
              <button
                onClick={handleQuickSuitSwap}
                className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 px-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 font-medium"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-blue-400" />
                Flip {card.suit === 'S' || card.suit === 'C' ? '♠ ↔ ♣' : '♥ ↔ ♦'}
              </button>

              {(card.rank === 'A' || card.rank === '4') && (
                <button
                  onClick={handleQuickRankSwap}
                  className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 px-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 font-medium"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-yellow-400" />
                  Flip {card.rank === 'A' ? 'A → 4' : '4 → A'}
                </button>
              )}
            </div>

            {/* Suit Selector */}
            <div>
              <label className="text-[11px] text-slate-400 uppercase font-semibold">Change Suit</label>
              <div className="grid grid-cols-4 gap-1.5 mt-1">
                {ALL_SUITS.map(s => {
                  const active = card.suit === s;
                  const red = SUIT_COLORS[s] === 'red';
                  return (
                    <button
                      key={s}
                      onClick={() => onUpdate?.({ ...card, suit: s })}
                      className={`py-1.5 text-base font-bold rounded-lg border ${
                        active
                          ? 'border-amber-400 bg-amber-400/20 shadow-xs'
                          : 'border-slate-700 bg-slate-800 hover:bg-slate-700'
                      } ${red ? 'text-red-400' : 'text-slate-200'}`}
                    >
                      {SUIT_SYMBOLS[s]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rank Selector */}
            <div>
              <label className="text-[11px] text-slate-400 uppercase font-semibold">Change Rank</label>
              <div className="grid grid-cols-7 gap-1 mt-1 text-xs">
                {ALL_RANKS.map(r => {
                  const active = card.rank === r;
                  return (
                    <button
                      key={r}
                      onClick={() => onUpdate?.({ ...card, rank: r })}
                      className={`py-1 font-bold rounded border ${
                        active
                          ? 'border-amber-400 bg-amber-400 text-black shadow-xs'
                          : 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                      }`}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2 border-t border-slate-800">
              {onRemove && (
                <button
                  onClick={() => {
                    onRemove();
                    setShowEditor(false);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs bg-rose-950/60 hover:bg-rose-900 border border-rose-700 text-rose-300 rounded-xl font-bold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove Card
                </button>
              )}
              <button
                onClick={() => setShowEditor(false)}
                className="flex-1 py-2 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
