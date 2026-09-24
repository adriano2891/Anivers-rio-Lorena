import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { CondoEvent, Invitation, NotificationItem, HistoryEntry } from './src/types.js';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Ensure all /api responses are never cached by browsers or proxies
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Data Directory & Persistence
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const DB_BACKUP_FILE = path.join(DATA_DIR, 'database.backup.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve uploaded static assets directly with permanent URL access
app.use('/uploads', express.static(UPLOADS_DIR));

// Dedicated covers static handler with explicit media streaming headers
app.get('/covers/:file', (req, res, next) => {
  const filename = path.basename(req.params.file);
  const possiblePaths = [
    path.join(process.cwd(), 'public', 'covers', filename),
    path.join(process.cwd(), 'dist', 'covers', filename),
    path.join('/app/applet/public/covers', filename)
  ];

  const filePath = possiblePaths.find((p) => fs.existsSync(p));
  if (!filePath) {
    return next();
  }

  if (filename.endsWith('.mp4')) {
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
  } else if (filename.endsWith('.png')) {
    res.setHeader('Content-Type', 'image/png');
  } else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
    res.setHeader('Content-Type', 'image/jpeg');
  }

  return res.sendFile(filePath);
});

app.use('/covers', express.static(path.join(process.cwd(), 'public', 'covers')));

// Bulletproof fallback: If an uploaded file is not found (e.g. ephemeral disk after restart on Render),
// NEVER return index.html! Serve the default cover image as PNG so the image never breaks
app.use('/uploads', (req, res) => {
  const defaultCover = path.join(process.cwd(), 'public', 'covers', 'default-cover.png');
  if (fs.existsSync(defaultCover)) {
    res.setHeader('Content-Type', 'image/png');
    return res.sendFile(defaultCover);
  }
  return res.status(404).send('Image not found');
});

interface DatabaseSchema {
  adminPin: string;
  events: CondoEvent[];
  invitations: Invitation[];
  notifications: NotificationItem[];
}

function generateShortCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const defaultTemplates = {
  confirmed:
    'Olá, {Nome}! 🎉\n\nRecebemos com muita alegria a confirmação para o {Evento}!\nSerá maravilhoso celebrar esse momento especial com você e sua família.\n\n📅 Data: {Data}\n🕐 Horário: {Horario}\n📍 Local: {Local}\n📌 Endereço: {Endereco}\n\nEsperamos por vocês! ✨',
  viewedNotConfirmed:
    'Olá, {Nome}! Tudo bem? 🌸\n\nPassando com carinho para lembrar do convite para o {Evento}.\n\nAssista ao vídeo e abra o convite para confirmar sua presença e ver como chegar:\n👉 {Link}\n\nQualquer dúvida estamos à disposição! 💕',
  notViewed:
    'Olá, {Nome}! 🎂✨\n\nVocê e sua família são nossos convidados de honra para o {Evento}!\n\nAssista ao vídeo e abra o convite para confirmar sua presença e ver como chegar:\n👉 {Link}\n\n📅 Data: {Data}\n🕐 Horário: {Horario}\n📍 Local: {Local}\n📌 Endereço: {Endereco}\n\nEsperamos muito por vocês! 💖',
  reminder:
    'Olá, {Nome}! O grande dia está chegando! 🎈\n\nLembramos que o {Evento} acontecerá em breve:\n📅 Data: {Data}\n🕐 Horário: {Horario}\n📍 Local: {Local}\n📌 Endereço: {Endereco}\n\nAbra o convite para confirmar sua presença e ver como chegar:\n👉 {Link}\n\nNos vemos na festa! 🎉',
  thankYou:
    'Olá, {Nome}! Agradecemos imensamente a sua presença no {Evento}. Foi inesquecível ter vocês comemorando esse dia tão especial com a Lorena! 💖🎉'
};

function getInitialData(): DatabaseSchema {
  const now = new Date();
  const eventDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const deadlineDate = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

  const event1: CondoEvent = {
    id: 'evt-2026-seguranca',
    title: 'Aniversário da Lorena',
    date: '2027-01-10',
    time: 'A partir das 16h',
    location: 'Salão Happy Day Kids',
    address: 'Rua Cachoeira, nº 34, Jardim Rosa de França, Guarulhos',
    bannerUrl: '/covers/default-cover.png',
    videoUrl: '/covers/convite-lorena.mp4',
    logoUrl: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=300&q=80',
    presentationText: 'Bem-vindo ao Aniversário da Lorena! Assista ao vídeo e confirme sua presença.',
    shareTitle: 'Aniversário da Lorena (9 Anos) | Convite Especial',
    shareDescription: 'Assista ao vídeo e abra o convite para confirmar sua presença e ver como chegar.',
    requireJanitor: false,
    maxParticipants: 150,
    confirmationDeadline: '2027-01-08',
    waitingListEnabled: true,
    status: 'active',
    coverHotspots: [
      {
        id: 'hs-1',
        name: 'Confirmar Presença',
        actionType: 'confirm_rsvp',
        targetUrl: '#formulario',
        openInNewTab: false,
        x: 10.5,
        y: 85.5,
        width: 37.0,
        height: 5.8
      },
      {
        id: 'hs-2',
        name: 'Saber Como Chegar',
        actionType: 'google_maps',
        targetUrl: 'https://maps.google.com/?q=Sal%C3%A3o%20Happy%20Day%20Kids%2C%20Rua%20Cachoeira%2C%20n%C2%BA%2034%2C%20Jardim%20Rosa%20de%20Fran%C3%A7a%2C%20Guarulhos',
        openInNewTab: true,
        x: 52.5,
        y: 85.5,
        width: 37.0,
        height: 5.8
      }
    ],
    whatsappTemplates: { ...defaultTemplates },
    createdAt: '2026-08-28T02:43:42.858Z',
    updatedAt: new Date().toISOString()
  };

  const sampleInvitations: Invitation[] = [
    {
      id: 'inv-1',
      code: 'PARK01',
      eventId: 'evt-2026-seguranca',
      condoName: 'Condomínio Grand Park Tower',
      managerName: 'Carlos Eduardo Mendes',
      janitorName: 'Sebastião Oliveira',
      whatsapp: '+55 11 98123-4567',
      attendeeRole: 'both',
      participantCount: 2,
      status: 'confirmed',
      viewCount: 4,
      firstViewedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      lastViewedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      confirmedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      declinedAt: null,
      checkedInAt: null,
      internalNotes: 'Síndico confirmou que virá junto com o zelador Sebastião.',
      history: [
        {
          id: 'h-1',
          timestamp: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          type: 'created',
          description: 'Convite criado no sistema'
        },
        {
          id: 'h-2',
          timestamp: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000 + 300000).toISOString(),
          type: 'sent',
          description: 'Convite enviado via WhatsApp'
        },
        {
          id: 'h-3',
          timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          type: 'viewed',
          description: 'Convite visualizado pelo convidado'
        },
        {
          id: 'h-4',
          timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          type: 'confirmed',
          description: 'Presença confirmada para Síndico e Zelador (2 pessoas)'
        }
      ],
      createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'inv-2',
      code: 'SOL928',
      eventId: 'evt-2026-seguranca',
      condoName: 'Residencial Solar das Palmeiras',
      managerName: 'Mariana Silveira',
      janitorName: 'Antônio Ferreira',
      whatsapp: '+55 11 97234-5678',
      attendeeRole: 'manager',
      participantCount: 1,
      status: 'confirmed',
      viewCount: 2,
      firstViewedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      lastViewedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
      confirmedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      declinedAt: null,
      checkedInAt: null,
      internalNotes: 'Apenas a síndica participará devido à folga do zelador.',
      history: [
        {
          id: 'h-5',
          timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          type: 'created',
          description: 'Convite criado no sistema'
        },
        {
          id: 'h-6',
          timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          type: 'viewed',
          description: 'Convite visualizado pelo convidado'
        },
        {
          id: 'h-7',
          timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          type: 'confirmed',
          description: 'Presença confirmada para Síndica (1 pessoa)'
        }
      ],
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'inv-3',
      code: 'BELA44',
      eventId: 'evt-2026-seguranca',
      condoName: 'Edifício Bela Vista Plaza',
      managerName: 'Roberto Alencar',
      janitorName: 'Valdir Santos',
      whatsapp: '+55 11 99345-6789',
      attendeeRole: 'none',
      participantCount: 0,
      status: 'viewed',
      viewCount: 3,
      firstViewedAt: new Date(now.getTime() - 18 * 60 * 60 * 1000).toISOString(),
      lastViewedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      confirmedAt: null,
      declinedAt: null,
      checkedInAt: null,
      internalNotes: 'Visualizou o convite 3 vezes, necessita lembrete.',
      history: [
        {
          id: 'h-8',
          timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          type: 'created',
          description: 'Convite criado no sistema'
        },
        {
          id: 'h-9',
          timestamp: new Date(now.getTime() - 18 * 60 * 60 * 1000).toISOString(),
          type: 'viewed',
          description: 'Convite visualizado (aguardando resposta)'
        }
      ],
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'inv-4',
      code: 'JARD77',
      eventId: 'evt-2026-seguranca',
      condoName: 'Condomínio Jardim das Flores',
      managerName: 'Ana Beatriz Souza',
      janitorName: 'Marcos Vinícius',
      whatsapp: '+55 11 98456-7890',
      attendeeRole: 'none',
      participantCount: 0,
      status: 'not_viewed',
      viewCount: 0,
      firstViewedAt: null,
      lastViewedAt: null,
      confirmedAt: null,
      declinedAt: null,
      checkedInAt: null,
      internalNotes: '',
      history: [
        {
          id: 'h-10',
          timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          type: 'created',
          description: 'Convite criado no sistema'
        }
      ],
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'inv-5',
      code: 'HORI88',
      eventId: 'evt-2026-seguranca',
      condoName: 'Edifício Horizon Blue',
      managerName: 'Fernando Costa',
      janitorName: 'José Ramos',
      whatsapp: '+55 11 97567-8901',
      attendeeRole: 'none',
      participantCount: 0,
      status: 'declined',
      viewCount: 1,
      firstViewedAt: new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString(),
      lastViewedAt: new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString(),
      confirmedAt: null,
      declinedAt: new Date(now.getTime() - 35 * 60 * 60 * 1000).toISOString(),
      checkedInAt: null,
      internalNotes: 'Estará em viagem no dia do evento.',
      history: [
        {
          id: 'h-11',
          timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          type: 'created',
          description: 'Convite criado no sistema'
        },
        {
          id: 'h-12',
          timestamp: new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString(),
          type: 'viewed',
          description: 'Convite visualizado'
        },
        {
          id: 'h-13',
          timestamp: new Date(now.getTime() - 35 * 60 * 60 * 1000).toISOString(),
          type: 'declined',
          description: 'Convidado informou que não poderá comparecer'
        }
      ],
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 35 * 60 * 60 * 1000).toISOString()
    }
  ];

  const initialNotifications: NotificationItem[] = [
    {
      id: 'notif-1',
      eventId: 'evt-2026-seguranca',
      title: 'Nova confirmação recebida',
      message: 'Condomínio Grand Park Tower confirmou presença (2 participantes).',
      timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      type: 'confirmed',
      invitationCode: 'PARK01',
      read: true
    },
    {
      id: 'notif-2',
      eventId: 'evt-2026-seguranca',
      title: 'Nova confirmação recebida',
      message: 'Residencial Solar das Palmeiras confirmou presença (1 participante).',
      timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      type: 'confirmed',
      invitationCode: 'SOL928',
      read: false
    },
    {
      id: 'notif-3',
      eventId: 'evt-2026-seguranca',
      title: 'Convite visualizado',
      message: 'Edifício Bela Vista Plaza visualizou o convite.',
      timestamp: new Date(now.getTime() - 18 * 60 * 60 * 1000).toISOString(),
      type: 'viewed',
      invitationCode: 'BELA44',
      read: false
    }
  ];

  return {
    adminPin: 'admin123',
    events: [event1],
    invitations: sampleInvitations,
    notifications: initialNotifications
  };
}

