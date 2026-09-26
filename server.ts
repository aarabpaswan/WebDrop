import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import multer from 'multer';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);

// Use memory storage for ephemeral private transfers (no persistence on disk)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 150 * 1024 * 1024 } // 150 MB max transfer
});

interface StoredFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  buffer: Buffer;
  sessionId: string;
  senderName: string;
  timestamp: number;
  expiresAt: number;
  isPhoto: boolean;
  isVideo: boolean;
  isIX: boolean;
  views: number;
  downloads: number;
}

const fileStore = new Map<string, StoredFile>();

// Clean up expired files periodically (every 2 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [id, file] of fileStore.entries()) {
    if (now > file.expiresAt) {
      fileStore.delete(id);
    }
  }
}, 2 * 60 * 1000);

interface DeviceClient {
  id: string;
  ws: WebSocket;
  name: string;
  type: string;
  joinedAt: number;
}

interface WebDropSession {
  code: string;
  createdAt: number;
  host: DeviceClient | null;
  peer: DeviceClient | null;
  pendingPeer: DeviceClient | null;
  status: 'waiting' | 'pair_requested' | 'connected';
}

const sessions = new Map<string, WebDropSession>();

function generateSessionCode(): string {
  // Generate friendly 4-letter uppercase code avoiding ambiguous letters (0, O, 1, I, L)
  const chars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  // Ensure uniqueness among active sessions
  if (sessions.has(code)) {
    return generateSessionCode();
  }
  return code;
}

// REST Endpoints
app.use(express.json());

// Custom Logos storage
interface CustomLogos {
  app_logo: string | null;
  phone_logo: string | null;
  pc_logo: string | null;
}

const customLogos: CustomLogos = {
  app_logo: null,
  phone_logo: null,
  pc_logo: null,
};

// Broadcast logos update to all active sessions
function broadcastLogos() {
  const wsMsg = JSON.stringify({
    type: 'logos_updated',
    payload: customLogos
  });
  for (const session of sessions.values()) {
    try {
      if (session.host?.ws && session.host.ws.readyState === WebSocket.OPEN) {
        session.host.ws.send(wsMsg);
      }
    } catch (err) {}
    try {
      if (session.peer?.ws && session.peer.ws.readyState === WebSocket.OPEN) {
        session.peer.ws.send(wsMsg);
      }
    } catch (err) {}
  }
}

// Get custom logos
app.get('/api/admin/logos', (req, res) => {
  res.json(customLogos);
});

// Upload custom logo
app.post('/api/admin/logos/upload', upload.single('logo'), (req, res) => {
  const { type } = req.body;
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  if (!['app_logo', 'phone_logo', 'pc_logo'].includes(type)) {
    return res.status(400).json({ error: 'Invalid logo type' });
  }

  const base64 = req.file.buffer.toString('base64');
  const mimeType = req.file.mimetype || 'image/png';
  const dataUrl = `data:${mimeType};base64,${base64}`;

  if (type === 'app_logo') {
    customLogos.app_logo = dataUrl;
  } else if (type === 'phone_logo') {
    customLogos.phone_logo = dataUrl;
  } else if (type === 'pc_logo') {
    customLogos.pc_logo = dataUrl;
  }

  broadcastLogos();

  return res.json({ success: true, logos: customLogos });
});

// Reset custom logo to default
app.post('/api/admin/logos/reset', (req, res) => {
  const { type } = req.body;
  if (!['app_logo', 'phone_logo', 'pc_logo'].includes(type)) {
    return res.status(400).json({ error: 'Invalid logo type' });
  }

  if (type === 'app_logo') {
    customLogos.app_logo = null;
  } else if (type === 'phone_logo') {
    customLogos.phone_logo = null;
  } else if (type === 'pc_logo') {
    customLogos.pc_logo = null;
  }

  broadcastLogos();

  return res.json({ success: true, logos: customLogos });
});

// API health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', activeSessions: sessions.size });
});

// Check if a session code is valid and waiting
app.get('/api/session/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const session = sessions.get(code);
  if (!session) {
    return res.status(404).json({ error: 'Session not found or expired' });
  }
  return res.json({
    code: session.code,
    status: session.status,
    hostDeviceName: session.host?.name || 'Device',
    hostDeviceType: session.host?.type || 'unknown'
  });
});

