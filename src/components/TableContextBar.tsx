import React from 'react';
import type { Card, GameType, JutpattiRules, MarriageRules, DhumbalRules, CallbreakRules, FarasRules, Suit } from '../types/cards';
import { CardChip } from './CardChip';
import { SUIT_SYMBOLS } from '../utils/cardUtils';
import { Sparkles, PlusCircle } from 'lucide-react';

interface TableContextBarProps {
  gameType: GameType;
  flippedCard: Card | null;
  tipluCard: Card | null;
  offeredCard: Card | null;
  offeredCards?: Card[];
  boundaryCards: [Card | null, Card | null];
  jutpattiRules: JutpattiRules;
  marriageRules: MarriageRules;
  dhumbalRules: DhumbalRules;
  callbreakRules: CallbreakRules;
  farasRules: FarasRules;
  callbreakPhase: 'bid' | 'play';
  callbreakLedSuit: Suit | null;
  callbreakTrickCards: Card[];
  callbreakBid: number;
  callbreakWon: number;
  dhumbalTurn: number;
  onOpenCardSelector: (target: 'flipped' | 'tiplu' | 'offered' | 'boundary1' | 'boundary2' | 'callbreakTrick') => void;
  onUpdateJutpattiRules: (rules: Partial<JutpattiRules>) => void;
  onUpdateMarriageRules: (rules: Partial<MarriageRules>) => void;
  onUpdateDhumbalRules: (rules: Partial<DhumbalRules>) => void;
  onUpdateFarasRules: (rules: Partial<FarasRules>) => void;
  onToggleCallbreakPhase: (phase: 'bid' | 'play') => void;
  onSetCallbreakLedSuit: (suit: Suit | null) => void;
  onSetCallbreakBid: (bid: number) => void;
  onSetCallbreakWon: (won: number) => void;
  onClearOfferedCard: () => void;
  onClearCallbreakTrick: () => void;
}