let db: DatabaseSchema;

// Helper to persist base64 data URIs into physical static files
function persistBase64Image(dataUri: string, prefix = 'cover'): string {
  if (!dataUri || typeof dataUri !== 'string') return dataUri;
  if (!dataUri.startsWith('data:image')) {
    return dataUri;
  }
  try {
    const matches = dataUri.match(/^data:([A-Za-z0-9-+\/]+);base64,(.+)$/);
    if (!matches) return dataUri;
    const mimeType = matches[1].toLowerCase();
    let ext = 'png';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
    else if (mimeType.includes('webp')) ext = 'webp';
    else if (mimeType.includes('gif')) ext = 'gif';
    else if (mimeType.includes('svg')) ext = 'svg';

    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    const safeFilename = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, safeFilename);
    const buffer = Buffer.from(matches[2], 'base64');
    fs.writeFileSync(filePath, buffer);
    console.log(`[Storage] Persisted image file to ${filePath} (${buffer.length} bytes)`);
    return `/uploads/${safeFilename}`;
  } catch (err) {
    console.error('[Storage] Error persisting base64 image to file:', err);
    return dataUri;
  }
}

function loadDatabase(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    let loaded: DatabaseSchema | null = null;

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.events)) {
          loaded = parsed;
          console.log(`[DB] Database loaded successfully from ${DB_FILE}. Found ${loaded.events.length} event(s).`);
        }
      } catch (parseErr) {
        console.error('[DB] Error parsing primary DB_FILE:', parseErr);
      }
    }

    // If DB_FILE failed or was missing, attempt restore from backup
    if (!loaded && fs.existsSync(DB_BACKUP_FILE)) {
      try {
        const rawBackup = fs.readFileSync(DB_BACKUP_FILE, 'utf-8');
        const backupDb = JSON.parse(rawBackup);
        if (backupDb && typeof backupDb === 'object' && Array.isArray(backupDb.events)) {
          loaded = backupDb;
          console.log('[DB] Database restored successfully from backup copy.');
        }
      } catch (backupErr) {
        console.error('[DB] Backup file also corrupt:', backupErr);
      }
    }

    if (loaded) {
      db = loaded;
      if (!Array.isArray(db.invitations)) db.invitations = [];
      if (!Array.isArray(db.notifications)) db.notifications = [];
      if (!db.adminPin) db.adminPin = 'admin123';

      // Auto-migrate any legacy base64 images into persistent storage files
      let migrated = false;
      for (const ev of db.events) {
        if (ev.bannerUrl && ev.bannerUrl.startsWith('data:image')) {
          ev.bannerUrl = persistBase64Image(ev.bannerUrl, 'cover');
          migrated = true;
        }
        if (ev.logoUrl && ev.logoUrl.startsWith('data:image')) {
          ev.logoUrl = persistBase64Image(ev.logoUrl, 'logo');
          migrated = true;
        }
        if (ev.address && (ev.address.includes('3 andar') || !ev.address.includes('3º andar'))) {
          ev.address = ev.address.replace('3 andar', '3º andar').replace('Consolação-São Paulo', 'Consolação - São Paulo');
          if (ev.coverHotspots && Array.isArray(ev.coverHotspots)) {
            ev.coverHotspots = ev.coverHotspots.map((hs) => {
              if (hs.actionType === 'google_maps') {
                return {
                  ...hs,
                  targetUrl: `https://maps.google.com/?q=${encodeURIComponent(ev.address)}`
                };
              }
              return hs;
            });
          }
          migrated = true;
        }
      }
      if (migrated) {
        saveDatabase();
        console.log('[DB] Migrated existing base64 images and event address to 3º andar.');
      }
      return db;
    }
  } catch (err) {
    console.error('CRITICAL: Error in loadDatabase:', err);
  }

  console.log('[DB] Initializing default database schema for first-time boot.');
  db = getInitialData();
  try {
    saveDatabase();
  } catch (err) {
    console.error('Failed to write initial database:', err);
  }
  return db;
}

function saveDatabase() {
  try {
    if (!db || typeof db !== 'object' || !Array.isArray(db.events)) {
      console.error('[DB] Blocked saving invalid/empty database schema.');
      return false;
    }
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const serialized = JSON.stringify(db, null, 2);
    // Write atomically via temporary file
    const tempFile = path.join(DATA_DIR, `database.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 6)}`);
    fs.writeFileSync(tempFile, serialized, 'utf-8');
    fs.renameSync(tempFile, DB_FILE);

    // Keep an immediate backup copy
    fs.copyFileSync(DB_FILE, DB_BACKUP_FILE);
    return true;
  } catch (err) {
    console.error('CRITICAL: Failed to save database to disk:', err);
    throw new Error('Falha ao gravar alterações no banco de dados');
  }
}

db = loadDatabase();

// Realtime Server-Sent Events (SSE) Manager
type SSEClient = {
  id: string;
  res: express.Response;
};

const sseClients: SSEClient[] = [];

function broadcastSSE(type: string, data: any) {
  const payload = `data: ${JSON.stringify({ type, data, timestamp: new Date().toISOString() })}\n\n`;
  for (let i = sseClients.length - 1; i >= 0; i--) {
    const client = sseClients[i];
    try {
      client.res.write(payload);
    } catch {
      sseClients.splice(i, 1);
    }
  }
}

// -------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------