// Ephemeral file upload
// Ephemeral file upload (Session-based)
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { sessionId, senderName } = req.body;
  const fileId = crypto.randomUUID();
  const mimeType = req.file.mimetype || 'application/octet-stream';
  const isPhoto = mimeType.startsWith('image/');
  const isVideo = mimeType.startsWith('video/');

  const storedFile: StoredFile = {
    id: fileId,
    name: req.file.originalname,
    size: req.file.size,
    mimeType,
    buffer: req.file.buffer,
    sessionId: (sessionId || '').toUpperCase(),
    senderName: senderName || 'Device',
    timestamp: Date.now(),
    expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
    isPhoto,
    isVideo,
    isIX: false,
    views: 0,
    downloads: 0
  };

  fileStore.set(fileId, storedFile);

  return res.json({
    id: fileId,
    name: storedFile.name,
    size: storedFile.size,
    mimeType: storedFile.mimeType,
    isPhoto: storedFile.isPhoto,
    isVideo: storedFile.isVideo,
    url: `/api/download/${fileId}`
  });
});

// WEBDROP IX: Direct Photo & Video Upload (No connection needed)
// Accepts multiple photos/videos (up to 10 files)
app.post('/api/ix/upload', upload.array('media', 10), (req, res) => {
  const files = (req.files as Express.Multer.File[]) || [];
  if (files.length === 0) {
    return res.status(400).json({ error: 'No photos or videos provided' });
  }

  // Optional custom expiry (e.g. 10m, 1h, 24h, default: 2 hours)
  const expiryHours = parseFloat(req.body.expiryHours as string) || 2;
  const ttlMs = Math.min(Math.max(expiryHours, 0.1), 48) * 60 * 60 * 1000;
  const now = Date.now();

  const results = files.map((f) => {
    // Generate an elegant, clean alphanumeric ID for the media (e.g. 8 chars)
    const randomHex = crypto.randomBytes(4).toString('hex');
    const id = `ix-${randomHex}`;
    const mimeType = f.mimetype || 'application/octet-stream';
    const isPhoto = mimeType.startsWith('image/');
    const isVideo = mimeType.startsWith('video/');

    const stored: StoredFile = {
      id,
      name: f.originalname,
      size: f.size,
      mimeType,
      buffer: f.buffer,
      sessionId: '',
      senderName: req.body.senderName || 'WebDrop IX User',
      timestamp: now,
      expiresAt: now + ttlMs,
      isPhoto,
      isVideo,
      isIX: true,
      views: 0,
      downloads: 0
    };

    fileStore.set(id, stored);

    return {
      id,
      name: stored.name,
      size: stored.size,
      mimeType: stored.mimeType,
      isPhoto: stored.isPhoto,
      isVideo: stored.isVideo,
      timestamp: stored.timestamp,
      expiresAt: stored.expiresAt,
      viewUrl: `/ix/${id}`,
      streamUrl: `/api/ix/${id}/stream`,
      downloadUrl: `/api/ix/${id}/download`
    };
  });

  return res.json({
    success: true,
    items: results
  });
});

// WEBDROP IX: Get media metadata
app.get('/api/ix/:fileId', (req, res) => {
  const file = fileStore.get(req.params.fileId);
  if (!file || !file.isIX) {
    return res.status(404).json({ error: 'Media not found or link has expired' });
  }

  // Increment view counter
  file.views += 1;

  res.json({
    id: file.id,
    name: file.name,
    size: file.size,
    mimeType: file.mimeType,
    isPhoto: file.isPhoto,
    isVideo: file.isVideo,
    timestamp: file.timestamp,
    expiresAt: file.expiresAt,
    senderName: file.senderName,
    views: file.views,
    downloads: file.downloads,
    streamUrl: `/api/ix/${file.id}/stream`,
    downloadUrl: `/api/ix/${file.id}/download`
  });
});

