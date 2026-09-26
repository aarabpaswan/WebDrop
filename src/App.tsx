import React, { useState, useEffect, useRef } from 'react';
import { 
  getDeviceName, 
  getDeviceType, 
  setCustomDeviceName 
} from './utils/device';
import { useBattery } from './hooks/useBattery';
import { WebDropLogo } from './components/WebDropLogo';
import { HeroVisual } from './components/HeroVisual';
import { ConnectView } from './components/ConnectView';
import { PairingRequestModal } from './components/PairingRequestModal';
import { ConnectedView, SharedItem } from './components/ConnectedView';
import { BatteryIndicator } from './components/BatteryIndicator';
import { WebDropIX } from './components/WebDropIX';
import { WebDropIXViewer } from './components/WebDropIXViewer';
import { AdminPanel } from './components/AdminPanel';
import { useLogos } from './context/LogoContext';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ThemeToggle } from './components/ThemeToggle';
import { 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  FileUp, 
  Edit3, 
  Check, 
  CheckCircle2,
  X, 
  Radio, 
  Wifi, 
  Share2, 
  Lock,
  Smartphone,
  Laptop,
  QrCode,
  Sparkles
} from 'lucide-react';

// Gentle audio notification on receiving item
function playChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.28);
  } catch {
    // Audio context may be restricted by browser policy
  }
}

