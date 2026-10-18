import React from 'react';
import type { GameType } from '../types/cards';
import { Camera, Settings, Sparkles, Layers } from 'lucide-react';

interface HeaderProps {
  activeGame: GameType;
  onSelectGame: (game: GameType) => void;
  onOpenScan: () => void;
  onOpenSettings: () => void;
}

const GAMES: { id: GameType; name: string; tag: string }[] = [
  { id: 'jutpatti', name: 'Jutpatti', tag: 'Chutpati' },
  { id: 'marriage', name: 'Marriage', tag: '21 Cards' },
  { id: 'kitti', name: 'Kitti', tag: '9 Cards' },
  { id: 'dhumbal', name: 'Dhumbal', tag: 'Jhyap' },
  { id: 'callbreak', name: 'Callbreak', tag: '13 Cards' },
  { id: 'faras', name: 'Faras', tag: 'Teen Patti' },
  { id: 'inbetween', name: 'In-Between', tag: 'Pot Odds' },
];

export const Header: React.FC<HeaderProps> = ({
  activeGame,
  onSelectGame,
  onOpenScan,
  onOpenSettings,
}) => {
  return (
    <header className="bg-slate-950/90 border-b border-slate-800/80 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          {/* Logo & Festival Branding */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-red-950/40 border border-amber-400/30">
              <Sparkles className="w-5 h-5 text-amber-200 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-black text-lg text-white tracking-tight leading-none">
                  Taas Master
                </h1>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-red-600/80 text-white tracking-wide uppercase">
                  Dashain AI
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Sub-5s Game-Theory Assistant for Nepal
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenScan}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md transition-all"
            >
              <Camera className="w-4 h-4" />
              <span>Scan Hand</span>
            </button>

            <button
              onClick={onOpenSettings}
              className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all"
              title="API & Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Horizontal Game Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          {GAMES.map(g => {
            const isActive = activeGame === g.id;
            return (
              <button
                key={g.id}
                onClick={() => onSelectGame(g.id)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all
                  ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/20 scale-102'
                      : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800/60'
                  }
                `}
              >
                <Layers className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-slate-500'}`} />
                <span>{g.name}</span>
                <span className={`text-[10px] font-normal opacity-80 ${isActive ? 'text-slate-900 font-semibold' : 'text-slate-500'}`}>
                  ({g.tag})
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