// WEBDROP IX: Stream photo or video (with HTTP 206 Partial Content Range support)
app.get('/api/ix/:fileId/stream', (req, res) => {
  const file = fileStore.get(req.params.fileId);
  if (!file) {
    return res.status(404).send('Media expired or not found');
  }

  const fileSize = file.buffer.length;
  const range = req.headers.range;

  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', file.mimeType);

  // If client requested a partial range (critical for video seeking and iOS/Android playback)
  if (range && file.isVideo) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize) {
      res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
      return res.end();
    }

    const chunksize = end - start + 1;
    const chunk = file.buffer.subarray(start, end + 1);

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Content-Length': chunksize,
      'Content-Type': file.mimeType
    });
    return res.end(chunk);
  }

  res.setHeader('Content-Length', fileSize);
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(file.buffer);
});

// WEBDROP IX: Download original media
app.get('/api/ix/:fileId/download', (req, res) => {
  const file = fileStore.get(req.params.fileId);
  if (!file) {
    return res.status(404).send('Media expired or not found');
  }

  file.downloads += 1;

  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Length', file.size);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
  res.send(file.buffer);
});

// File download endpoint (Session-based)
app.get('/api/download/:fileId', (req, res) => {
  const file = fileStore.get(req.params.fileId);
  if (!file) {
    return res.status(404).send('File expired or not found');
  }

  // If previewing an image inline, omit attachment header unless query param download=1
  const isInline = req.query.inline === '1' && (file.isPhoto || file.isVideo);

  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Length', file.size);
  if (!isInline) {
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
  } else {
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.name)}"`);
  }

  res.send(file.buffer);
});

// WebSocket Server
const wss = new WebSocketServer({ server, path: '/ws' });

function sendWs(ws: WebSocket | null | undefined, data: any) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(data));
    } catch (err) {
      console.error('Failed to send WS message', err);
    }
  }
}

