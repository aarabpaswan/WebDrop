import React from 'react';
import { ShieldAlert, Check, X, Smartphone, Laptop, Tablet } from 'lucide-react';
import { WebDropLogo } from './WebDropLogo';
import { useLogos } from '../context/LogoContext';

interface PairingRequestModalProps {
  peerName: string;
  peerType: string;
  onAccept: () => void;
  onDecline: () => void;
}

export const PairingRequestModal: React.FC<PairingRequestModalProps> = ({
  peerName,
  peerType,
  onAccept,
  onDecline,
}) => {
  const { logos } = useLogos();

  const getDeviceIcon = () => {
    if (peerType === 'mobile' || peerType === 'tablet') {
      if (logos.phone_logo) {
        return (
          <img
            src={logos.phone_logo}
            alt="Phone Logo"
            className="w-5 h-5 object-contain rounded-md"
          />
        );
      }
      return peerType === 'mobile'
        ? <Smartphone className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
        : <Tablet className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />;
    } else {
      if (logos.pc_logo) {
        return (
          <img
            src={logos.pc_logo}
            alt="PC Logo"
            className="w-5 h-5 object-contain rounded-md"
          />
        );
      }
      return <Laptop className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 dark:bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl p-6 text-center animate-in zoom-in-95 duration-150">
        
        {/* Pulsing connection alert badge */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100 dark:border-cyan-800/60 mb-4">
          <WebDropLogo size={28} />
        </div>

        <h3 className="text-base font-semibold text-slate-900 dark:text-white tracking-tight">
          Connect to this device?
        </h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          A nearby device wants to establish a secure sharing link.
        </p>

        {/* Device card */}
        <div className="my-5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-3 text-left">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shrink-0">
            {getDeviceIcon()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
              {peerName}
            </p>
            <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 capitalize">
              {peerType} • Ready to pair
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onDecline}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95"
          >
            <X className="w-4 h-4 text-slate-400" />
            <span>Decline</span>
          </button>

          <button
            type="button"
            onClick={onAccept}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 shadow-sm transition active:scale-95"
          >
            <Check className="w-4 h-4 text-cyan-400 dark:text-cyan-600" />
            <span>Accept</span>
          </button>
        </div>

      </div>
    </div>
  );
};
