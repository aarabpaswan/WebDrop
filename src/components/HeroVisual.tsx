import React from 'react';
import { WebDropLogo } from './WebDropLogo';

export const HeroVisual: React.FC = () => {
  return (
    <div className="relative mx-auto my-6 sm:my-8 w-full max-w-md h-40 sm:h-48 flex items-center justify-center select-none overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 p-6">
      {/* Background subtle connection grid */}
      <div 
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* Connection Field Visualization */}
      <div className="relative w-full max-w-xs flex items-center justify-between z-10 px-4">
        {/* Node A */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200/70 dark:border-slate-700/60 p-2.5">
            <WebDropLogo size={32} />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
          </div>
          <span className="text-[11px] font-mono tracking-tight text-slate-400 dark:text-slate-500">01 // LOCAL</span>
        </div>

        {/* Dynamic Interacting Conduit / Signal Wave */}
        <div className="flex-1 mx-4 relative flex items-center justify-center">
          {/* Subtle baseline track */}
          <div className="w-full h-[2px] bg-gradient-to-r from-blue-500/20 via-cyan-400/40 to-emerald-500/20" />
          
          {/* Animated data packet traveling between endpoints */}
          <div className="absolute w-2 h-2 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 shadow-[0_0_8px_rgba(6,182,212,0.8)] animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
          
          {/* Center alignment symbol */}
          <div className="absolute flex items-center justify-center px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-[10px] font-mono text-cyan-600 dark:text-cyan-400 tracking-wider">
            SYNC
          </div>
        </div>

        {/* Node B */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200/70 dark:border-slate-700/60 p-2.5">
            <div className="rotate-180">
              <WebDropLogo size={32} />
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-2.5 w-2.5">
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <span className="text-[11px] font-mono tracking-tight text-slate-400 dark:text-slate-500">02 // PEER</span>
        </div>
      </div>
    </div>
  );
};
