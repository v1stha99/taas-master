import React from 'react';
import type { Card, GameType } from '../types/cards';
import { CardChip } from './CardChip';
import { Plus, Trash2 } from 'lucide-react';
import { sortCards } from '../utils/cardUtils';

interface CardTrayProps {
  hand: Card[];
  gameType: GameType;
  highlightedCardIds?: string[];
  discardTargetCardIds?: string[];
  suggestedMelds?: Card[][];
  onUpdateCard: (updated: Card) => void;
  onRemoveCard: (id: string) => void;
  onOpenCardSelector: () => void;
  onClearHand: () => void;
}

export const CardTray: React.FC<CardTrayProps> = ({
  hand,
  gameType,
  highlightedCardIds = [],
  discardTargetCardIds = [],
  suggestedMelds,
  onUpdateCard,
  onRemoveCard,
  onOpenCardSelector,
  onClearHand,
}) => {
  const getExpectedCount = (): number => {
    switch (gameType) {
      case 'jutpatti': return 5;
      case 'kitti': return 9;
      case 'marriage': return 21;
      case 'dhumbal': return 5;
      case 'callbreak': return 13;
      case 'faras': return 3;
      case 'inbetween': return 0; // Hand is boundary cards
    }
  };

  const expected = getExpectedCount();
  const sorted = sortCards(hand);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl">
      {/* Tray Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-extrabold text-sm text-slate-200 uppercase tracking-wider">
            Your Hand Cards
          </h3>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              expected > 0 && hand.length === expected
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {hand.length} {expected > 0 ? `/ ${expected}` : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCardSelector}
            className="flex items-center gap-1 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 border border-amber-500/30 rounded-xl text-xs font-extrabold text-amber-400 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Card
          </button>

          {hand.length > 0 && (
            <button
              onClick={onClearHand}
              className="p-1.5 hover:bg-rose-950/40 border border-transparent hover:border-rose-900 rounded-xl text-slate-500 hover:text-rose-400 transition-all"
              title="Clear all cards"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {hand.length === 0 && (
        <div className="py-10 text-center space-y-3">
          <div className="text-4xl">🃏</div>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            No cards in hand yet. Use <span className="text-amber-400 font-bold">"Scan Hand"</span> or tap <span className="text-amber-400 font-bold">"Add Card"</span> to begin.
          </p>
        </div>
      )}

      {/* Suggested Melds View (e.g. Kitti 3x3 split or Marriage pure groups) */}
      {suggestedMelds && suggestedMelds.length > 0 ? (
        <div className="space-y-3">
          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wide">
            Optimal Card Partitions
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {suggestedMelds.map((meld, mIdx) => (
              <div
                key={mIdx}
                className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-2"
              >
                <div className="text-[11px] font-extrabold text-slate-400 uppercase flex items-center justify-between">
                  <span>Group #{mIdx + 1}</span>
                  <span className="text-amber-400/90 font-mono text-[10px]">{meld.length} Cards</span>
                </div>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {meld.map(c => (
                    <CardChip
                      key={c.id}
                      card={c}
                      size="sm"
                      isHighlighted={highlightedCardIds.includes(c.id)}
                      isDiscardTarget={discardTargetCardIds.includes(c.id)}
                      onUpdate={onUpdateCard}
                      onRemove={() => onRemoveCard(c.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Regular Sorted Hand View */
        hand.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center py-1">
            {sorted.map(c => (
              <CardChip
                key={c.id}
                card={c}
                size={gameType === 'marriage' ? 'sm' : 'md'}
                isHighlighted={highlightedCardIds.includes(c.id)}
                isDiscardTarget={discardTargetCardIds.includes(c.id)}
                onUpdate={onUpdateCard}
                onRemove={() => onRemoveCard(c.id)}
              />
            ))}
          </div>
        )
      )}

      {hand.length > 0 && (
        <div className="text-center text-[11px] text-slate-500 pt-1">
          💡 Tap any card to flip suits (♠ ↔ ♣), fix A ↔ 4, or change ranks.
        </div>
      )}
    </div>
  );
};