export default function App() {
  const [localName, setLocalName] = useState(getDeviceName());
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(localName);
  
  // Connection state
  const [connectionState, setConnectionState] = useState<'idle' | 'connecting' | 'waiting_qr' | 'pairing_sent' | 'connected'>('idle');
  const [sessionCode, setSessionCode] = useState<string>('');
  const [isHost, setIsHost] = useState(true);
  const [remoteName, setRemoteName] = useState('');
  const [remoteType, setRemoteType] = useState('unknown');
  
  // Pairing request modal state (Host side)
  const [pendingPairRequest, setPendingPairRequest] = useState<{ peerName: string; peerType: string; peerId: string } | null>(null);
  
  // Notice banner
  const [notice, setNotice] = useState<string | null>(null);
  
  // Shared items stream
  const [items, setItems] = useState<SharedItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Battery monitoring states
  const localBattery = useBattery();
  const [remoteBattery, setRemoteBattery] = useState<{ level: number; charging: boolean } | null>(null);

  const { setLogos } = useLogos();

  // Active view: 'transfer' (main p2p share), 'ix' (WebDrop IX), 'ix_viewer' (direct viewer), 'admin'
  const [activeView, setActiveView] = useState<'transfer' | 'ix' | 'ix_viewer' | 'admin'>('transfer');
  const [ixFileId, setIxFileId] = useState<string>('');

  // Quick code input on home
  const [homeCodeInput, setHomeCodeInput] = useState('');
  const [isJoiningWithCode, setIsJoiningWithCode] = useState(false);

  // Hidden send file input for "Send Something" on home screen
  const homeFileInputRef = useRef<HTMLInputElement | null>(null);
  const [queuedFiles, setQueuedFiles] = useState<File[]>([]);

  // WebSocket ref
  const wsRef = useRef<WebSocket | null>(null);

  const showNotification = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  };

  // Idempotent state updater to prevent duplicate item keys
  const addOrUpdateItem = (item: SharedItem, currentRemoteName = remoteName) => {
    setItems((prev) => {
      const idx = prev.findIndex((p) => p.id === item.id);
      let next = [...prev];
      if (idx !== -1) {
        next[idx] = { ...next[idx], ...item };
      } else {
        next = [item, ...prev];
      }

      // Persist to localStorage if connected to a device
      const activeName = currentRemoteName || remoteName;
      if (activeName) {
        try {
          localStorage.setItem(`webdrop_history_${activeName}`, JSON.stringify(next));
        } catch (err) {
          console.error('LocalStorage write error:', err);
        }
      }
      return next;
    });
  };

  // Helper to establish WebSocket connection singleton
  const connectWs = (): WebSocket => {
    if (
      wsRef.current && 
      (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return wsRef.current;
    }

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const { type, payload } = data;

        switch (type) {
          case 'session_created':
            setSessionCode(payload.code);
            setConnectionState('waiting_qr');
            setIsHost(true);
            break;

          case 'session_regenerated':
            setSessionCode(payload.code);
            showNotification(`New session code: ${payload.code}`);
            break;

          case 'pair_requested':
            // Host receives request to pair
            setPendingPairRequest({
              peerName: payload.peerName,
              peerType: payload.peerType,
              peerId: payload.peerId
            });
            break;

          case 'pair_request_sent':
            setConnectionState('pairing_sent');
            break;

          case 'paired': {
            setConnectionState('connected');
            setPendingPairRequest(null);
            setRemoteName(payload.remoteName);
            setRemoteType(payload.remoteType);
            setSessionCode(payload.code);
            setIsHost(payload.isHost);
            
            // Load history from localStorage for this specific device name
            try {
              const saved = localStorage.getItem(`webdrop_history_${payload.remoteName}`);
              if (saved) {
                setItems(JSON.parse(saved));
              } else {
                setItems([]);
              }
            } catch (err) {
              setItems([]);
            }

            showNotification(`Connected with ${payload.remoteName}!`);
            playChime();
            break;
          }

          case 'pair_rejected':
            setConnectionState('idle');
            setRemoteBattery(null);
            showNotification(payload.message || 'Connection was declined.');
            break;

          case 'pair_cancelled':
            setPendingPairRequest(null);
            break;

          case 'pair_error':
            setConnectionState('idle');
            setRemoteBattery(null);
            showNotification(payload.message || 'Error pairing with session.');
            break;

          case 'battery_status':
            setRemoteBattery({
              level: payload.level,
              charging: payload.charging
            });
            break;

          case 'logos_updated':
            if (payload) {
              setLogos(payload);
            }
            break;

          case 'item_received':
            playChime();
            addOrUpdateItem({
              id: payload.id || crypto.randomUUID(),
              type: payload.type,
              senderRole: 'peer',
              senderName: remoteName || payload.senderName || 'Peer Device',
              timestamp: payload.timestamp || Date.now(),
              fileName: payload.fileName,
              fileSize: payload.fileSize,
              fileUrl: payload.fileUrl,
              mimeType: payload.mimeType,
              text: payload.text,
              linkUrl: payload.linkUrl,
              linkTitle: payload.linkTitle
            }, payload.senderName || remoteName);
            break;

          case 'device_disconnected':
            setConnectionState('idle');
            setPendingPairRequest(null);
            setRemoteBattery(null);
            showNotification(payload.message || 'Device disconnected.');
            break;
        }
      } catch (err) {
        console.error('Error parsing WS message:', err);
      }
    };

    ws.onclose = () => {
      // Clean up on disconnect
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };

    wsRef.current = ws;
    return ws;
  };

  // Inspect URL for /join/:code, /ix/:fileId, or query parameters on initial load
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const path = window.location.pathname;

    // Check for Admin panel
    if (path === '/admin' || path.startsWith('/admin/')) {
      setActiveView('admin');
      return;
    }

    // Check for WebDrop IX direct media view: /ix/:fileId
    const ixMatch = path.match(/\/ix\/([A-Za-z0-9_-]+)/i);
    if (ixMatch && ixMatch[1]) {
      setIxFileId(ixMatch[1]);
      setActiveView('ix_viewer');
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const qIx = urlParams.get('ix');
    if (qIx) {
      setIxFileId(qIx.trim());
      setActiveView('ix_viewer');
      return;
    }

    // Check for Device connection: /join/:code
    let joinCode = '';
    const match = path.match(/\/join\/([A-Za-z0-9]+)/i);
    if (match && match[1]) {
      joinCode = match[1].toUpperCase();
    } else {
      const qJoin = urlParams.get('join');
      if (qJoin) joinCode = qJoin.toUpperCase().trim();
    }

    if (joinCode) {
      // Clean up the URL in address bar without reloading
      window.history.replaceState({}, '', '/');
      startPairingWithCode(joinCode);
    }
  }, []);

  // Dispatch queued files when connection is made
  useEffect(() => {
    if (connectionState === 'connected' && queuedFiles.length > 0) {
      const filesToSend = [...queuedFiles];
      setQueuedFiles([]);
      filesToSend.forEach((file) => {
        handleSendFile(file, file.type.startsWith('image/'));
      });
    }
  }, [connectionState]);

  // Synchronize local battery status to connected peer
  useEffect(() => {
    if (connectionState === 'connected' && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({
          type: 'battery_status',
          payload: {
            level: localBattery.level,
            charging: localBattery.charging
          }
        }));
      } catch (err) {
        console.error('Error sending battery status:', err);
      }
    }
  }, [connectionState, localBattery.level, localBattery.charging]);

  // Host starts "Connect Device"
  const handleStartConnectDevice = () => {
    const ws = connectWs();
    const sendCreate = () => {
      ws.send(JSON.stringify({
        type: 'create_session',
        payload: {
          deviceName: localName,
          deviceType: getDeviceType()
        }
      }));
    };

    if (ws.readyState === WebSocket.OPEN) {
      sendCreate();
    } else {
      ws.onopen = sendCreate;
    }
  };

  // Peer joins with code
  const startPairingWithCode = (code: string) => {
    const cleanCode = code.toUpperCase().trim();
    if (!cleanCode) return;

    setSessionCode(cleanCode);
    setConnectionState('connecting');

    const ws = connectWs();
    const sendJoin = () => {
      ws.send(JSON.stringify({
        type: 'request_pair',
        payload: {
          code: cleanCode,
          deviceName: localName,
          deviceType: getDeviceType()
        }
      }));
    };

    if (ws.readyState === WebSocket.OPEN) {
      sendJoin();
    } else {
      ws.onopen = sendJoin;
    }
  };

  // Host accepts pairing request
  const handleAcceptPair = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'accept_pair',
        payload: {}
      }));
    }
  };

  // Host declines pairing request
  const handleDeclinePair = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'reject_pair',
        payload: {}
      }));
    }
    setPendingPairRequest(null);
  };

  // Regenerate session code
  const handleRegenerateSession = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'regenerate_session',
        payload: {}
      }));
    }
  };

  // Disconnect active session
  const handleDisconnect = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'disconnect_device',
        payload: {}
      }));
    }
    setConnectionState('idle');
    setPendingPairRequest(null);
    setSessionCode('');
    setRemoteName('');
    showNotification('Disconnected');
  };

  // Close connect modal
  const handleCloseConnectModal = () => {
    if (connectionState === 'waiting_qr') {
      handleDisconnect();
    }
    setConnectionState('idle');
  };

  // Sending text
  const handleSendText = (text: string) => {
    const item: SharedItem = {
      id: crypto.randomUUID(),
      type: 'text',
      senderRole: 'self',
      senderName: localName,
      timestamp: Date.now(),
      text
    };

    addOrUpdateItem(item);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'send_item',
        payload: {
          id: item.id,
          type: 'text',
          text,
          senderName: localName
        }
      }));
    }
  };

  // Sending link
  const handleSendLink = (url: string, title?: string) => {
    const item: SharedItem = {
      id: crypto.randomUUID(),
      type: 'link',
      senderRole: 'self',
      senderName: localName,
      timestamp: Date.now(),
      linkUrl: url,
      linkTitle: title
    };

    addOrUpdateItem(item);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'send_item',
        payload: {
          id: item.id,
          type: 'link',
          linkUrl: url,
          linkTitle: title,
          senderName: localName
        }
      }));
    }
  };

  // Deleting an individual item from connected history
  const handleDeleteItem = (id: string) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      if (remoteName) {
        try {
          localStorage.setItem(`webdrop_history_${remoteName}`, JSON.stringify(next));
        } catch (err) {
          console.error('LocalStorage delete error:', err);
        }
      }
      return next;
    });
    showNotification('Item deleted');
  };

  // Clearing the entire connected history for the active device
  const handleClearHistory = () => {
    setItems([]);
    if (remoteName) {
      try {
        localStorage.removeItem(`webdrop_history_${remoteName}`);
      } catch (err) {}
    }
    showNotification('History cleared');
  };

  // Sending file or photo (Snappy uploader using real XMLHttpRequests)
  const handleSendFile = async (file: File, isPhoto = false) => {
    setIsUploading(true);
    setUploadProgress(5);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', sessionCode);
      formData.append('senderName', localName);

      const res = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload');

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(Math.max(pct, 10));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              reject(new Error('Invalid JSON response'));
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(formData);
      });

      setUploadProgress(100);

      const item: SharedItem = {
        id: res.id,
        type: isPhoto ? 'photo' : 'file',
        senderRole: 'self',
        senderName: localName,
        timestamp: Date.now(),
        fileName: res.name,
        fileSize: res.size,
        fileUrl: res.url,
        mimeType: res.mimeType
      };

      addOrUpdateItem(item);

      // Broadcast file notify to peer
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'send_item',
          payload: {
            id: res.id,
            type: isPhoto ? 'photo' : 'file',
            fileName: res.name,
            fileSize: res.size,
            fileUrl: res.url,
            mimeType: res.mimeType,
            senderName: localName
          }
        }));
      }

      showNotification(`Sent ${file.name}`);
    } catch (err) {
      console.error(err);
      showNotification('Transfer failed. Please check network connection.');
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 200); //snappier reset
    }
  };

  // Handler for "Send Something" secondary button on Home Screen
  const handleSecondarySend = () => {
    homeFileInputRef.current?.click();
  };

  const handleHomeFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileList = Array.from(files);
      setQueuedFiles(fileList);
      e.target.value = '';
      // Open connection dialog so user can connect device to deliver file
      handleStartConnectDevice();
    }
  };

  const handleSaveDeviceName = () => {
    if (editedName.trim()) {
      setLocalName(editedName.trim());
      setCustomDeviceName(editedName.trim());
    }
    setIsEditingName(false);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-cyan-500/20 selection:text-cyan-800 dark:selection:text-cyan-200">
      
      {/* Hidden home file picker for "Send Something" */}
      <input
        ref={homeFileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleHomeFileSelected}
      />

      {/* TOP NAVIGATION / HEADER */}
      <nav className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <button 
          onClick={() => {
            if (activeView === 'admin') {
              setActiveView('transfer');
              window.history.replaceState({}, '', '/');
            } else {
              setActiveView('admin');
              window.history.replaceState({}, '', '/admin');
            }
          }}
          className="flex items-center gap-2.5 text-left group"
          title="Toggle Admin Console"
        >
          <WebDropLogo size={28} />
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition">
              WebDrop
            </span>
            {activeView === 'ix' && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-100 dark:bg-cyan-900/60 text-cyan-800 dark:text-cyan-300 font-bold">
                IX
              </span>
            )}
          </div>
        </button>

        <div className="flex items-center gap-2">
          {/* WebDrop IX Toggle Button */}
          {connectionState !== 'connected' && activeView !== 'ix_viewer' && (
            <button
              onClick={() => setActiveView(activeView === 'ix' ? 'transfer' : 'ix')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 ${
                activeView === 'ix'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'border border-cyan-200/80 dark:border-cyan-800/80 bg-cyan-50/50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100/60 dark:hover:bg-cyan-900/40'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>WebDrop IX</span>
            </button>
          )}

          {/* Current device chip */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
            <span className="truncate max-w-[130px] font-medium">{localName}</span>
          </div>

          <ThemeToggle />
          <PWAInstallButton />
        </div>
      </nav>

      {/* FLOATING NOTIFICATION TOAST */}
      {notice && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium shadow-xl border border-slate-700/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 dark:text-cyan-600" />
            <span>{notice}</span>
          </div>
        </div>
      )}

      {/* PAIRING REQUEST MODAL (Shown to Host when Guest scans/joins) */}
      {pendingPairRequest && (
        <PairingRequestModal
          peerName={pendingPairRequest.peerName}
          peerType={pendingPairRequest.peerType}
          onAccept={handleAcceptPair}
          onDecline={handleDeclinePair}
        />
      )}

      {/* CONNECT / QR CODE MODAL */}
      {connectionState === 'waiting_qr' && (
        <ConnectView
          sessionCode={sessionCode}
          onClose={handleCloseConnectModal}
          onRegenerate={handleRegenerateSession}
          onManualJoin={(code) => startPairingWithCode(code)}
        />
      )}

      {/* WAITING FOR PAIR CONFIRMATION MODAL (Guest side) */}
      {connectionState === 'pairing_sent' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 dark:bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 mb-4 animate-pulse">
              <Radio className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Waiting for Confirmation
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Please accept the connection prompt on the other device.
            </p>
            <div className="mt-5">
              <button
                onClick={() => setConnectionState('idle')}
                className="w-full py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN VIEW: EITHER WEBDROP IX VIEWER, WEBDROP IX PANEL, ADMIN PANEL, CONNECTED SCREEN OR HOME SCREEN */}
      {activeView === 'admin' ? (
        <main className="flex-1 flex flex-col justify-start">
          <AdminPanel
            onBack={() => {
              setActiveView('transfer');
              window.history.replaceState({}, '', '/');
            }}
          />
        </main>
      ) : activeView === 'ix_viewer' ? (
        <main className="flex-1 flex flex-col justify-start">
          <WebDropIXViewer
            fileId={ixFileId}
            onGoHome={() => {
              setActiveView('transfer');
              window.history.replaceState({}, '', '/');
            }}
          />
        </main>
      ) : activeView === 'ix' ? (
        <main className="flex-1 flex flex-col justify-start">
          <WebDropIX
            onBack={() => setActiveView('transfer')}
            onOpenViewer={(id) => {
              setIxFileId(id);
              setActiveView('ix_viewer');
            }}
          />
        </main>
      ) : connectionState === 'connected' ? (
        <main className="flex-1 flex flex-col justify-start">
          <ConnectedView
            sessionCode={sessionCode}
            remoteDeviceName={remoteName}
            remoteDeviceType={remoteType}
            localDeviceName={localName}
            items={items}
            onDisconnect={handleDisconnect}
            onSendText={handleSendText}
            onSendLink={handleSendLink}
            onSendFile={handleSendFile}
            onDeleteItem={handleDeleteItem}
            onClearHistory={handleClearHistory}
            remoteBattery={remoteBattery}
            localBattery={{ level: localBattery.level, charging: localBattery.charging }}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
          />
        </main>
      ) : (
        /* HOME SCREEN */
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12 max-w-2xl mx-auto w-full text-center">
          
          {/* Subtle status tag */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Zero install necessary • Fast direct sharing</span>
          </div>

          {/* Hero Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white max-w-xl leading-[1.15]">
            Move anything between your devices.
          </h1>

          {/* Supporting Text */}
          <p className="mt-3 text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Files, links, text and more — connected in seconds.
          </p>

          {/* Clean Visual device-connection concept using WebDrop symbol */}
          <HeroVisual />

          {/* Primary & Secondary Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-xs sm:max-w-sm mt-2">
            <button
              onClick={handleStartConnectDevice}
              className="w-full sm:flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs sm:text-sm font-semibold tracking-wide hover:bg-slate-800 dark:hover:bg-slate-100 shadow-sm transition active:scale-[0.98]"
            >
              <span>Connect Device</span>
              <ArrowRight className="w-4 h-4 text-cyan-400 dark:text-cyan-600" />
            </button>

            <button
              onClick={handleSecondarySend}
              className="w-full sm:flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold tracking-wide hover:bg-slate-50 dark:hover:bg-slate-800/80 transition active:scale-[0.98]"
            >
              <FileUp className="w-4 h-4 text-slate-500" />
              <span>Send Something</span>
            </button>
          </div>

          {/* WEBDROP IX FEATURE PROMO CARD */}
          <div 
            onClick={() => setActiveView('ix')}
            className="w-full max-w-xs sm:max-w-sm mt-3 p-3.5 rounded-2xl bg-gradient-to-r from-cyan-50/70 via-emerald-50/40 to-slate-50 dark:from-cyan-950/30 dark:via-emerald-950/20 dark:to-slate-900/40 border border-cyan-200/80 dark:border-cyan-800/60 hover:border-cyan-400 dark:hover:border-cyan-500 transition shadow-xs cursor-pointer group flex items-center justify-between text-left active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-cyan-200/90 dark:border-cyan-700/60 shadow-xs shrink-0 text-cyan-600 dark:text-cyan-400 group-hover:scale-105 transition">
                <QrCode className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">WebDrop IX</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-cyan-100 dark:bg-cyan-900/60 text-cyan-800 dark:text-cyan-300 font-bold uppercase">
                    FEATURE
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  Direct photo & video QR codes • No pairing needed
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-cyan-600 dark:text-cyan-400 group-hover:translate-x-1 transition shrink-0 ml-2" />
          </div>

          {/* Quick Code Entry bar */}
          <div className="mt-5 w-full max-w-xs">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (homeCodeInput.trim().length >= 3) {
                  startPairingWithCode(homeCodeInput.trim());
                }
              }}
              className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800"
            >
              <input
                type="text"
                value={homeCodeInput}
                onChange={(e) => setHomeCodeInput(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="Or enter 4-letter code"
                maxLength={6}
                className="w-full px-3 py-1.5 bg-transparent text-xs font-mono font-medium text-slate-800 dark:text-slate-200 uppercase placeholder:normal-case placeholder:font-sans placeholder:text-slate-400 focus:outline-hidden"
              />
              <button
                type="submit"
                disabled={homeCodeInput.trim().length < 3}
                className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium disabled:opacity-30 transition shrink-0 active:scale-95"
              >
                Join
              </button>
            </form>
          </div>

          {/* Device identity & edit */}
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
            {isEditingName ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  maxLength={24}
                  className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
                  autoFocus
                />
                <button onClick={handleSaveDeviceName} className="p-1 text-emerald-600 hover:text-emerald-700">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setIsEditingName(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span>Device: <strong className="text-slate-700 dark:text-slate-300 font-medium">{localName}</strong></span>
                <button
                  onClick={() => {
                    setEditedName(localName);
                    setIsEditingName(true);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                  title="Rename this device"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

        </main>
      )}

      {/* FOOTER */}
      <footer className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400 dark:text-slate-500">
        <div className="flex items-center gap-2">
          <WebDropLogo size={14} variant="monochrome" className="opacity-40" />
          <span>WebDrop • Private cross-device sharing</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-slate-400" />
            Ephemeral & Private
          </span>
          <span>No accounts needed</span>
        </div>
      </footer>

      {/* PWA Offline indicator */}
      <OfflineIndicator />
    </div>
  );
}
