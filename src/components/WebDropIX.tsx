import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  Upload, 
  Image as ImageIcon, 
  Video, 
  Copy, 
  Check, 
  Share2, 
  Download, 
  ExternalLink, 
  QrCode, 
  X, 
  Clock, 
  Trash2, 
  Sparkles,
  ArrowRight,
  RefreshCw,
  Eye
} from 'lucide-react';
import { WebDropLogo } from './WebDropLogo';

export interface IXMediaItem {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  isPhoto: boolean;
  isVideo: boolean;
  timestamp: number;
  expiresAt: number;
  viewUrl: string;
  streamUrl: string;
  downloadUrl: string;
}

interface WebDropIXProps {
  onBack: () => void;
  onOpenViewer: (fileId: string) => void;
}

// Single Media Item with its own dedicated QR Code
const IXMediaCard: React.FC<{
  item: IXMediaItem;
  onRemove: (id: string) => void;
  onOpenViewer: (id: string) => void;
}> = ({ item, onRemove, onOpenViewer }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [showFullQR, setShowFullQR] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const fullShareUrl = `${origin}${item.viewUrl}`;
  const displayUrl = `${typeof window !== 'undefined' ? window.location.host : 'webdrop.app'}${item.viewUrl}`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        fullShareUrl,
        {
          width: 140,
          margin: 1.5,
          color: {
            dark: '#0f172a',
            light: '#ffffff'
          }
        },
        (err) => {
          if (err) console.error('QR generation error', err);
        }
      );
    }
  }, [fullShareUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullShareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      //
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.name,
          text: `Scan or open to view ${item.name}:`,
          url: fullShareUrl
        });
      } catch {
        // Dismissed
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
    a.download = `webdrop-ix-${item.id}-qr.png`;
    a.click();
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs transition hover:shadow-md">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5">
        
        {/* Dedicated QR Code Canvas */}
        <div className="flex flex-col items-center shrink-0">
          <div 
            onClick={() => setShowFullQR(true)}
            className="p-2 rounded-xl bg-white border border-slate-200/80 dark:border-slate-700 shadow-2xs cursor-pointer group/qr relative"
            title="Click to expand QR Code"
          >
            <canvas ref={canvasRef} className="w-[120px] h-[120px] sm:w-[130px] sm:h-[130px] rounded-lg block" />
            <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover/qr:opacity-100 transition rounded-xl flex items-center justify-center">
              <span className="text-[10px] font-semibold bg-white/95 text-slate-800 px-2 py-0.5 rounded shadow-xs">
                Expand
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono tracking-wider text-slate-400 mt-1 uppercase font-semibold">
            SCAN TO OPEN
          </span>
        </div>

        {/* Content details and actions */}
        <div className="flex-1 min-w-0 w-full">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase ${
                  item.isVideo 
                    ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40' 
                    : 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200/60 dark:border-cyan-800/40'
                }`}>
                  {item.isVideo ? <Video className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                  {item.isVideo ? 'Video' : 'Photo'}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {formatFileSize(item.size)}
                </span>
              </div>

              <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate" title={item.name}>
                {item.name}
              </h4>
            </div>

            <button
              onClick={() => onRemove(item.id)}
              className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition"
              title="Remove from list"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Direct Link strip */}
          <div className="mt-3 flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
            <span className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate select-all">
              {displayUrl}
            </span>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 active:scale-95 transition shrink-0"
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

          {/* Action buttons */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => onOpenViewer(item.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition active:scale-95 shadow-2xs"
            >
              <Eye className="w-3.5 h-3.5 text-cyan-400 dark:text-cyan-600" />
              <span>Open Page</span>
            </button>

            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Share</span>
            </button>

            <button
              onClick={handleDownloadQR}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Save QR</span>
            </button>

            <a
              href={item.downloadUrl}
              download={item.name}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:underline"
            >
              Direct File
            </a>
          </div>
        </div>
      </div>

      {/* Expanded QR Modal */}
      {showFullQR && (
        <div 
          onClick={() => setShowFullQR(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 text-center shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <span className="text-xs font-mono font-semibold tracking-wider text-cyan-600 dark:text-cyan-400 uppercase">
                WEBDROP IX QR
              </span>
              <button onClick={() => setShowFullQR(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 dark:border-slate-700 inline-block shadow-sm mb-4">
              <canvas 
                ref={(node) => {
                  if (node) {
                    QRCode.toCanvas(node, fullShareUrl, { width: 240, margin: 1.5 });
                  }
                }} 
                className="w-[240px] h-[240px] block rounded-lg"
              />
            </div>

            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
              {item.name}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Scan with any camera or QR scanner to open immediately
            </p>

            <button
              onClick={() => setShowFullQR(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const WebDropIX: React.FC<WebDropIXProps> = ({ onBack, onOpenViewer }) => {
  const [items, setItems] = useState<IXMediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [expiryHours, setExpiryHours] = useState<number>(2); // default 2 hours
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('webdrop_ix_items');
      if (saved) {
        const parsed: IXMediaItem[] = JSON.parse(saved);
        // Filter out expired items
        const now = Date.now();
        const valid = parsed.filter((item) => item.expiresAt > now);
        setItems(valid);
      }
    } catch {
      //
    }
  }, []);

  // Save to localStorage whenever items change (with deduplication)
  const saveItems = (newItems: IXMediaItem[]) => {
    const seen = new Set<string>();
    const unique = newItems.filter((it) => {
      if (!it.id) return true;
      if (seen.has(it.id)) return false;
      seen.add(it.id);
      return true;
    });

    setItems(unique);
    try {
      localStorage.setItem('webdrop_ix_items', JSON.stringify(unique));
    } catch {
      //
    }
  };

  const handleUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress(20);

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('media', files[i]);
    }
    formData.append('expiryHours', expiryHours.toString());

    const progressTimer = setInterval(() => {
      setUploadProgress((p) => Math.min(p + 15, 90));
    }, 150);

    try {
      const res = await fetch('/api/ix/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressTimer);
      setUploadProgress(100);

      if (!res.ok) {
        throw new Error('Upload failed');
      }

      const data = await res.json();
      if (data.items && data.items.length > 0) {
        const updated = [...data.items, ...items];
        saveItems(updated);
      }
    } catch (err) {
      console.error(err);
      alert('Upload failed. Please check your network and file sizes.');
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 400);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleUpload(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      handleUpload(e.dataTransfer.files);
    }
  };

  const handleRemoveItem = (id: string) => {
    const updated = items.filter((item) => item.id !== id);
    saveItems(updated);
  };

  const handleClearAll = () => {
    saveItems([]);
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-4 sm:py-6">
      
      {/* Hidden file input for photos and videos */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition mr-1"
            title="Back to WebDrop"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <WebDropLogo size={24} />
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>WebDrop IX</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 border border-cyan-200/60 dark:border-cyan-800/60">
                Direct QR Media
              </span>
            </h2>
          </div>
        </div>

        {items.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-xs text-slate-400 hover:text-rose-500 font-medium transition"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Concept Explanation Banner */}
      <div className="mb-6 p-4 rounded-2xl bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-100 dark:border-cyan-900/40 flex items-start gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5">
          <QrCode className="w-4 h-4" />
        </div>
        <div className="text-xs">
          <h3 className="font-semibold text-cyan-950 dark:text-cyan-200">
            Direct Photo & Video QR Delivery
          </h3>
          <p className="mt-0.5 text-cyan-800/80 dark:text-cyan-300/80 leading-relaxed">
            Upload photos or videos to generate standalone QR codes & links for each. Any device can scan and immediately view or download in their browser — <strong>no pairing or app connection required</strong>.
          </p>
        </div>
      </div>

      {/* UPLOAD DROP ZONE */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
          isDragOver
            ? 'border-cyan-500 bg-cyan-50/60 dark:bg-cyan-950/30 scale-[1.01]'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
        }`}
      >
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
            <Upload className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          </div>

          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Upload Photos or Videos for Direct QR Codes
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
            Drag and drop multiple photos or videos here, or <span className="text-cyan-600 dark:text-cyan-400 font-semibold underline underline-offset-2">browse files</span>
          </p>

          {/* Expiry Selector */}
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300"
          >
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Expires after:</span>
            <select
              value={expiryHours}
              onChange={(e) => setExpiryHours(parseFloat(e.target.value))}
              className="bg-transparent font-semibold text-slate-900 dark:text-white cursor-pointer focus:outline-hidden"
            >
              <option value={0.5}>30 minutes</option>
              <option value={2}>2 hours</option>
              <option value={12}>12 hours</option>
              <option value={24}>24 hours</option>
            </select>
          </div>
        </div>

        {/* Upload progress */}
        {uploading && (
          <div className="mt-5 max-w-xs mx-auto">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
              <span>Generating QR codes...</span>
              <span className="font-mono">{uploadProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-cyan-500 rounded-full transition-all duration-150"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* GENERATED MEDIA & QR CODES LIST */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <span>Generated QR Media</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {items.length}
            </span>
          </h3>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 text-slate-400">
            <QrCode className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              No QR media generated yet
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Select or drop any photo or video above to generate its QR code.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item, index) => (
              <IXMediaCard
                key={item.id ? `${item.id}-${index}` : `ix-${index}`}
                item={item}
                onRemove={handleRemoveItem}
                onOpenViewer={onOpenViewer}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