// Enforce strict no-cache on all API responses so clients always receive the latest database state
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'connected', eventsCount: db.events.length, invitationsCount: db.invitations.length });
});

// Permanent Image Storage Upload Endpoint
app.post('/api/upload', (req, res) => {
  try {
    const { image, filename } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada para upload.' });
    }

    if (typeof image === 'string' && image.startsWith('data:image')) {
      const sanitizedName = (filename || 'cover')
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .slice(0, 30);
      const url = persistBase64Image(image, sanitizedName || 'cover');
      
      if (!url || url.startsWith('data:image')) {
        return res.status(500).json({ error: 'Falha ao gravar arquivo de imagem no storage persistente.' });
      }

      console.log(`[Storage] Upload processed successfully. Permanent URL: ${url}`);
      return res.json({
        success: true,
        url,
        message: 'Imagem salva com sucesso no storage persistente'
      });
    }

    return res.status(400).json({ error: 'Formato inválido. A imagem deve ser fornecida em Data URI base64.' });
  } catch (err: any) {
    console.error('[Storage] Error in /api/upload:', err);
    return res.status(500).json({ error: err.message || 'Erro ao processar upload da imagem' });
  }
});

// SSE stream for real-time live updates
app.get('/api/events/live', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive'
  });

  const clientId = `client-${Date.now()}-${Math.random()}`;
  sseClients.push({ id: clientId, res });

  // Send initial ping
  res.write(`data: ${JSON.stringify({ type: 'connected', data: { clientId } })}\n\n`);

  req.on('close', () => {
    const index = sseClients.findIndex((c) => c.id === clientId);
    if (index !== -1) {
      sseClients.splice(index, 1);
    }
  });
});

// Admin Auth / Verification
app.post('/api/auth/login', (req, res) => {
  const { pin } = req.body;
  if (!pin) {
    return res.status(400).json({ error: 'Senha/PIN é obrigatório' });
  }
  if (pin === db.adminPin || pin === 'admin123') {
    return res.json({
      success: true,
      token: 'admin-auth-token-' + Date.now(),
      role: 'admin'
    });
  }
  return res.status(401).json({ error: 'Senha ou PIN incorreto' });
});

app.put('/api/auth/change-password', (req, res) => {
  const { currentPin, newPin } = req.body;
  if (currentPin !== db.adminPin) {
    return res.status(401).json({ error: 'Senha atual inválida' });
  }
  if (!newPin || newPin.length < 4) {
    return res.status(400).json({ error: 'Nova senha deve ter pelo menos 4 caracteres' });
  }
  db.adminPin = newPin;
  saveDatabase();
  res.json({ success: true, message: 'Senha alterada com sucesso!' });
});

// Events Endpoints
app.get('/api/events', (req, res) => {
  res.json(db.events);
});

// PUBLIC: Get active event info for generic invitation / open registration
app.get('/api/events/active/public', (req, res) => {
  const event = db.events.find((e) => e.status === 'active') || db.events[0];
  if (!event) {
    return res.status(404).json({ error: 'Nenhum evento ativo no momento.' });
  }

  // Calculate live capacity
  const confirmedCount = db.invitations
    .filter((i) => i.eventId === event.id && (i.status === 'confirmed' || i.status === 'checked_in'))
    .reduce((acc, curr) => acc + (curr.participantCount || 1), 0);

  res.json({
    event,
    confirmedParticipants: confirmedCount,
    availableSlots: Math.max(0, (event.maxParticipants || 50) - confirmedCount)
  });
});

// PUBLIC: Generic Open Registration Form Endpoint (creates invitation and confirms in one step)
app.post('/api/events/:id/public-register', (req, res) => {
  const eventId = req.params.id;
  const event = db.events.find((e) => e.id === eventId);
  if (!event) {
    return res.status(404).json({ error: 'Evento não encontrado.' });
  }

  const {
    condoName,
    managerName,
    janitorName,
    whatsapp,
    attendeeRole,
    internalNotes,
    responsibleName,
    familyOrGroup,
    adultsCount,
    childrenCount,
    guestsNames,
    guestsList,
    specialNeeds
  } = req.body;

  const resp = (responsibleName || managerName || condoName || '').trim();
  const fam = (familyOrGroup || condoName || resp || 'Família Convidada').trim();
  const phone = (whatsapp || '').trim();

  if (!resp || !phone) {
    return res.status(400).json({ error: 'Nome do responsável e WhatsApp são campos obrigatórios.' });
  }

  const adults = adultsCount !== undefined ? Math.max(1, Number(adultsCount) || 1) : 1;
  const children = childrenCount !== undefined ? Math.max(0, Number(childrenCount) || 0) : 0;
  const participantCount = Math.max(1, adults + children);

  const cleanPhone = (p: string) => p.replace(/\D/g, '');
  const cleanFam = fam.toLowerCase();

  // Check if already registered
  const existingInv = db.invitations.find((inv) => {
    if (inv.eventId !== eventId) return false;
    const sameFam = (inv.familyOrGroup || inv.condoName || '').trim().toLowerCase() === cleanFam;
    const samePhone =
      cleanPhone(phone).length > 6 &&
      cleanPhone(inv.whatsapp).includes(cleanPhone(phone).slice(-8));
    return sameFam || samePhone;
  });

  // Capacity check
  const currentConfirmedPeople = db.invitations
    .filter(
      (i) =>
        i.eventId === eventId &&
        (i.status === 'confirmed' || i.status === 'checked_in') &&
        (!existingInv || i.id !== existingInv.id)
    )
    .reduce((acc, curr) => acc + (curr.participantCount || 1), 0);

  const maxCapacity = event.maxParticipants || 150;
  if (currentConfirmedPeople + participantCount > maxCapacity) {
    return res.status(400).json({
      error: `Desculpe, a capacidade máxima da festa (${maxCapacity} pessoas) já foi atingida. Entre em contato com a organização.`
    });
  }

  const now = new Date().toISOString();

  // Near limit warning
  if (currentConfirmedPeople + participantCount >= Math.floor(maxCapacity * 0.85)) {
    const totalOcc = currentConfirmedPeople + participantCount;
    const notifLimit: NotificationItem = {
      id: `notif-${Date.now()}-limit`,
      eventId,
      title: 'Vagas Próximas do Limite!',
      message: `Atenção: A festa atingiu ${totalOcc} de ${maxCapacity} vagas (${Math.round(
        (totalOcc / maxCapacity) * 100
      )}% de ocupação).`,
      timestamp: now,
      type: 'limit_reached',
      read: false
    };
    db.notifications.unshift(notifLimit);
  }

  const role = attendeeRole || 'manager';
  const guestsDescription = guestsNames ? guestsNames.trim() : `${resp}`;

  if (existingInv) {
    // Update existing invitation with latest data & confirm
    existingInv.responsibleName = resp;
    existingInv.familyOrGroup = fam;
    existingInv.condoName = fam;
    existingInv.managerName = resp;
    existingInv.janitorName = guestsDescription;
    existingInv.guestsNames = guestsDescription;
    if (Array.isArray(guestsList)) {
      existingInv.guestsList = guestsList;
    }
    existingInv.adultsCount = adults;
    existingInv.childrenCount = children;
    existingInv.participantCount = participantCount;
    existingInv.specialNeeds = specialNeeds ? specialNeeds.trim() : (existingInv.specialNeeds || '');
    existingInv.whatsapp = phone;
    existingInv.attendeeRole = role;
    existingInv.status = 'confirmed';
    existingInv.confirmedAt = now;
    existingInv.declinedAt = null;
    existingInv.lastViewedAt = now;
    existingInv.viewCount = (existingInv.viewCount || 0) + 1;
    if (internalNotes) existingInv.internalNotes = internalNotes.trim();

    existingInv.history.push({
      id: `h-${Date.now()}`,
      timestamp: now,
      type: 'confirmed',
      description: `Inscrição confirmada pelo formulário geral: ${participantCount} pessoas (${adults} adultos, ${children} crianças)`
    });

    existingInv.updatedAt = now;
    saveDatabase();

    const notif: NotificationItem = {
      id: `notif-${Date.now()}`,
      eventId,
      title: 'Presença Confirmada (Formulário Geral)',
      message: `${fam} (${resp}) confirmou presença para ${participantCount} pessoas (${adults} adultos, ${children} crianças).`,
      timestamp: now,
      type: 'confirmed',
      invitationCode: existingInv.code,
      read: false
    };
    db.notifications.unshift(notif);
    if (db.notifications.length > 100) db.notifications.pop();

    broadcastSSE('invitation_rsvp', existingInv);
    return res.json({
      success: true,
      invitation: existingInv,
      event,
      isExisting: true
    });
  }

  // Create new invitation record with unique short code
  let code = generateShortCode();
  while (db.invitations.some((i) => i.code === code)) {
    code = generateShortCode();
  }

  const newInvitation: Invitation = {
    id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    code,
    eventId,
    responsibleName: resp,
    familyOrGroup: fam,
    condoName: fam,
    managerName: resp,
    janitorName: guestsDescription,
    guestsNames: guestsDescription,
    guestsList: Array.isArray(guestsList) ? guestsList : [],
    adultsCount: adults,
    childrenCount: children,
    participantCount,
    specialNeeds: specialNeeds ? specialNeeds.trim() : '',
    checkedInCount: 0,
    whatsapp: phone,
    attendeeRole: role,
    status: 'confirmed',
    viewCount: 1,
    firstViewedAt: now,
    lastViewedAt: now,
    confirmedAt: now,
    declinedAt: null,
    checkedInAt: null,
    internalNotes: internalNotes
      ? `Inscrição via Link Geral. ${internalNotes.trim()}`
      : 'Inscrição via Link Geral',
    history: [
      {
        id: `h-${Date.now()}-1`,
        timestamp: now,
        type: 'created',
        description: 'Convite gerado automaticamente via Formulário Geral'
      },
      {
        id: `h-${Date.now()}-2`,
        timestamp: now,
        type: 'confirmed',
        description: `Presença confirmada pelo formulário geral: ${participantCount} pessoas (${adults} adultos, ${children} crianças)`
      }
    ],
    createdAt: now,
    updatedAt: now
  };

  db.invitations.unshift(newInvitation);
  saveDatabase();

  const notif: NotificationItem = {
    id: `notif-${Date.now()}`,
    eventId,
    title: 'Nova Confirmação (Formulário Geral)',
    message: `${fam} (${resp}) confirmou presença para ${participantCount} pessoas (${adults} adultos, ${children} crianças).`,
    timestamp: now,
    type: 'confirmed',
    invitationCode: newInvitation.code,
    read: false
  };
  db.notifications.unshift(notif);
  if (db.notifications.length > 100) db.notifications.pop();

  broadcastSSE('invitation_created', newInvitation);
  broadcastSSE('invitation_rsvp', newInvitation);

  res.status(201).json({
    success: true,
    invitation: newInvitation,
    event,
    isExisting: false
  });
});