export const TableContextBar: React.FC<TableContextBarProps> = ({
  gameType,
  flippedCard,
  tipluCard,
  offeredCard,
  offeredCards = [],
  boundaryCards,
  jutpattiRules,
  marriageRules,
  dhumbalRules,
  farasRules,
  callbreakPhase,
  callbreakLedSuit,
  callbreakTrickCards,
  callbreakBid,
  callbreakWon,
  onOpenCardSelector,
  onUpdateJutpattiRules,
  onUpdateMarriageRules,
  onUpdateDhumbalRules,
  onUpdateFarasRules,
  onToggleCallbreakPhase,
  onSetCallbreakLedSuit,
  onSetCallbreakBid,
  onSetCallbreakWon,
  onClearOfferedCard,
  onClearCallbreakTrick,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-3 shadow-md">
      {/* 1. JUTPATTI CONTEXT */}
      {gameType === 'jutpatti' && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Wildcard Flip:</span>
            {flippedCard ? (
              <div className="flex items-center gap-1.5">
                <CardChip card={flippedCard} size="sm" isWild />
                <button
                  onClick={() => onOpenCardSelector('flipped')}
                  className="text-[11px] text-amber-400 hover:underline"
                >
                  Change
                </button>
              </div>
            ) : (
              <button
                onClick={() => onOpenCardSelector('flipped')}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-amber-400"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Select Flipped Card
              </button>
            )}
          </div>

          {/* Rule Selector */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
            <span className="text-slate-500 px-1 font-semibold">Wild:</span>
            <button
              onClick={() => onUpdateJutpattiRules({ wildRule: 'plus1' })}
              className={`px-2 py-0.5 rounded-lg font-bold ${
                jutpattiRules.wildRule === 'plus1' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
              }`}
            >
              +1 Rank (Bhoos)
            </button>
            <button
              onClick={() => onUpdateJutpattiRules({ wildRule: 'minus1' })}
              className={`px-2 py-0.5 rounded-lg font-bold ${
                jutpattiRules.wildRule === 'minus1' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
              }`}
            >
              -1 Rank
            </button>
            <button
              onClick={() => onUpdateJutpattiRules({ wildRule: 'same' })}
              className={`px-2 py-0.5 rounded-lg font-bold ${
                jutpattiRules.wildRule === 'same' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
              }`}
            >
              Same
            </button>
          </div>

          {/* Offered Discard / Pair */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {offeredCards.length > 1 ? 'Floor Pair Thrown:' : 'Floor Card:'}
            </span>
            {offeredCards.length > 0 ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                {offeredCards.map((c, idx) => (
                  <CardChip key={c.id || idx} card={c} size="sm" isHighlighted />
                ))}
                {offeredCards.length < 2 && (
                  <button
                    onClick={() => onOpenCardSelector('offered')}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-bold px-2 py-1 bg-slate-800 rounded-lg border border-slate-700 hover:bg-slate-750"
                  >
                    + Add 2nd Card (Pair)
                  </button>
                )}
                <button
                  onClick={onClearOfferedCard}
                  className="text-[11px] text-rose-400 hover:underline ml-1"
                >
                  Clear
                </button>
              </div>
            ) : (
              <button
                onClick={() => onOpenCardSelector('offered')}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-slate-300"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Set Floor Card / Pair
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. MARRIAGE CONTEXT */}
      {gameType === 'marriage' && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tiplu Card:</span>
            {tipluCard ? (
              <div className="flex items-center gap-1.5">
                <CardChip card={tipluCard} size="sm" isMaal />
                <button
                  onClick={() => onOpenCardSelector('tiplu')}
                  className="text-[11px] text-amber-400 hover:underline"
                >
                  Change
                </button>
              </div>
            ) : (
              <button
                onClick={() => onOpenCardSelector('tiplu')}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 rounded-xl text-xs font-bold text-amber-400"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Enter Tiplu (Phase 2)
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
              <button
                onClick={() => onUpdateMarriageRules({ phase: 1 })}
                className={`px-2.5 py-1 rounded-lg font-bold ${
                  marriageRules.phase === 1 ? 'bg-blue-600 text-white' : 'text-slate-400'
                }`}
              >
                Phase 1 (Pure)
              </button>
              <button
                onClick={() => onUpdateMarriageRules({ phase: 2 })}
                className={`px-2.5 py-1 rounded-lg font-bold ${
                  marriageRules.phase === 2 ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                }`}
              >
                Phase 2 (Seen Tiplu)
              </button>
            </div>

            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
              <button
                onClick={() => onUpdateMarriageRules({ includeAlter: !marriageRules.includeAlter })}
                className={`px-2 py-0.5 rounded-lg font-bold ${
                  marriageRules.includeAlter ? 'bg-purple-600 text-white' : 'text-slate-500'
                }`}
              >
                Alter: {marriageRules.includeAlter ? 'ON (5pt)' : 'OFF'}
              </button>
            </div>
          </div>

          {/* Offered Card */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Offered Card:</span>
            {offeredCard ? (
              <div className="flex items-center gap-1.5">
                <CardChip card={offeredCard} size="sm" isHighlighted />
                <button onClick={onClearOfferedCard} className="text-[11px] text-rose-400 hover:underline">
                  Clear
                </button>
              </div>
            ) : (
              <button
                onClick={() => onOpenCardSelector('offered')}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-slate-300"
              >
                + Floor Card
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. DHUMBAL CONTEXT */}
      {gameType === 'dhumbal' && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400">Court Values:</span>
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
              <button
                onClick={() => onUpdateDhumbalRules({ jackValue: 'zero' })}
                className={`px-2 py-0.5 rounded-lg font-bold ${
                  dhumbalRules.jackValue === 'zero' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                }`}
              >
                Nepali (J=0)
              </button>
              <button
                onClick={() => onUpdateDhumbalRules({ jackValue: 'ten' })}
                className={`px-2 py-0.5 rounded-lg font-bold ${
                  dhumbalRules.jackValue === 'ten' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                }`}
              >
                Flat-10 (J=10)
              </button>
              <button
                onClick={() => onUpdateDhumbalRules({ jackValue: 'eleven' })}
                className={`px-2 py-0.5 rounded-lg font-bold ${
                  dhumbalRules.jackValue === 'eleven' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                }`}
              >
                Ascending (J=11)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Call Limit:</span>
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
              <button
                onClick={() => onUpdateDhumbalRules({ callThreshold: 5 })}
                className={`px-2.5 py-0.5 rounded-lg font-bold ${
                  dhumbalRules.callThreshold === 5 ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
                }`}
              >
                ≤ 5 pts (Standard)
              </button>
              <button
                onClick={() => onUpdateDhumbalRules({ callThreshold: 10 })}
                className={`px-2.5 py-0.5 rounded-lg font-bold ${
                  dhumbalRules.callThreshold === 10 ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
                }`}
              >
                ≤ 10 pts
              </button>
            </div>
          </div>

          {/* Floor Card */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Floor Card:</span>
            {offeredCard ? (
              <div className="flex items-center gap-1.5">
                <CardChip card={offeredCard} size="sm" isHighlighted />
                <button onClick={onClearOfferedCard} className="text-[11px] text-rose-400 hover:underline">
                  Clear
                </button>
              </div>
            ) : (
              <button
                onClick={() => onOpenCardSelector('offered')}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-slate-300"
              >
                + Floor Card
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. CALLBREAK CONTEXT */}
      {gameType === 'callbreak' && (
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase">Phase:</span>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => onToggleCallbreakPhase('bid')}
                  className={`px-3 py-1 rounded-lg font-bold ${
                    callbreakPhase === 'bid' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                  }`}
                >
                  1. Bidding Phase
                </button>
                <button
                  onClick={() => onToggleCallbreakPhase('play')}
                  className={`px-3 py-1 rounded-lg font-bold ${
                    callbreakPhase === 'play' ? 'bg-blue-600 text-white' : 'text-slate-400'
                  }`}
                >
                  2. Trick Play Phase
                </button>
              </div>
            </div>

            {callbreakPhase === 'play' && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-400">Bid:</span>
                  <input
                    type="number"
                    min={1}
                    max={13}
                    value={callbreakBid}
                    onChange={e => onSetCallbreakBid(Number(e.target.value))}
                    className="w-12 px-2 py-0.5 bg-slate-950 border border-slate-700 rounded text-amber-400 font-bold text-center"
                  />
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-400">Won:</span>
                  <input
                    type="number"
                    min={0}
                    max={13}
                    value={callbreakWon}
                    onChange={e => onSetCallbreakWon(Number(e.target.value))}
                    className="w-12 px-2 py-0.5 bg-slate-950 border border-slate-700 rounded text-emerald-400 font-bold text-center"
                  />
                </div>
              </div>
            )}
          </div>

          {callbreakPhase === 'play' && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">Led Suit:</span>
                <div className="flex gap-1">
                  {(['S', 'H', 'D', 'C'] as Suit[]).map(s => (
                    <button
                      key={s}
                      onClick={() => onSetCallbreakLedSuit(callbreakLedSuit === s ? null : s)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${
                        callbreakLedSuit === s
                          ? 'border-amber-400 bg-amber-400 text-slate-950'
                          : 'border-slate-700 bg-slate-800 text-slate-300'
                      }`}
                    >
                      {SUIT_SYMBOLS[s]} {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Trick Cards on Table */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">Active Trick Cards:</span>
                <div className="flex items-center gap-1">
                  {callbreakTrickCards.map((c, idx) => (
                    <CardChip key={c.id || idx} card={c} size="sm" interactive={false} />
                  ))}
                  <button
                    onClick={() => onOpenCardSelector('callbreakTrick')}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-bold text-amber-400"
                  >
                    + Opponent Card
                  </button>
                  {callbreakTrickCards.length > 0 && (
                    <button
                      onClick={onClearCallbreakTrick}
                      className="text-xs text-rose-400 hover:underline ml-1"
                    >
                      Clear Trick
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. FARAS CONTEXT */}
      {gameType === 'faras' && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Mode:</span>
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => onUpdateFarasRules({ playerType: 'seen' })}
                className={`px-3 py-1 rounded-lg font-bold ${
                  farasRules.playerType === 'seen' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                }`}
              >
                Seen Player (2x Stake)
              </button>
              <button
                onClick={() => onUpdateFarasRules({ playerType: 'blind' })}
                className={`px-3 py-1 rounded-lg font-bold ${
                  farasRules.playerType === 'blind' ? 'bg-blue-600 text-white' : 'text-slate-400'
                }`}
              >
                Blind Player (1x Stake)
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-400">
            Opponents: <span className="font-bold text-slate-200">3 Players</span>
          </div>
        </div>
      )}

      {/* 6. IN-BETWEEN CONTEXT */}
      {gameType === 'inbetween' && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">Boundary 1:</span>
              {boundaryCards[0] ? (
                <div className="flex items-center gap-1.5">
                  <CardChip card={boundaryCards[0]} size="sm" isHighlighted />
                  <button onClick={() => onOpenCardSelector('boundary1')} className="text-xs text-amber-400">Change</button>
                </div>
              ) : (
                <button
                  onClick={() => onOpenCardSelector('boundary1')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-bold text-amber-400"
                >
                  Select Card 1
                </button>
              )}
            </div>

            <div className="text-slate-500 font-black text-sm">vs</div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">Boundary 2:</span>
              {boundaryCards[1] ? (
                <div className="flex items-center gap-1.5">
                  <CardChip card={boundaryCards[1]} size="sm" isHighlighted />
                  <button onClick={() => onOpenCardSelector('boundary2')} className="text-xs text-amber-400">Change</button>
                </div>
              ) : (
                <button
                  onClick={() => onOpenCardSelector('boundary2')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-bold text-amber-400"
                >
                  Select Card 2
                </button>
              )}
            </div>
          </div>

          <div className="text-xs text-amber-400 font-bold">
            Aim: 3rd card strictly inside the spread
          </div>
        </div>
      )}
    </div>
  );
};
