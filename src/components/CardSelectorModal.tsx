import React from 'react';
import type { Card, Rank, Suit } from '../types/cards';
import { ALL_RANKS, ALL_SUITS, createCard, SUIT_COLORS, SUIT_SYMBOLS } from '../utils/cardUtils';
import { X } from 'lucide-react';

interface CardSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCard: (card: Card) => void;
  title?: string;
  subtitle?: string;
}

export const CardSelectorModal: React.FC<CardSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectCard,
  title = 'Select a Card',
  subtitle = 'Tap any card below',
}) => {
  if (!isOpen) return null;

  const handleSelect = (rank: Rank, suit: Suit) => {
    const card = createCard(rank, suit);
    onSelectCard(card);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-extrabold text-base text-amber-400">{title}</h3>
            <p className="text-xs text-slate-400">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 52-Card Matrix by Suit */}
        <div className="space-y-3">
          {ALL_SUITS.map(suit => {
            const isRed = SUIT_COLORS[suit] === 'red';
            const symbol = SUIT_SYMBOLS[suit];

            return (
              <div key={suit} className="flex items-center gap-2">
                <span className={`w-6 text-center font-bold text-lg ${isRed ? 'text-red-500' : 'text-slate-300'}`}>
                  {symbol}
                </span>

                <div className="grid grid-cols-13 gap-1 flex-1">
                  {ALL_RANKS.map(rank => (
                    <button
                      key={rank}
                      onClick={() => handleSelect(rank, suit)}
                      className={`
                        h-9 flex flex-col items-center justify-center rounded-md border
                        transition-transform active:scale-90 hover:scale-105 font-bold text-xs
                        border-slate-700 bg-slate-800 hover:bg-slate-700
                        ${isRed ? 'text-red-400 hover:border-red-500' : 'text-slate-200 hover:border-amber-400'}
                      `}
                    >
                      <span>{rank}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