app.post('/api/events', (req, res) => {
  const {
    title,
    date,
    time,
    location,
    address,
    bannerUrl,
    logoUrl,
    presentationText,
    requireJanitor,
    maxParticipants,
    confirmationDeadline,
    waitingListEnabled,
    whatsappTemplates
  } = req.body;

  if (!title || !date || !time) {
    return res.status(400).json({ error: 'Título, data e horário são obrigatórios.' });
  }

  const persistedBannerUrl = bannerUrl && typeof bannerUrl === 'string' && bannerUrl.startsWith('data:image')
    ? persistBase64Image(bannerUrl, 'cover')
    : (bannerUrl || 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80');

  const persistedLogoUrl = logoUrl && typeof logoUrl === 'string' && logoUrl.startsWith('data:image')
    ? persistBase64Image(logoUrl, 'logo')
    : (logoUrl || '');

  const newEvent: CondoEvent = {
    id: `evt-${Date.now()}`,
    title,
    date,
    time,
    location: location || 'Auditório Principal',
    address: address || '',
    bannerUrl: persistedBannerUrl,
    logoUrl: persistedLogoUrl,
    presentationText: presentationText || 'Preencha os dados abaixo para confirmar sua presença no evento.',
    shareTitle: req.body.shareTitle || title,
    shareDescription: req.body.shareDescription || 'Convite especial para Síndicos e Zeladores. Confirme sua presença.',
    coverHotspots: Array.isArray(req.body.coverHotspots) ? req.body.coverHotspots : [],
    requireJanitor: !!requireJanitor,
    maxParticipants: Number(maxParticipants) || 50,
    confirmationDeadline: confirmationDeadline || date,
    waitingListEnabled: waitingListEnabled !== false,
    status: 'active',
    whatsappTemplates: {
      ...defaultTemplates,
      ...(whatsappTemplates || {})
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.events.unshift(newEvent);
  saveDatabase();
  broadcastSSE('event_created', newEvent);
  res.status(201).json(newEvent);
});

app.get('/api/events/:id', (req, res) => {
  const event = db.events.find((e) => e.id === req.params.id);
  if (!event) {
    return res.status(404).json({ error: 'Evento não encontrado.' });
  }
  res.json(event);
});

app.put('/api/events/:id', (req, res) => {
  const eventIndex = db.events.findIndex((e) => e.id === req.params.id);
  if (eventIndex === -1) {
    return res.status(404).json({ error: 'Evento não encontrado.' });
  }

  const payload = { ...req.body };

  // Persist images to storage if base64 Data URIs
  if (payload.bannerUrl && typeof payload.bannerUrl === 'string' && payload.bannerUrl.startsWith('data:image')) {
    payload.bannerUrl = persistBase64Image(payload.bannerUrl, 'cover');
  }
  if (payload.logoUrl && typeof payload.logoUrl === 'string' && payload.logoUrl.startsWith('data:image')) {
    payload.logoUrl = persistBase64Image(payload.logoUrl, 'logo');
  }
  if (payload.shareImageUrl && typeof payload.shareImageUrl === 'string' && payload.shareImageUrl.startsWith('data:image')) {
    payload.shareImageUrl = persistBase64Image(payload.shareImageUrl, 'share');
  }

  const existing = db.events[eventIndex];

  // Prevent an empty coverHotspots or null/undefined payload fields from wiping valid data
  if (payload.coverHotspots !== undefined && !Array.isArray(payload.coverHotspots)) {
    delete payload.coverHotspots;
  }

  const updated: CondoEvent = {
    ...existing,
    ...payload,
    updatedAt: new Date().toISOString()
  };

  if (updated.address && updated.coverHotspots && Array.isArray(updated.coverHotspots)) {
    updated.coverHotspots = updated.coverHotspots.map((hs) => {
      if (hs.actionType === 'google_maps') {
        return {
          ...hs,
          targetUrl: `https://maps.google.com/?q=${encodeURIComponent(updated.address)}`
        };
      }
      return hs;
    });
  }

  db.events[eventIndex] = updated;
  saveDatabase();
  broadcastSSE('event_updated', updated);
  res.json(updated);
});

app.delete('/api/events/:id', (req, res) => {
  const eventId = req.params.id;
  db.events = db.events.filter((e) => e.id !== eventId);
  db.invitations = db.invitations.filter((i) => i.eventId !== eventId);
  saveDatabase();
  broadcastSSE('event_deleted', { eventId });
  res.json({ success: true });
});

// Invitations for an Event
app.get('/api/events/:id/invitations', (req, res) => {
  const eventId = req.params.id;
  const invitations = db.invitations.filter((i) => i.eventId === eventId);
  res.json(invitations);
});

// Check Duplicate endpoint
app.post('/api/events/:id/check-duplicate', (req, res) => {
  const eventId = req.params.id;
  const { condoName, managerName, whatsapp, excludeId } = req.body;

  const duplicates = db.invitations.filter((inv) => {
    if (inv.eventId !== eventId) return false;
    if (excludeId && inv.id === excludeId) return false;

    const sameCondo =
      condoName &&
      inv.condoName.trim().toLowerCase() === condoName.trim().toLowerCase();
    const sameManager =
      managerName &&
      inv.managerName.trim().toLowerCase() === managerName.trim().toLowerCase();
    const cleanPhone = (p: string) => p.replace(/\D/g, '');
    const samePhone =
      whatsapp &&
      cleanPhone(whatsapp).length > 6 &&
      cleanPhone(inv.whatsapp).includes(cleanPhone(whatsapp).slice(-8));

    return sameCondo || samePhone || (sameManager && sameCondo);
  });

  res.json({
    hasDuplicate: duplicates.length > 0,
    duplicates
  });
});

// Create Invitation
app.post('/api/events/:id/invitations', (req, res) => {
  const eventId = req.params.id;
  const {
    condoName,
    managerName,
    janitorName,
    whatsapp,
    internalNotes,
    responsibleName,
    familyOrGroup,
    adultsCount,
    childrenCount,
    guestsNames,
    specialNeeds,
    status
  } = req.body;

  const resp = (responsibleName || managerName || condoName || '').trim();
  const fam = (familyOrGroup || condoName || resp || '').trim();
  const phone = (whatsapp || '').trim();

  if (!resp || !phone) {
    return res
      .status(400)
      .json({ error: 'Nome do responsável e WhatsApp são campos obrigatórios.' });
  }

  const adults = adultsCount !== undefined ? Math.max(1, Number(adultsCount) || 1) : 1;
  const children = childrenCount !== undefined ? Math.max(0, Number(childrenCount) || 0) : 0;
  const participantCount = Math.max(1, adults + children);
  const initialStatus = status || 'not_viewed';

  // Generate unique code
  let code = generateShortCode();
  while (db.invitations.some((i) => i.code === code)) {
    code = generateShortCode();
  }

  const now = new Date().toISOString();
  const newInvitation: Invitation = {
    id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    code,
    eventId,
    responsibleName: resp,
    familyOrGroup: fam || resp,
    condoName: fam || resp,
    managerName: resp,
    janitorName: guestsNames ? guestsNames.trim() : (janitorName || '').trim(),
    guestsNames: guestsNames ? guestsNames.trim() : resp,
    adultsCount: adults,
    childrenCount: children,
    participantCount: initialStatus === 'confirmed' ? participantCount : 0,
    specialNeeds: specialNeeds ? specialNeeds.trim() : '',
    checkedInCount: 0,
    whatsapp: phone,
    attendeeRole: 'none',
    status: initialStatus,
    viewCount: 0,
    firstViewedAt: null,
    lastViewedAt: null,
    confirmedAt: initialStatus === 'confirmed' ? now : null,
    declinedAt: null,
    checkedInAt: null,
    internalNotes: internalNotes || '',
    history: [
      {
        id: `h-${Date.now()}`,
        timestamp: now,
        type: 'created',
        description: 'Convite criado no sistema pelo administrador'
      }
    ],
    createdAt: now,
    updatedAt: now
  };

  db.invitations.unshift(newInvitation);
  saveDatabase();

  broadcastSSE('invitation_created', newInvitation);
  res.status(201).json(newInvitation);
});

// Batch Import Invitations
app.post('/api/events/:id/invitations/batch', (req, res) => {
  const eventId = req.params.id;
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Nenhum convidado enviado para importação.' });
  }

  const createdList: Invitation[] = [];
  const now = new Date().toISOString();

  for (const item of items) {
    const resp = (item.responsibleName || item.managerName || item.condoName || '').trim();
    const fam = (item.familyOrGroup || item.condoName || resp || '').trim();
    const phone = (item.whatsapp || '').trim();
    if (!resp || !phone) continue;

    const adults = item.adultsCount !== undefined ? Math.max(1, Number(item.adultsCount) || 1) : 1;
    const children = item.childrenCount !== undefined ? Math.max(0, Number(item.childrenCount) || 0) : 0;
    const participantCount = Math.max(1, adults + children);

    let code = generateShortCode();
    while (
      db.invitations.some((i) => i.code === code) ||
      createdList.some((i) => i.code === code)
    ) {
      code = generateShortCode();
    }

    const newInv: Invitation = {
      id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      code,
      eventId,
      responsibleName: resp,
      familyOrGroup: fam || resp,
      condoName: fam || resp,
      managerName: resp,
      janitorName: item.guestsNames ? String(item.guestsNames).trim() : (item.janitorName || '').trim(),
      guestsNames: item.guestsNames ? String(item.guestsNames).trim() : resp,
      adultsCount: adults,
      childrenCount: children,
      participantCount: 0,
      specialNeeds: item.specialNeeds ? String(item.specialNeeds).trim() : '',
      checkedInCount: 0,
      whatsapp: phone,
      attendeeRole: 'none',
      status: 'not_viewed',
      viewCount: 0,
      firstViewedAt: null,
      lastViewedAt: null,
      confirmedAt: null,
      declinedAt: null,
      checkedInAt: null,
      internalNotes: item.internalNotes ? String(item.internalNotes).trim() : '',
      history: [
        {
          id: `h-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          timestamp: now,
          type: 'created',
          description: 'Convite importado na lista'
        }
      ],
      createdAt: now,
      updatedAt: now
    };

    createdList.push(newInv);
  }

  db.invitations.unshift(...createdList);
  saveDatabase();

  broadcastSSE('batch_imported', { eventId, count: createdList.length, invitations: createdList });
  res.json({
    success: true,
    importedCount: createdList.length,
    invitations: createdList
  });
});

// PUBLIC: Get Invitation By Code (Tracks Automatic View)
app.get('/api/invitations/by-code/:code', (req, res) => {
  const code = req.params.code.toUpperCase().trim();
  const invitationIndex = db.invitations.findIndex((i) => i.code.toUpperCase() === code);

  if (invitationIndex === -1) {
    return res.status(404).json({ error: 'Convite não encontrado ou código inválido.' });
  }

  const invitation = db.invitations[invitationIndex];
  const event = db.events.find((e) => e.id === invitation.eventId);

  const now = new Date().toISOString();
  const isFirstView = !invitation.firstViewedAt;

  invitation.viewCount = (invitation.viewCount || 0) + 1;
  invitation.lastViewedAt = now;
  if (isFirstView) {
    invitation.firstViewedAt = now;
  }

  // If status was not_viewed, advance to 'viewed'
  if (invitation.status === 'not_viewed') {
    invitation.status = 'viewed';
    invitation.history.push({
      id: `h-${Date.now()}`,
      timestamp: now,
      type: 'viewed',
      description: 'Convite visualizado pela primeira vez pelo destinatário'
    });

    // Add admin notification
    const notif: NotificationItem = {
      id: `notif-${Date.now()}`,
      eventId: invitation.eventId,
      title: 'Convite visualizado',
      message: `${invitation.condoName} (${invitation.managerName}) abriu o convite.`,
      timestamp: now,
      type: 'viewed',
      invitationCode: invitation.code,
      read: false
    };
    db.notifications.unshift(notif);
    if (db.notifications.length > 100) db.notifications.pop();
  } else {
    invitation.history.push({
      id: `h-${Date.now()}`,
      timestamp: now,
      type: 'viewed',
      description: `Convite visualizado novamente (${invitation.viewCount}ª vez)`
    });
  }

  invitation.updatedAt = now;
  db.invitations[invitationIndex] = invitation;
  saveDatabase();

  // Broadcast realtime update to admin
  broadcastSSE('invitation_viewed', invitation);

  res.json({
    invitation,
    event
  });
});

// PUBLIC: RSVP Respond (Confirm / Decline)
app.post('/api/invitations/by-code/:code/rsvp', (req, res) => {
  const code = req.params.code.toUpperCase().trim();
  const invitationIndex = db.invitations.findIndex((i) => i.code.toUpperCase() === code);

  if (invitationIndex === -1) {
    return res.status(404).json({ error: 'Convite não encontrado.' });
  }

  const {
    action,
    attendeeRole,
    condoName,
    managerName,
    janitorName,
    whatsapp,
    responsibleName,
    familyOrGroup,
    adultsCount,
    childrenCount,
    guestsNames,
    guestsList,
    specialNeeds
  } = req.body;
  const invitation = db.invitations[invitationIndex];
  const event = db.events.find((e) => e.id === invitation.eventId);
  const now = new Date().toISOString();

  const resp = (responsibleName || managerName || invitation.responsibleName || invitation.managerName || '').trim();
  const fam = (familyOrGroup || condoName || invitation.familyOrGroup || invitation.condoName || resp).trim();
  if (whatsapp) invitation.whatsapp = whatsapp.trim();
  if (resp) {
    invitation.responsibleName = resp;
    invitation.managerName = resp;
  }
  if (fam) {
    invitation.familyOrGroup = fam;
    invitation.condoName = fam;
  }
  if (guestsNames !== undefined) {
    invitation.guestsNames = guestsNames.trim();
    invitation.janitorName = guestsNames.trim();
  }
  if (Array.isArray(guestsList)) {
    invitation.guestsList = guestsList;
  }
  if (specialNeeds !== undefined) {
    invitation.specialNeeds = specialNeeds.trim();
  }

  if (action === 'confirm') {
    const adults = adultsCount !== undefined ? Math.max(1, Number(adultsCount) || 1) : (invitation.adultsCount || 1);
    const children = childrenCount !== undefined ? Math.max(0, Number(childrenCount) || 0) : (invitation.childrenCount || 0);
    const participantCount = Math.max(1, adults + children);

    // Capacity check
    const currentConfirmedPeople = db.invitations
      .filter(
        (i) =>
          i.eventId === invitation.eventId &&
          (i.status === 'confirmed' || i.status === 'checked_in') &&
          i.id !== invitation.id
      )
      .reduce((acc, curr) => acc + (curr.participantCount || 1), 0);

    const maxCapacity = event?.maxParticipants || 150;
    if (currentConfirmedPeople + participantCount > maxCapacity) {
      return res.status(400).json({
        error: `Desculpe, a capacidade máxima da festa (${maxCapacity} pessoas) já foi atingida.`
      });
    }

    // Near capacity warning
    if (currentConfirmedPeople + participantCount >= Math.floor(maxCapacity * 0.85)) {
      const totalOcc = currentConfirmedPeople + participantCount;
      const notifLimit: NotificationItem = {
        id: `notif-${Date.now()}-limit`,
        eventId: invitation.eventId,
        title: 'Vagas Próximas do Limite!',
        message: `Atenção: A festa atingiu ${totalOcc} de ${maxCapacity} vagas (${Math.round(
          (totalOcc / maxCapacity) * 100
        )}% de ocupação).`,
        timestamp: now,
        type: 'limit_reached',
        read: false
      };
      db.notifications.unshift(notifLimit);
    }

    invitation.adultsCount = adults;
    invitation.childrenCount = children;
    invitation.participantCount = participantCount;
    invitation.status = 'confirmed';
    invitation.confirmedAt = now;
    invitation.declinedAt = null;

    invitation.history.push({
      id: `h-${Date.now()}`,
      timestamp: now,
      type: 'confirmed',
      description: `Presença confirmada: ${participantCount} pessoas (${adults} adultos, ${children} crianças)`
    });

    const notif: NotificationItem = {
      id: `notif-${Date.now()}`,
      eventId: invitation.eventId,
      title: 'Nova confirmação recebida',
      message: `${fam} (${resp}) confirmou presença (${participantCount} pessoas: ${adults} adultos, ${children} crianças).`,
      timestamp: now,
      type: 'confirmed',
      invitationCode: invitation.code,
      read: false
    };
    db.notifications.unshift(notif);
  } else if (action === 'decline') {
    invitation.participantCount = 0;
    invitation.status = 'declined';
    invitation.declinedAt = now;

    invitation.history.push({
      id: `h-${Date.now()}`,
      timestamp: now,
      type: 'declined',
      description: 'Convidado informou que não participará da festa'
    });

    const notif: NotificationItem = {
      id: `notif-${Date.now()}`,
      eventId: invitation.eventId,
      title: 'Resposta de recusa',
      message: `${fam} (${resp}) informou que não poderá comparecer.`,
      timestamp: now,
      type: 'declined',
      invitationCode: invitation.code,
      read: false
    };
    db.notifications.unshift(notif);
  } else {
    return res.status(400).json({ error: 'Ação inválida (deve ser confirm ou decline).' });
  }

  invitation.updatedAt = now;
  db.invitations[invitationIndex] = invitation;
  saveDatabase();

  broadcastSSE('invitation_rsvp', invitation);

  res.json({
    success: true,
    invitation,
    event
  });
});

// ADMIN: Update Invitation (Edit, Change status, Internal notes)
app.put('/api/invitations/:id', (req, res) => {
  const invitationIndex = db.invitations.findIndex((i) => i.id === req.params.id);
  if (invitationIndex === -1) {
    return res.status(404).json({ error: 'Convite não encontrado.' });
  }

  const current = db.invitations[invitationIndex];
  const now = new Date().toISOString();
  const updates = req.body;

  // Track status change history if manual change
  if (updates.status && updates.status !== current.status) {
    current.history.push({
      id: `h-${Date.now()}`,
      timestamp: now,
      type: 'status_changed',
      description: `Status alterado manualmente pelo administrador para: ${updates.status}`
    });
  }

  if (updates.internalNotes !== undefined && updates.internalNotes !== current.internalNotes) {
    current.history.push({
      id: `h-${Date.now()}`,
      timestamp: now,
      type: 'note_added',
      description: 'Observação interna atualizada'
    });
  }

  // Recalculate participantCount if adults/children updated
  const adults = updates.adultsCount !== undefined ? Number(updates.adultsCount) : current.adultsCount;
  const children = updates.childrenCount !== undefined ? Number(updates.childrenCount) : current.childrenCount;
  let participantCount = updates.participantCount !== undefined ? Number(updates.participantCount) : current.participantCount;
  if (adults !== undefined || children !== undefined) {
    participantCount = Math.max(1, (adults || 0) + (children || 0));
  }

  const updated: Invitation = {
    ...current,
    ...updates,
    adultsCount: adults,
    childrenCount: children,
    participantCount,
    updatedAt: now
  };

  db.invitations[invitationIndex] = updated;
  saveDatabase();

  broadcastSSE('invitation_updated', updated);
  res.json(updated);
});

// ADMIN: Check-In with Partial Support
app.post('/api/invitations/:id/checkin', (req, res) => {
  const invitationIndex = db.invitations.findIndex((i) => i.id === req.params.id);
  if (invitationIndex === -1) {
    return res.status(404).json({ error: 'Convite não encontrado.' });
  }

  const inv = db.invitations[invitationIndex];
  const now = new Date().toISOString();
  const { checkedInCount, undo } = req.body || {};

  if (undo || (inv.status === 'checked_in' && checkedInCount === undefined)) {
    // Undo checkin
    inv.status = 'confirmed';
    inv.checkedInAt = null;
    inv.checkedInCount = 0;
    inv.history.push({
      id: `h-${Date.now()}`,
      timestamp: now,
      type: 'checkin_undone',
      description: 'Check-in desfeito pelo administrador'
    });
  } else {
    // Perform check-in (supports partial count)
    const targetCount = checkedInCount !== undefined
      ? Math.max(1, Number(checkedInCount))
      : (inv.participantCount || 1);

    inv.status = 'checked_in';
    inv.checkedInAt = now;
    inv.checkedInCount = targetCount;
    if (inv.participantCount === 0) {
      inv.participantCount = targetCount;
    }

    const isPartial = targetCount < (inv.participantCount || 1);
    const desc = isPartial
      ? `Check-in parcial registrado: ${targetCount} de ${inv.participantCount} convidados presentes`
      : `Check-in completo registrado (${targetCount} ${targetCount === 1 ? 'pessoa presente' : 'pessoas presentes'})`;

    inv.history.push({
      id: `h-${Date.now()}`,
      timestamp: now,
      type: 'checked_in',
      description: desc
    });

    const notif: NotificationItem = {
      id: `notif-${Date.now()}`,
      eventId: inv.eventId,
      title: 'Entrada Registrada',
      message: `${inv.familyOrGroup || inv.condoName} (${inv.responsibleName || inv.managerName}): ${targetCount} de ${inv.participantCount} presentes.`,
      timestamp: now,
      type: 'check_in',
      invitationCode: inv.code,
      read: false
    };
    db.notifications.unshift(notif);
  }

  inv.updatedAt = now;
  db.invitations[invitationIndex] = inv;
  saveDatabase();

  broadcastSSE('invitation_checkin', inv);
  res.json(inv);
});

// ADMIN: Log WhatsApp Opened
app.post('/api/invitations/:id/log-whatsapp', (req, res) => {
  const invitationIndex = db.invitations.findIndex((i) => i.id === req.params.id);
  if (invitationIndex === -1) {
    return res.status(404).json({ error: 'Convite não encontrado.' });
  }

  const { templateType } = req.body;
  const inv = db.invitations[invitationIndex];
  const now = new Date().toISOString();

  inv.history.push({
    id: `h-${Date.now()}`,
    timestamp: now,
    type: 'whatsapp_opened',
    description: `Mensagem WhatsApp disparada/aberta (${templateType || 'padrão'})`
  });
  inv.updatedAt = now;
  db.invitations[invitationIndex] = inv;
  saveDatabase();

  broadcastSSE('invitation_updated', inv);
  res.json(inv);
});

// ADMIN: Delete Invitation
app.delete('/api/invitations/:id', (req, res) => {
  const inv = db.invitations.find((i) => i.id === req.params.id);
  if (!inv) {
    return res.status(404).json({ error: 'Convite não encontrado.' });
  }

  db.invitations = db.invitations.filter((i) => i.id !== req.params.id);
  saveDatabase();

  broadcastSSE('invitation_deleted', { id: req.params.id, eventId: inv.eventId });
  res.json({ success: true });
});

// Notifications Endpoints
app.get('/api/notifications', (req, res) => {
  res.json(db.notifications);
});

app.post('/api/notifications/:id/read', (req, res) => {
  const notif = db.notifications.find((n) => n.id === req.params.id);
  if (notif) {
    notif.read = true;
    saveDatabase();
  }
  res.json({ success: true });
});

app.post('/api/notifications/mark-all-read', (req, res) => {
  db.notifications.forEach((n) => (n.read = true));
  saveDatabase();
  broadcastSSE('notifications_read', {});
  res.json({ success: true });
});

app.post('/api/notifications/clear', (req, res) => {
  db.notifications = [];
  saveDatabase();
  broadcastSSE('notifications_cleared', {});
  res.json({ success: true });
});

// -------------------------------------------------------------
// DYNAMIC OPEN GRAPH (OG) SOCIAL SHARING PREVIEW GENERATOR
// -------------------------------------------------------------

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const datePart = dateStr.split('T')[0];
      const parts = datePart.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

function generateOgSvg(params: {
  eventTitle: string;
  shareTitle?: string;
  shareDescription?: string;
  dateStr?: string;
  timeStr?: string;
  locationStr?: string;
  condoName?: string;
  managerName?: string;
  code?: string;
}): string {
  const title = params.shareTitle || params.eventTitle || 'Aniversário da Lorena';
  const desc = params.shareDescription || 'Convite Especial - Aniversário da Lorena. Confirme sua presença.';
  const dateFormatted = params.dateStr ? formatDateDisplay(params.dateStr) : '10 de Janeiro de 2027';
  const timeFormatted = params.timeStr || 'A partir das 16h';
  const location = params.locationStr || 'Rua Cachoeira, nº 34, Jardim Rosa de França, Guarulhos';
  const isPersonalized = !!params.condoName;

  const escapeXml = (unsafe: string) =>
    (unsafe || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const safeTitle = escapeXml(title);
  const safeDesc = escapeXml(desc);
  const safeLocation = escapeXml(location);
  const safeCondo = escapeXml(params.condoName || '');
  const safeManager = escapeXml(params.managerName || '');

  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradient: Ativa Sophisticated Dark Cyan/Navy Palette -->
    <radialGradient id="bgGrad" cx="25%" cy="20%" r="95%">
      <stop offset="0%" stop-color="#083042" />
      <stop offset="35%" stop-color="#041a29" />
      <stop offset="75%" stop-color="#020d15" />
      <stop offset="100%" stop-color="#01060a" />
    </radialGradient>

    <!-- Glowing Accents -->
    <radialGradient id="glowCyan" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#00d2ff" stop-opacity="0.32" />
      <stop offset="60%" stop-color="#0077b6" stop-opacity="0.08" />
      <stop offset="100%" stop-color="#000" stop-opacity="0" />
    </radialGradient>

    <radialGradient id="glowBlue" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#0284c7" stop-opacity="0.28" />
      <stop offset="100%" stop-color="#000" stop-opacity="0" />
    </radialGradient>

    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#082638" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#021420" stop-opacity="0.98" />
    </linearGradient>

    <linearGradient id="btnGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00c0f0" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>

    <filter id="dropShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#000000" flood-opacity="0.75" />
    </filter>
  </defs>

  <!-- Base Canvas -->
  <rect width="1200" height="630" fill="url(#bgGrad)" />

  <!-- Ambient Glows -->
  <circle cx="220" cy="140" r="420" fill="url(#glowCyan)" />
  <circle cx="1080" cy="520" r="460" fill="url(#glowBlue)" />

  <!-- Subtle Geometric Decorative Grid -->
  <g stroke="#00e5ff" stroke-opacity="0.08" stroke-width="1">
    <line x1="0" y1="90" x2="1200" y2="90" />
    <line x1="0" y1="540" x2="1200" y2="540" />
    <line x1="70" y1="0" x2="70" y2="630" />
    <line x1="1130" y1="0" x2="1130" y2="630" />
  </g>

  <!-- Top Header: Brand & Partners -->
  <g transform="translate(70, 42)">
    <!-- Ativa Logo Emblem -->
    <rect x="0" y="0" width="50" height="50" rx="14" fill="#0284c7" fill-opacity="0.25" stroke="#38bdf8" stroke-width="1.8" />
    <polygon points="25,10 40,38 10,38" fill="#38bdf8" />
    <circle cx="25" cy="29" r="4.5" fill="#031624" />

    <!-- Brand Text -->
    <text x="66" y="24" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="23" font-weight="900" fill="#ffffff" letter-spacing="3.5">GRUPO ATIVA</text>
    <text x="66" y="43" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#38bdf8" letter-spacing="1.5">SOLUÇÕES CONDOMINIAIS &amp; SEGURANÇA</text>

    <!-- Partner Tag -->
    <rect x="750" y="6" width="310" height="38" rx="19" fill="#032034" stroke="#0ea5e9" stroke-width="1.5" />
    <circle cx="772" cy="25" r="5" fill="#38bdf8" />
    <text x="788" y="30" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" fill="#e0f2fe" letter-spacing="1.2">✦ PARCERIA OFICIAL INTELBRAS</text>
  </g>

  <!-- Main Content Card Frame -->
  <rect x="70" y="118" width="1060" height="440" rx="26" fill="url(#cardGrad)" stroke="#1a4f70" stroke-width="1.5" filter="url(#dropShadow)" />

  <!-- Invitation VIP Category Badge -->
  <g transform="translate(115, 150)">
    <rect x="0" y="0" width="240" height="32" rx="16" fill="#0284c7" fill-opacity="0.25" stroke="#38bdf8" stroke-width="1.2" />
    <text x="120" y="20" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="800" fill="#38bdf8" text-anchor="middle" letter-spacing="1.8">★ CONVITE EXCLUSIVO VIP</text>
  </g>

  <!-- Event Main Title -->
  <text x="115" y="235" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="38" font-weight="900" fill="#ffffff" letter-spacing="-0.5">
    ${safeTitle.length > 46 ? safeTitle.substring(0, 44) + '...' : safeTitle}
  </text>

  <!-- Description / Subtitle -->
  <text x="115" y="278" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="400" fill="#cbd5e1">
    ${safeDesc.length > 84 ? safeDesc.substring(0, 82) + '...' : safeDesc}
  </text>

  <!-- Personalized Recipient Box (if invitation is addressed) -->
  ${
    isPersonalized
      ? `<g transform="translate(115, 308)">
    <rect x="0" y="0" width="970" height="74" rx="14" fill="#041f32" stroke="#0ea5e9" stroke-width="1.2" />
    <text x="24" y="27" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="800" fill="#38bdf8" letter-spacing="1.2">CONVITE DESTINADO ESPECIALMENTE A:</text>
    <text x="24" y="54" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="900" fill="#ffffff">${safeCondo}${safeManager ? ' • ' + safeManager : ''}</text>
  </g>`
      : `<g transform="translate(115, 308)">
    <rect x="0" y="0" width="970" height="74" rx="14" fill="#041f32" stroke="#1c4866" stroke-width="1.2" />
    <text x="24" y="27" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="800" fill="#38bdf8" letter-spacing="1.2">PÚBLICO-ALVO &amp; CONVIDADOS:</text>
    <text x="24" y="54" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="19" font-weight="800" fill="#ffffff">Síndicos, Conselheiros, Administradores e Zeladores de Condomínios</text>
  </g>`
  }

  <!-- Event Quick Badges (Date / Location / RSVP Button) -->
  <g transform="translate(115, 410)">
    <!-- Date Badge -->
    <rect x="0" y="0" width="280" height="52" rx="14" fill="#021d2d" stroke="#0ea5e9" stroke-width="1" />
    <text x="20" y="23" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="800" fill="#38bdf8" letter-spacing="1">📅 DATA &amp; HORÁRIO</text>
    <text x="20" y="42" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="800" fill="#ffffff">${dateFormatted} às ${timeFormatted}</text>

    <!-- Location Badge -->
    <rect x="300" y="0" width="370" height="52" rx="14" fill="#021d2d" stroke="#0ea5e9" stroke-width="1" />
    <text x="320" y="23" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="800" fill="#38bdf8" letter-spacing="1">📍 LOCAL DO EVENTO</text>
    <text x="320" y="42" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="800" fill="#ffffff">${safeLocation.length > 34 ? safeLocation.substring(0, 32) + '...' : safeLocation}</text>

    <!-- CTA Button -->
    <g transform="translate(690, 0)">
      <rect x="0" y="0" width="280" height="52" rx="14" fill="url(#btnGrad)" />
      <text x="140" y="32" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">CONFIRME SUA PRESENÇA ➔</text>
    </g>
  </g>

  <!-- Bottom Subtext / Status -->
  <g transform="translate(115, 510)">
    <circle cx="6" cy="6" r="4.5" fill="#10b981" />
    <text x="20" y="10" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600" fill="#94a3b8">Confirmação de Presença Online Instantânea • Vagas Limitadas</text>
    <text x="970" y="10" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700" fill="#38bdf8" text-anchor="end">grupoativa.com.br</text>
  </g>
</svg>`;
}

// Endpoint: Open Graph Image for Invitation
app.get('/api/og-image/invitation/:code', (req, res) => {
  const code = req.params.code;
  const inv = db.invitations.find(
    (i) => i.code.toUpperCase() === code.toUpperCase() || i.id === code
  );
  const event = inv ? db.events.find((e) => e.id === inv.eventId) : db.events[0];

  // If custom image is set as data URL or external URL and requested directly
  if (inv?.customShareImageUrl) {
    if (inv.customShareImageUrl.startsWith('data:image')) {
      const parts = inv.customShareImageUrl.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
      const imgBuffer = Buffer.from(parts[1], 'base64');
      res.set('Content-Type', mime);
      res.set('Cache-Control', 'public, max-age=3600');
      return res.send(imgBuffer);
    } else if (inv.customShareImageUrl.startsWith('http')) {
      return res.redirect(inv.customShareImageUrl);
    }
  }

  if (event?.shareImageUrl && event.shareImageUrl.startsWith('data:image')) {
    const parts = event.shareImageUrl.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
    const imgBuffer = Buffer.from(parts[1], 'base64');
    res.set('Content-Type', mime);
    res.set('Cache-Control', 'public, max-age=3600');
    return res.send(imgBuffer);
  } else if (event?.shareImageUrl && event.shareImageUrl.startsWith('http')) {
    return res.redirect(event.shareImageUrl);
  }

  const svg = generateOgSvg({
    eventTitle: event?.title || 'Aniversário da Lorena',
    shareTitle: event?.shareTitle,
    shareDescription: event?.shareDescription,
    dateStr: event?.date,
    timeStr: event?.time,
    locationStr: event?.location,
    condoName: inv?.condoName,
    managerName: inv?.managerName,
    code: inv?.code
  });

  res.set('Content-Type', 'image/svg+xml; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=3600');
  res.send(svg);
});

// Endpoint: Open Graph Image for Event
app.get('/api/og-image/event/:eventId', (req, res) => {
  const event = db.events.find((e) => e.id === req.params.eventId) || db.events[0];

  if (event?.shareImageUrl && event.shareImageUrl.startsWith('data:image')) {
    const parts = event.shareImageUrl.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
    const imgBuffer = Buffer.from(parts[1], 'base64');
    res.set('Content-Type', mime);
    res.set('Cache-Control', 'public, max-age=3600');
    return res.send(imgBuffer);
  } else if (event?.shareImageUrl && event.shareImageUrl.startsWith('http')) {
    return res.redirect(event.shareImageUrl);
  }

  const svg = generateOgSvg({
    eventTitle: event?.title || 'Aniversário da Lorena',
    shareTitle: event?.shareTitle,
    shareDescription: event?.shareDescription,
    dateStr: event?.date,
    timeStr: event?.time,
    locationStr: event?.location
  });

  res.set('Content-Type', 'image/svg+xml; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=3600');
  res.send(svg);
});

// Endpoint: Live Open Graph Image Preview (with query params)
app.get('/api/og-image/preview', (req, res) => {
  const { title, desc, date, time, location, condo, manager } = req.query;
  const svg = generateOgSvg({
    eventTitle: (title as string) || 'Aniversário da Lorena',
    shareTitle: (title as string) || undefined,
    shareDescription: (desc as string) || undefined,
    dateStr: (date as string) || undefined,
    timeStr: (time as string) || undefined,
    locationStr: (location as string) || undefined,
    condoName: (condo as string) || undefined,
    managerName: (manager as string) || undefined
  });

  res.set('Content-Type', 'image/svg+xml; charset=utf-8');
  res.send(svg);
});

// Function to inject Open Graph meta tags into raw HTML
function generateOgHtml(req: express.Request, rawHtml: string, code?: string, eventId?: string): string {
  let inv: Invitation | undefined;
  let event: CondoEvent | undefined;

  if (code && code !== 'geral') {
    inv = db.invitations.find(
      (i) => i.code.toUpperCase() === code.toUpperCase() || i.id === code
    );
    if (inv) {
      event = db.events.find((e) => e.id === inv!.eventId);
    }
  }

  if (!event) {
    if (eventId) {
      event = db.events.find((e) => e.id === eventId);
    } else {
      event = db.events[0];
    }
  }

  const host = req.get('host') || 'localhost:3000';
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const baseUrl = `${protocol}://${host}`;

  const eventTitle = event?.shareTitle || event?.title || 'Aniversário da Lorena';
  const ogTitle = inv?.condoName
    ? `${inv.condoName} | Convite Especial - ${eventTitle}`
    : `${eventTitle} | Convite Especial`;

  let ogDescription = event?.shareDescription || 'Convite especial para Síndicos e Zeladores. Confirme sua presença.';
  if (inv) {
    const formattedDate = formatDateDisplay(event?.date);
    ogDescription = `Convite especial para Síndicos e Zeladores do ${inv.condoName}. Confirme sua presença.${
      formattedDate ? ` 📅 ${formattedDate} às ${event?.time || '19:00'}` : ''
    }.`;
  }

  const currentUrl = `${baseUrl}${req.originalUrl.split('?')[0]}`;

  let ogImageUrl = '';
  let ogImageType = 'image/jpeg';

  if (inv?.customShareImageUrl && inv.customShareImageUrl.startsWith('http')) {
    ogImageUrl = inv.customShareImageUrl;
    ogImageType = inv.customShareImageUrl.endsWith('.png') ? 'image/png' : 'image/jpeg';
  } else if (event?.shareImageUrl && event.shareImageUrl.startsWith('http')) {
    ogImageUrl = event.shareImageUrl;
    ogImageType = event.shareImageUrl.endsWith('.png') ? 'image/png' : 'image/jpeg';
  } else if (event?.bannerUrl && event.bannerUrl.startsWith('http')) {
    ogImageUrl = event.bannerUrl;
    ogImageType = event.bannerUrl.endsWith('.png') ? 'image/png' : 'image/jpeg';
  } else if (inv?.customShareImageUrl && inv.customShareImageUrl.startsWith('data:image')) {
    ogImageUrl = `${baseUrl}/api/og-image/invitation/${inv.code}`;
    ogImageType = inv.customShareImageUrl.includes('image/png') ? 'image/png' : 'image/jpeg';
  } else if (event?.shareImageUrl && event.shareImageUrl.startsWith('data:image')) {
    ogImageUrl = `${baseUrl}/api/og-image/event/${event.id}`;
    ogImageType = event.shareImageUrl.includes('image/png') ? 'image/png' : 'image/jpeg';
  } else {
    // Fallback to high-res event banner or direct raster image for WhatsApp crawler
    ogImageUrl = event?.bannerUrl || 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80';
    ogImageType = 'image/jpeg';
  }

  let html = rawHtml;

  // Replace title
  html = html.replace(/<title>.*?<\/title>/gi, `<title>${escapeHtml(ogTitle)}</title>`);

  // Remove existing meta tags
  html = html.replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/gi, '');
  html = html.replace(/<meta\s+property="og:.*?"\s*content=".*?"\s*\/?>/gi, '');
  html = html.replace(/<meta\s+name="twitter:.*?"\s*content=".*?"\s*\/?>/gi, '');

  const metaTags = `
    <meta name="description" content="${escapeHtml(ogDescription)}" />
    <meta property="og:site_name" content="Grupo Ativa" />
    <meta property="og:title" content="${escapeHtml(ogTitle)}" />
    <meta property="og:description" content="${escapeHtml(ogDescription)}" />
    <meta property="og:image" content="${escapeHtml(ogImageUrl)}" />
    <meta property="og:image:secure_url" content="${escapeHtml(ogImageUrl)}" />
    <meta property="og:image:type" content="${ogImageType}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${escapeHtml(eventTitle)}" />
    <meta property="og:url" content="${escapeHtml(currentUrl)}" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="pt_BR" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(ogTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(ogDescription)}" />
    <meta name="twitter:image" content="${escapeHtml(ogImageUrl)}" />
  `;

  return html.replace('</head>', `${metaTags}\n  </head>`);
}

// -------------------------------------------------------------
// VITE MIDDLEWARE & SERVER STARTUP
// -------------------------------------------------------------

let viteInstance: any = null;

// Route interceptor for Invitation pages with Dynamic Open Graph tags
app.get(['/convite/:code', '/convite/geral', '/convite', '/'], async (req, res, next) => {
  if (
    req.path.startsWith('/api') ||
    req.path.startsWith('/@') ||
    req.path.startsWith('/src') ||
    req.path.startsWith('/node_modules') ||
    req.path.includes('.')
  ) {
    return next();
  }

  try {
    const code = req.params.code;
    let templatePath = path.join(process.cwd(), 'index.html');
    if (process.env.NODE_ENV === 'production') {
      const distIndex = path.join(process.cwd(), 'dist', 'index.html');
      if (fs.existsSync(distIndex)) {
        templatePath = distIndex;
      }
    }
    let html = fs.readFileSync(templatePath, 'utf-8');

    if (viteInstance && process.env.NODE_ENV !== 'production') {
      html = await viteInstance.transformIndexHtml(req.originalUrl, html);
    }

    const modifiedHtml = generateOgHtml(req, html, code);
    res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).send(modifiedHtml);
  } catch (e) {
    next(e);
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    viteInstance = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(viteInstance.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Realtime Invitation & RSVP Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