wss.on('connection', (ws: WebSocket) => {
  let clientSessionCode: string | null = null;
  let clientRole: 'host' | 'peer' | null = null;
  const clientId = crypto.randomUUID();

  // Heartbeat ping
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }, 25000);

  ws.on('message', (messageRaw: string) => {
    try {
      const data = JSON.parse(messageRaw.toString());
      const { type, payload } = data;

      switch (type) {
        case 'create_session': {
          const code = generateSessionCode();
          clientSessionCode = code;
          clientRole = 'host';

          const session: WebDropSession = {
            code,
            createdAt: Date.now(),
            host: {
              id: clientId,
              ws,
              name: payload?.deviceName || 'Host Device',
              type: payload?.deviceType || 'desktop',
              joinedAt: Date.now()
            },
            peer: null,
            pendingPeer: null,
            status: 'waiting'
          };

          sessions.set(code, session);
          sendWs(ws, {
            type: 'session_created',
            payload: {
              code,
              deviceName: session.host!.name
            }
          });
          break;
        }

        case 'request_pair': {
          const code = (payload?.code || '').toUpperCase().trim();
          const session = sessions.get(code);

          if (!session) {
            sendWs(ws, {
              type: 'pair_error',
              payload: { message: 'WebDrop session not found. Please check the code.' }
            });
            return;
          }

          if (session.status === 'connected' && session.peer) {
            sendWs(ws, {
              type: 'pair_error',
              payload: { message: 'This session already has two devices connected.' }
            });
            return;
          }

          clientSessionCode = code;
          clientRole = 'peer';

          session.pendingPeer = {
            id: clientId,
            ws,
            name: payload?.deviceName || 'Guest Device',
            type: payload?.deviceType || 'mobile',
            joinedAt: Date.now()
          };
          session.status = 'pair_requested';

          // Notify host device of pairing request with device name
          sendWs(session.host?.ws, {
            type: 'pair_requested',
            payload: {
              peerName: session.pendingPeer.name,
              peerType: session.pendingPeer.type,
              peerId: clientId
            }
          });

          // Acknowledge peer device that request was sent
          sendWs(ws, {
            type: 'pair_request_sent',
            payload: {
              hostName: session.host?.name || 'Device'
            }
          });
          break;
        }

        case 'accept_pair': {
          if (!clientSessionCode) return;
          const session = sessions.get(clientSessionCode);
          if (!session || !session.pendingPeer) return;

          session.peer = session.pendingPeer;
          session.pendingPeer = null;
          session.status = 'connected';

          // Inform both devices that connection is successfully established
          sendWs(session.host?.ws, {
            type: 'paired',
            payload: {
              remoteName: session.peer.name,
              remoteType: session.peer.type,
              isHost: true,
              code: session.code
            }
          });

          sendWs(session.peer.ws, {
            type: 'paired',
            payload: {
              remoteName: session.host?.name || 'Host Device',
              remoteType: session.host?.type || 'desktop',
              isHost: false,
              code: session.code
            }
          });
          break;
        }

        case 'reject_pair': {
          if (!clientSessionCode) return;
          const session = sessions.get(clientSessionCode);
          if (!session) return;

          if (session.pendingPeer) {
            sendWs(session.pendingPeer.ws, {
              type: 'pair_rejected',
              payload: { message: 'The other device declined the connection.' }
            });
            session.pendingPeer = null;
          }
          session.status = 'waiting';
          sendWs(session.host?.ws, {
            type: 'pair_cancelled',
            payload: {}
          });
          break;
        }

        case 'send_item': {
          if (!clientSessionCode) return;
          const session = sessions.get(clientSessionCode);
          if (!session || session.status !== 'connected') return;

          const targetWs = clientRole === 'host' ? session.peer?.ws : session.host?.ws;
          if (targetWs) {
            sendWs(targetWs, {
              type: 'item_received',
              payload: {
                ...payload,
                senderRole: clientRole,
                timestamp: Date.now()
              }
            });
          }
          break;
        }

        case 'transfer_progress': {
          if (!clientSessionCode) return;
          const session = sessions.get(clientSessionCode);
          if (!session || session.status !== 'connected') return;

          const targetWs = clientRole === 'host' ? session.peer?.ws : session.host?.ws;
          if (targetWs) {
            sendWs(targetWs, {
              type: 'transfer_progress',
              payload
            });
          }
          break;
        }

        case 'disconnect_device': {
          if (!clientSessionCode) return;
          const session = sessions.get(clientSessionCode);
          if (session) {
            const otherWs = clientRole === 'host' ? session.peer?.ws : session.host?.ws;
            sendWs(otherWs, {
              type: 'device_disconnected',
              payload: { message: 'The other device disconnected.' }
            });

            // Clean up files linked to this session
            for (const [id, f] of fileStore.entries()) {
              if (f.sessionId === clientSessionCode) {
                fileStore.delete(id);
              }
            }

            if (clientRole === 'host') {
              sessions.delete(clientSessionCode);
            } else {
              session.peer = null;
              session.status = 'waiting';
            }
          }
          break;
        }

        case 'regenerate_session': {
          if (clientRole !== 'host' || !clientSessionCode) return;
          const oldSession = sessions.get(clientSessionCode);
          if (oldSession) {
            sessions.delete(clientSessionCode);
            const newCode = generateSessionCode();
            clientSessionCode = newCode;
            const newSession: WebDropSession = {
              code: newCode,
              createdAt: Date.now(),
              host: oldSession.host,
              peer: null,
              pendingPeer: null,
              status: 'waiting'
            };
            sessions.set(newCode, newSession);
            sendWs(ws, {
              type: 'session_regenerated',
              payload: { code: newCode }
            });
          }
          break;
        }
      }
    } catch (err) {
      console.error('Error handling WebSocket message', err);
    }
  });

  ws.on('close', () => {
    clearInterval(pingInterval);
    if (!clientSessionCode) return;
    const session = sessions.get(clientSessionCode);
    if (!session) return;

    if (clientRole === 'host') {
      sendWs(session.peer?.ws, {
        type: 'device_disconnected',
        payload: { message: 'Host device closed the session.' }
      });
      sessions.delete(clientSessionCode);
    } else if (clientRole === 'peer') {
      sendWs(session.host?.ws, {
        type: 'device_disconnected',
        payload: { message: 'Connected device disconnected.' }
      });
      session.peer = null;
      session.pendingPeer = null;
      session.status = 'waiting';
    }
  });
});

// Vite or Static assets integration
async function setupViteOrStatic() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  server.listen(PORT, () => {
    console.log(`WebDrop server running on http://localhost:${PORT}`);
  });
}

setupViteOrStatic().catch((err) => {
  console.error('Server startup error:', err);
  process.exit(1);
});
