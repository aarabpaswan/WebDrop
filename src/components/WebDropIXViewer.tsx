import React, { useEffect, useState } from 'react';
import { 
  Download, 
  Share2, 
  Copy, 
  Check, 
  Clock, 
  Eye, 
  FileText, 
  ArrowLeft, 
  AlertCircle, 
  Smartphone,
  Play,
  Maximize2
} from 'lucide-react';
import { WebDropLogo } from './WebDropLogo';

interface IXMediaMetadata {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  isPhoto: boolean;
  isVideo: boolean;
  timestamp: number;
  expiresAt: number;
  senderName: string;
  views: number;
  downloads: number;
  streamUrl: string;
  downloadUrl: string;
}

interface WebDropIXViewerProps {
  fileId: string;
  onGoHome: () => void;
}

export const WebDropIXViewer: React.FC<WebDropIXViewerProps> = ({ fileId, onGoHome }) => {
  const [media, setMedia] = useState<IXMediaMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    async function fetchMedia() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/ix/${fileId}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('This photo or video has expired or does not exist.');
          }
          throw new Error('Failed to load media.');
        }
        const data = await res.json();
        if (isMounted) {
          setMedia(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Error loading media.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (fileId) {
      fetchMedia();
    }

    return () => {
      isMounted = false;
    };
  }, [fileId]);

  // Live countdown to expiration
  useEffect(() => {
    if (!media?.expiresAt) return;

    const updateTimer = () => {
      const diff = media.expiresAt - Date.now();
      if (diff <= 0) {
        setTimeLeft('Expired');
      } else {
        const mins = Math.floor(diff / (60 * 1000));
        const hours = Math.floor(mins / 60);
        const remMins = mins % 60;
        if (hours > 0) {
          setTimeLeft(`${hours}h ${remMins}m`);
        } else {
          setTimeLeft(`${remMins}m`);
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 30000);
    return () => clearInterval(interval);
  }, [media?.expiresAt]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      //
    }
  };

  const handleShare = async () => {
    if (navigator.share && media) {
      try {
        await navigator.share({
          title: media.name,
          text: `View and download ${media.name} on WebDrop IX:`,
          url: window.location.href
        });
      } catch {
        // Dismissed
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between">
      {/* Top Header */}
      <header className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <button
          onClick={onGoHome}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition" />
          <span>WebDrop</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/60 dark:border-cyan-800/60 text-[11px] font-mono font-semibold text-cyan-700 dark:text-cyan-300">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
            <span>WEBDROP IX</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-4 sm:py-8 flex flex-col justify-center">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center mb-4 shadow-xs">
              <WebDropLogo size={24} />
            </div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 animate-pulse">
              Retrieving media...
            </p>
          </div>
        ) : error ? (
          <div className="py-16 text-center max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Media Unavailable
            </h2>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              {error}
            </p>
            <button
              onClick={onGoHome}
              className="mt-6 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition"
            >
              Go to WebDrop
            </button>
          </div>
        ) : media ? (
          <div className="space-y-4">
            
            {/* Media Player / Image Display Container */}
            <div className="relative rounded-2xl overflow-hidden bg-black shadow-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-center min-h-[280px] max-h-[70vh]">
              {media.isVideo ? (
                <video
                  src={media.streamUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full max-h-[65vh] object-contain block"
                />
              ) : (
                <img
                  src={media.streamUrl}
                  alt={media.name}
                  className="w-full max-h-[65vh] object-contain block"
                />
              )}
            </div>

            {/* Media Metadata Card & Primary Download Button */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                
                {/* File info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono uppercase font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {media.isVideo ? 'Video' : 'Photo'}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      {formatFileSize(media.size)}
                    </span>
                    {timeLeft && (
                      <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 inline" />
                        Expires in {timeLeft}
                      </span>
                    )}
                  </div>

                  <h1 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white truncate">
                    {media.name}
                  </h1>

                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Uploaded via WebDrop IX • Direct instant delivery
                  </p>
                </div>

                {/* Primary Download Button */}
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={media.downloadUrl}
                    download={media.name}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs sm:text-sm font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-sm active:scale-[0.98]"
                  >
                    <Download className="w-4 h-4 text-cyan-400 dark:text-cyan-600" />
                    <span>Download {media.isVideo ? 'Video' : 'Photo'}</span>
                  </a>

                  <button
                    onClick={handleShare}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                    title="Share Link"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={handleCopyLink}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                    title="Copy Link"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Security & Expiry info strip */}
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 dark:text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  No login required • Opens directly in browser
                </span>
                <button
                  onClick={onGoHome}
                  className="text-cyan-600 dark:text-cyan-400 hover:underline font-medium"
                >
                  Send your own files with WebDrop →
                </button>
              </div>

            </div>

          </div>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-4xl mx-auto px-4 py-4 text-center text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-200/50 dark:border-slate-800/60">
        WebDrop IX • Instant QR & Web Media Sharing
      </footer>
    </div>
  );
};
