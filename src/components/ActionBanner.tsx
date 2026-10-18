import React, { useEffect } from 'react';
import type { SolverRecommendation } from '../types/cards';
import confetti from 'canvas-confetti';
import { Trophy, Zap, AlertTriangle, ShieldCheck } from 'lucide-react';

interface ActionBannerProps {
  recommendation: SolverRecommendation | null;
  solveTimeMs?: number;
}

export const ActionBanner: React.FC<ActionBannerProps> = ({
  recommendation,
  solveTimeMs = 12,
}) => {
  useEffect(() => {
    if (recommendation?.isWinningDeclaration || recommendation?.isInstantWin) {
      // Fire festive fireworks confetti!
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#eab308', '#dc2626', '#22c55e', '#3b82f6'],
      });
    }
  }, [recommendation?.primaryAction, recommendation?.isWinningDeclaration, recommendation?.isInstantWin]);

  if (!recommendation) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center text-slate-500 text-xs">
        Add or scan cards to compute optimal game move.
      </div>
    );
  }

  const isWin = recommendation.isWinningDeclaration || recommendation.isInstantWin;

  return (
    <div
      className={`
        relative rounded-3xl p-5 border-2 shadow-2xl transition-all duration-300
        ${
          isWin
            ? 'border-amber-400 bg-gradient-to-br from-red-950 via-slate-900 to-amber-950 gold-glow'
            : 'border-slate-700 bg-slate-900/95'
        }
      `}
    >
      {/* Top Header Badge */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          {isWin ? (
            <div className="p-1.5 bg-amber-500 text-slate-950 rounded-xl">
              <Trophy className="w-5 h-5" />
            </div>
          ) : (
            <div className="p-1.5 bg-blue-600 text-white rounded-xl">
              <Zap className="w-4 h-4" />
            </div>
          )}

          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400">
              {isWin ? 'Winning Declaration Opportunity' : 'Optimal Game-Theory Move'}
            </span>
            <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
              <span>Deterministic Solver</span>
              <span>•</span>
              <span className="text-emerald-400 font-mono">⚡ {solveTimeMs.toFixed(0)}ms compute</span>
              {recommendation.confidenceScore !== undefined && (
                <>
                  <span>•</span>
                  <span className="text-amber-300 font-bold">{recommendation.confidenceScore}% confidence</span>
                </>
              )}
            </div>
          </div>
        </div>

        {isWin && (
          <span className="px-2.5 py-1 bg-red-600/90 text-white text-[11px] font-black rounded-full animate-bounce uppercase">
            {recommendation.winType || 'WIN'}
          </span>
        )}
      </div>

      {/* Main Action Banner */}
      <div className="py-4 space-y-1.5">
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
          {recommendation.primaryAction}
        </h2>
        {recommendation.secondaryAction && (
          <p className="text-sm font-semibold text-amber-300/90">
            {recommendation.secondaryAction}
          </p>
        )}
      </div>

      {/* Warning Box if any */}
      {recommendation.warning && (
        <div className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-amber-950/40 border border-amber-600/50 text-amber-200 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>{recommendation.warning}</span>
        </div>
      )}

      {/* Breakdown Grid */}
      {recommendation.breakdown.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 border-t border-slate-800/80">
          {recommendation.breakdown.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/50 text-xs"
            >
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                {item.label}
              </span>
              <span className="font-bold text-slate-200 text-right max-w-[55%] truncate" title={item.value}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
