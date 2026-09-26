import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, Share2, Download, RefreshCw, X, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import { WebDropLogo } from './WebDropLogo';

interface ConnectViewProps {
  sessionCode: string;
  onClose: () => void;
  onRegenerate: () => void;
  onManualJoin: (code: string) => void;
  isRegenerating?: boolean;
}

export const ConnectView: React.FC<ConnectViewProps> = ({
  sessionCode,
  onClose,
  onRegenerate,
  onManualJoin,
  isRegenerating = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [joinTab, setJoinTab] = useState<'qr' | 'code'>('qr');

  // Compute session URL dynamically
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = `${origin}/join/${sessionCode}`;
  const displayUrl = `${typeof window !== 'undefined' ? window.location.host : 'webdrop.app'}/join/${sessionCode}`;

  useEffect(() => {
    if (!canvasRef.current || !sessionCode) return;

    QRCode.toCanvas(
      canvasRef.current,
      shareUrl,
      {
        width: 220,
        margin: 1.5,
        color: {
          dark: '#0f172a', // slate-900 for maximum camera contrast
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      },
      (error) => {
        if (error) console.error('QR code generation error:', error);
      }
    );
  }, [shareUrl, sessionCode, joinTab]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Connect with WebDrop',
          text: `Pair your device with code ${sessionCode} to share instantly:`,
          url: shareUrl,
        });
      } catch {
        // Share cancelled or dismissed
      }
    } else {
      handleCopy();
    }
  };

  const handleDownloadQR = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `webdrop-${sessionCode}-qr.png`;
    a.click();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualCode.trim().toUpperCase();
    if (clean.length >= 3) {
      onManualJoin(clean);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 dark:bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden p-6 sm:p-7">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <WebDropLogo size={24} />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white tracking-tight">
              Connect Device
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Close session"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch: QR Code vs Enter Code */}
        <div className="flex gap-1 p-1 mt-4 mb-5 rounded-xl bg-slate-100 dark:bg-slate-800/70">
          <button
            type="button"
            onClick={() => setJoinTab('qr')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
              joinTab === 'qr'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Scan QR Code
          </button>
          <button
            type="button"
            onClick={() => setJoinTab('code')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
              joinTab === 'code'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Enter 4-Letter Code
          </button>
        </div>

        {joinTab === 'qr' ? (
          <div className="flex flex-col items-center">
            <div className="text-center mb-3">
              <span className="text-[11px] font-mono tracking-widest text-cyan-600 dark:text-cyan-400 uppercase font-semibold">
                SCAN TO CONNECT
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Scan with your phone's camera to pair immediately
              </p>
            </div>

            {/* QR Canvas Container with polished frame */}
            <div className="relative p-3 rounded-2xl bg-white shadow-xs border border-slate-200/90 dark:border-slate-700/60 my-1">
              <canvas ref={canvasRef} className="rounded-lg w-[210px] h-[210px] block" />
              {isRegenerating && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-xs flex items-center justify-center rounded-2xl">
                  <RefreshCw className="w-6 h-6 text-cyan-600 animate-spin" />
                </div>
              )}
            </div>

            {/* Short share link display */}
            <div className="w-full mt-4 flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
              <span className="font-mono text-xs text-slate-700 dark:text-slate-300 truncate select-all">
                {displayUrl}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 active:scale-95 transition"
                  title="Copy share link"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Actions: Share, Download QR, Regenerate */}
            <div className="w-full grid grid-cols-3 gap-2 mt-3">
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition active:scale-98"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Share</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadQR}
                className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition active:scale-98"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Save QR</span>
              </button>

              <button
                type="button"
                onClick={onRegenerate}
                disabled={isRegenerating}
                className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition active:scale-98 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRegenerating ? 'animate-spin' : ''}`} />
                <span>New Code</span>
              </button>
            </div>

            {/* Connection radar indicator */}
            <div className="mt-5 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span>Waiting for device to connect...</span>
            </div>
          </div>
        ) : (
          /* Manual Code Form */
          <div className="py-2">
            <div className="text-center mb-4">
              <span className="text-[11px] font-mono tracking-widest text-cyan-600 dark:text-cyan-400 uppercase font-semibold">
                PAIR VIA SESSION CODE
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Enter the 4-character code displayed on the other device.
              </p>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase().slice(0, 6))}
                    placeholder="e.g. 7K4P"
                    maxLength={6}
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center font-mono text-xl tracking-[0.25em] font-semibold text-slate-900 dark:text-white uppercase placeholder:font-sans placeholder:tracking-normal placeholder:text-sm placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={manualCode.trim().length < 3}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                <span>Pair with Code</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            <div className="mt-5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                Both devices must confirm pairing before files or data can be transferred.
              </span>
            </div>
          </div>
        )}

        {/* Security notice */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-mono">
          <span>CODE: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{sessionCode}</strong></span>
          <span>EPHEMERAL SESSION</span>
        </div>

      </div>
    </div>
  );
};
