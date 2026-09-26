import React, { useState, useRef } from 'react';
import { 
  FileUp, 
  Image as ImageIcon, 
  Type, 
  Link as LinkIcon, 
  Radio, 
  LogOut, 
  Download, 
  Copy, 
  Check, 
  ExternalLink, 
  Upload, 
  X, 
  Smartphone, 
  Laptop, 
  Tablet,
  CheckCircle2,
  FileText,
  Clock,
  Send,
  Eye,
  Trash2,
  Music
} from 'lucide-react';
import { WebDropLogo } from './WebDropLogo';
import { BatteryIndicator } from './BatteryIndicator';
import { useLogos } from '../context/LogoContext';

export interface SharedItem {
  id: string;
  type: 'file' | 'photo' | 'text' | 'link' | 'audio';
  senderRole: 'self' | 'peer';
  senderName: string;
  timestamp: number;
  // File / Photo props
  fileName?: string;
  fileSize?: number;
  fileUrl?: string;
  mimeType?: string;
  previewUrl?: string;
  // Text props
  text?: string;
  // Link props
  linkUrl?: string;
  linkTitle?: string;
}

interface ConnectedViewProps {
  sessionCode: string;
  remoteDeviceName: string;
  remoteDeviceType: string;
  localDeviceName: string;
  items: SharedItem[];
  onDisconnect: () => void;
  onSendText: (text: string) => void;
  onSendLink: (url: string, title?: string) => void;
  onSendFile: (file: File, isPhoto?: boolean) => Promise<void>;
  onDeleteItem: (id: string) => void;
  onClearHistory: () => void;
  remoteBattery: { level: number; charging: boolean } | null;
  localBattery: { level: number; charging: boolean } | null;
  isUploading?: boolean;
  uploadProgress?: number;
}

