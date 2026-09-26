import React from 'react';
import { Zap } from 'lucide-react';

interface BatteryIndicatorProps {
  level: number; // 0 to 100
  charging: boolean;
  className?: string;
  showText?: boolean;
}

export const BatteryIndicator: React.FC<BatteryIndicatorProps> = ({
  level,
  charging,
  className = '',
  showText = true,
}) => {
  // Clamp level
  const pct = Math.min(Math.max(level, 0), 100);

  // Dynamic colors matching brand theme
  const getBatteryColor = () => {
    if (charging) return 'bg-emerald-500';
    if (pct <= 20) return 'bg-rose-500 animate-pulse';
    if (pct <= 50) return 'bg-amber-500';
    return 'bg-cyan-500';
  };

  const getBorderColor = () => {
    if (charging) return 'border-emerald-500/80';
    if (pct <= 20) return 'border-rose-500/80';
    if (pct <= 50) return 'border-amber-500/80';
    return 'border-slate-300 dark:border-slate-700';
  };

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {/* Battery Frame */}
      <div className={`relative flex items-center h-4 w-7 rounded-sm border p-[1px] shrink-0 transition-colors ${getBorderColor()}`}>
        {/* Fill Area */}
        <div 
          className={`h-full rounded-[1px] transition-all duration-300 ${getBatteryColor()}`}
          style={{ width: `${pct}%` }}
        />
        {/* Battery Cap */}
        <div className={`absolute top-[4px] -right-[2.5px] h-1.5 w-[1.5px] rounded-r-xs bg-current opacity-70`} />
        
        {/* Charging Lightning Bolt */}
        {charging && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Zap className="w-2.5 h-2.5 text-white fill-white stroke-[2.5]" />
          </div>
        )}
      </div>

      {showText && (
        <span className="font-mono text-[10px] font-semibold text-slate-500 dark:text-slate-400">
          {pct}%
        </span>
      )}
    </div>
  );
};