export const ConnectedView: React.FC<ConnectedViewProps> = ({
  sessionCode,
  remoteDeviceName,
  remoteDeviceType,
  localDeviceName,
  items,
  onDisconnect,
  onSendText,
  onSendLink,
  onSendFile,
  onDeleteItem,
  onClearHistory,
  remoteBattery,
  localBattery,
  isUploading = false,
  uploadProgress = 0,
}) => {
  const [activeModal, setActiveModal] = useState<'none' | 'text' | 'link' | 'photo_preview'>('none');
  const [textInput, setTextInput] = useState('');
  const [linkUrlInput, setLinkUrlInput] = useState('');
  const [linkTitleInput, setLinkTitleInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<SharedItem | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'files' | 'text'>('all');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const { logos } = useLogos();

  const getDeviceIcon = (type: string) => {
    if (type === 'mobile' || type === 'tablet') {
      if (logos.phone_logo) {
        return (
          <img
            src={logos.phone_logo}
            alt="Phone Logo"
            className="w-5 h-5 object-contain rounded-md select-none shrink-0"
            draggable={false}
          />
        );
      }
      return type === 'mobile'
        ? <Smartphone className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
        : <Tablet className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />;
    } else {
      if (logos.pc_logo) {
        return (
          <img
            src={logos.pc_logo}
            alt="PC Logo"
            className="w-5 h-5 object-contain rounded-md select-none shrink-0"
            draggable={false}
          />
        );
      }
      return <Laptop className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleCopyText = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Ignore
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isPhoto = false) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        onSendFile(files[i], isPhoto);
      }
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        const isPhoto = file.type.startsWith('image/');
        onSendFile(file, isPhoto);
      }
    }
  };

  const submitText = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      onSendText(textInput.trim());
      setTextInput('');
      setActiveModal('none');
    }
  };

  const submitLink = (e: React.FormEvent) => {
    e.preventDefault();
    let url = linkUrlInput.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    onSendLink(url, linkTitleInput.trim() || undefined);
    setLinkUrlInput('');
    setLinkTitleInput('');
    setActiveModal('none');
  };

  // Deduplicate items by ID to prevent duplicate key collisions
  const seenIds = new Set<string>();
  const deduplicatedItems = items.filter((item) => {
    if (!item.id) return true;
    if (seenIds.has(item.id)) return false;
    seenIds.add(item.id);
    return true;
  });

  const filteredItems = deduplicatedItems.filter(item => {
    if (activeTab === 'files') return item.type === 'file' || item.type === 'photo' || item.type === 'audio';
    if (activeTab === 'text') return item.type === 'text' || item.type === 'link';
    return true;
  });

  return (
    <div 
      className="w-full max-w-3xl mx-auto px-4 py-4 sm:py-6"
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFileChange(e, false)}
      />
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => handleFileChange(e, true)}
      />

      {/* CONNECTED HEADER */}
      <header className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shrink-0">
              <WebDropLogo size={24} />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Connected
                </span>
                <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                  SESSION #{sessionCode}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white mt-0.5 flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1.5 truncate">
                  {getDeviceIcon(remoteDeviceType)}
                  <span className="truncate">{remoteDeviceName}</span>
                </span>
                {remoteBattery && (
                  <BatteryIndicator
                    level={remoteBattery.level}
                    charging={remoteBattery.charging}
                    className="ml-1 shrink-0"
                  />
                )}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>Direct encrypted connection • Linked with {localDeviceName}</span>
                {localBattery && (
                  <span className="inline-flex items-center gap-1.5 text-slate-400 before:content-['•'] before:mr-1">
                    <span>Local:</span>
                    <BatteryIndicator level={localBattery.level} charging={localBattery.charging} showText={true} />
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={onDisconnect}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 text-xs font-medium hover:bg-rose-100/60 dark:hover:bg-rose-950/40 transition active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Disconnect</span>
            </button>
          </div>
        </div>

        {/* Upload Progress Bar if active */}
        {isUploading && (
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 mb-1.5">
              <span className="font-medium flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-cyan-600 animate-bounce" />
                Transferring item to {remoteDeviceName}...
              </span>
              <span className="font-mono text-xs">{uploadProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-200"
                style={{ width: `${Math.max(uploadProgress, 8)}%` }}
              />
            </div>
          </div>
        )}
      </header>

      {/* MAIN ACTIONS BAR (Send File, Send Photo/Video, Send Text, Send Link) */}
      <section className="mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Send File */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-cyan-400/50 dark:hover:border-cyan-500/40 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 shadow-xs transition group text-center active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2 group-hover:scale-105 transition">
              <FileUp className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Send File
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              Any file or archive
            </span>
          </button>

          {/* Send Photo/Video */}
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            disabled={isUploading}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-cyan-400/50 dark:hover:border-cyan-500/40 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 shadow-xs transition group text-center active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-2 group-hover:scale-105 transition">
              <ImageIcon className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Send Photo/Video
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              Photos & media
            </span>
          </button>

          {/* Send Text */}
          <button
            type="button"
            onClick={() => setActiveModal('text')}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-cyan-400/50 dark:hover:border-cyan-500/40 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 shadow-xs transition group text-center active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-105 transition">
              <Type className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Send Text
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              Notes or clipboard
            </span>
          </button>

          {/* Send Link */}
          <button
            type="button"
            onClick={() => setActiveModal('link')}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-cyan-400/50 dark:hover:border-cyan-500/40 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 shadow-xs transition group text-center active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2 group-hover:scale-105 transition">
              <LinkIcon className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Send Link
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              Instant URL delivery
            </span>
          </button>
        </div>
      </section>

      {/* DRAG AND DROP ZONE */}
      <div 
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer mb-6 rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
          isDragOver
            ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/20 scale-[1.01]'
            : 'border-slate-200 dark:border-slate-800/90 bg-slate-50/40 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-900/60'
        }`}
      >
        <div className="flex flex-col items-center justify-center gap-1.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white dark:bg-slate-800 shadow-xs border border-slate-200 dark:border-slate-700 text-slate-500">
            <Upload className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Drag and drop files here, or <span className="text-cyan-600 dark:text-cyan-400 font-semibold underline underline-offset-2">browse</span>
          </p>
          <p className="text-[11px] text-slate-400">
            Supports multi-file selection up to 150 MB
          </p>
        </div>
      </div>

      {/* ACTIVITY & TRANSFER STREAM */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                Transfer Stream
              </h3>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {items.length}
              </span>
            </div>
            {items.length > 0 && (
              <button
                onClick={onClearHistory}
                className="text-[10px] text-slate-400 hover:text-rose-500 font-semibold transition cursor-pointer"
                title="Clear all history for this device"
              >
                Clear History
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                activeTab === 'all'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                activeTab === 'files'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Files
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                activeTab === 'text'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Text & Links
            </button>
          </div>
        </div>

        {/* Empty state */}
        {filteredItems.length === 0 ? (
          <div className="py-12 text-center text-slate-400 dark:text-slate-500 flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-center mb-3">
              <Radio className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Ready to transfer
            </p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
              Select one of the actions above or drop a file to send it to {remoteDeviceName}.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 mt-2">
            {filteredItems.map((item, index) => {
              const isSelf = item.senderRole === 'self';
              const isCopied = copiedId === item.id;
              const uniqueKey = item.id ? `${item.id}-${index}` : `item-${index}`;

              return (
                <div key={uniqueKey} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    
                    {/* Item icon / Thumbnail */}
                    {item.type === 'photo' && item.fileUrl ? (
                      <div 
                        onClick={() => setPreviewItem(item)}
                        className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 cursor-pointer group/thumb"
                      >
                        <img 
                          src={`${item.fileUrl}?inline=1`} 
                          alt={item.fileName} 
                          className="w-full h-full object-cover" 
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 transition flex items-center justify-center text-white">
                          <Eye className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    ) : (
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl border shrink-0 ${
                        item.type === 'file'
                          ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200/60 dark:border-blue-900/40 text-blue-600 dark:text-blue-400'
                          : item.type === 'audio'
                          ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-900/40 text-amber-600 dark:text-amber-400'
                          : item.type === 'link'
                          ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200/60 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                          : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {item.type === 'file' && <FileText className="w-4 h-4" />}
                        {item.type === 'audio' && <Music className="w-4 h-4" />}
                        {item.type === 'photo' && <ImageIcon className="w-4 h-4" />}
                        {item.type === 'link' && <LinkIcon className="w-4 h-4" />}
                        {item.type === 'text' && <Type className="w-4 h-4" />}
                      </div>
                    )}

                    {/* Metadata & Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-md ${
                          isSelf 
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' 
                            : 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200/50 dark:border-cyan-800/40'
                        }`}>
                          {isSelf ? 'Sent by You' : `From ${item.senderName || remoteDeviceName}`}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 inline" />
                          {formatTime(item.timestamp)}
                        </span>
                      </div>

                      {/* Content representation */}
                      {item.type === 'file' || item.type === 'photo' || item.type === 'audio' ? (
                        <div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {item.fileName}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 flex-wrap">
                            <span>{formatFileSize(item.fileSize)}</span>
                            {item.type === 'audio' && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-bold before:content-['•'] before:mr-1">
                                Audio track
                              </span>
                            )}
                          </p>
                          {item.type === 'audio' && item.fileUrl && (
                            <div className="mt-2 w-full max-w-xs sm:max-w-sm">
                              <audio 
                                src={item.fileUrl} 
                                controls 
                                className="w-full h-8 rounded-lg opacity-85 hover:opacity-100 transition"
                              />
                            </div>
                          )}
                        </div>
                      ) : item.type === 'link' ? (
                        <div>
                          {item.linkTitle && (
                            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                              {item.linkTitle}
                            </p>
                          )}
                          <a
                            href={item.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline truncate block"
                          >
                            {item.linkUrl}
                          </a>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words line-clamp-3 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                          {item.text}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions for this item */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    {(item.type === 'file' || item.type === 'photo' || item.type === 'audio') && item.fileUrl && (
                      <a
                        href={item.fileUrl}
                        download={item.fileName}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition active:scale-95 shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5 text-cyan-400 dark:text-cyan-600" />
                        <span>Download</span>
                      </a>
                    )}

                    {item.type === 'text' && item.text && (
                      <button
                        onClick={() => handleCopyText(item.text!, item.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition active:scale-95"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}

                    {item.type === 'link' && item.linkUrl && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleCopyText(item.linkUrl!, item.id)}
                          className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                          title="Copy Link"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <a
                          href={item.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition active:scale-95"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-cyan-400 dark:text-cyan-600" />
                          <span>Open</span>
                        </a>
                      </div>
                    )}

                    <button
                      onClick={() => onDeleteItem(item.id)}
                      className="p-2 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:border-rose-100 dark:hover:border-rose-900/40 transition shrink-0 duration-150 cursor-pointer"
                      title="Delete from history"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* TEXT SEND MODAL */}
      {activeModal === 'text' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 dark:bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                  <Type className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Send Text or Note
                </h3>
              </div>
              <button 
                onClick={() => setActiveModal('none')}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={submitText}>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type or paste any text, address, code or snippet..."
                rows={5}
                autoFocus
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none font-sans"
              />

              <div className="flex items-center justify-between mt-4">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const clip = await navigator.clipboard.readText();
                      if (clip) setTextInput(clip);
                    } catch {
                      // Clipboard permission denied
                    }
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 font-medium"
                >
                  <Copy className="w-3 h-3" />
                  Paste from clipboard
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal('none')}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!textInput.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-40 transition active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5 text-cyan-400 dark:text-cyan-600" />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LINK SEND MODAL */}
      {activeModal === 'link' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 dark:bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
                  <LinkIcon className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Send Web Link
                </h3>
              </div>
              <button 
                onClick={() => setActiveModal('none')}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={submitLink} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  URL / Address
                </label>
                <input
                  type="text"
                  value={linkUrlInput}
                  onChange={(e) => setLinkUrlInput(e.target.value)}
                  placeholder="https://example.com/article"
                  autoFocus
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Title (optional)
                </label>
                <input
                  type="text"
                  value={linkTitleInput}
                  onChange={(e) => setLinkTitleInput(e.target.value)}
                  placeholder="e.g. Interesting Design Article"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const clip = await navigator.clipboard.readText();
                      if (clip && (clip.startsWith('http') || clip.includes('.'))) {
                        setLinkUrlInput(clip.trim());
                      }
                    } catch {
                      //
                    }
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 font-medium"
                >
                  <Copy className="w-3 h-3" />
                  Paste URL
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal('none')}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!linkUrlInput.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-40 transition active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5 text-cyan-400 dark:text-cyan-600" />
                    <span>Send Link</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PHOTO PREVIEW LIGHTBOX */}
      {previewItem && (
        <div 
          onClick={() => setPreviewItem(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl max-h-[90vh] flex flex-col items-center"
          >
            <button
              onClick={() => setPreviewItem(null)}
              className="absolute -top-10 right-0 p-1.5 rounded-full bg-white/20 text-white hover:bg-white/30 transition"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={`${previewItem.fileUrl}?inline=1`} 
              alt={previewItem.fileName} 
              className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl" 
            />
            <div className="mt-3 flex items-center gap-3 bg-slate-900/90 text-white px-4 py-2 rounded-full text-xs">
              <span className="font-medium truncate max-w-xs">{previewItem.fileName}</span>
              <a
                href={previewItem.fileUrl}
                download={previewItem.fileName}
                className="inline-flex items-center gap-1 text-cyan-400 font-semibold hover:underline"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
