import { CondoEvent, Invitation, NotificationItem } from '../types';

export const API_BASE = '/api';

const LOCAL_STORAGE_KEY = 'ativa_app_db_v2';

const INITIAL_FALLBACK_DB: {
  adminPin: string;
  events: CondoEvent[];
  invitations: Invitation[];
  notifications: NotificationItem[];
} = {
  adminPin: 'admin123',
  events: [
    {
      id: 'evt-2026-seguranca',
      title: 'Aniversário da Lorena',
      date: '2027-01-10',
      time: 'A partir das 16h',
      location: 'Rua Cachoeira, nº 34, Jardim Rosa de França, Guarulhos',
      address: 'Rua Cachoeira, nº 34, Jardim Rosa de França, Guarulhos',
      bannerUrl: '/covers/default-cover.png',
      logoUrl: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=300&q=80',
      presentationText: 'Bem-vindo ao Aniversário da Lorena! Confirme sua presença abaixo.',
      shareTitle: 'Aniversário da Lorena | Confirmação de Presença',
      shareDescription: 'Convite Especial - Aniversário da Lorena. Confirme sua presença.',
      requireJanitor: false,
      maxParticipants: 150,
      confirmationDeadline: '2027-01-08',
      waitingListEnabled: true,
      status: 'active',
      whatsappTemplates: {
        confirmed: 'Olá, {Nome}! 🎉\n\nRecebemos com muita alegria a confirmação para o {Evento}!\nSerá maravilhoso celebrar esse momento especial com você e sua família.\n\n📅 Data: {Data}\n🕐 Horário: {Horario}\n📍 Local: {Local}\n📌 Endereço: {Endereco}\n\nEsperamos por vocês!',
        viewedNotConfirmed: 'Olá, {Nome}! Tudo bem?\n\nPassando com carinho para lembrar do convite para o {Evento}.\n\nA presença de vocês tornará a festa da Lorena ainda mais encantadora!\n\nConfirme sua presença no link abaixo:\n{Link}\n\nQualquer dúvida estamos à disposição! 🎈',
        notViewed: 'Olá, {Nome}! Você é nosso convidado de honra!\n\nPreparamos com muito amor o convite do {Evento}.\n\nPara conferir os detalhes e confirmar a presença de sua família, acesse:\n{Link}\n\nEsperamos você! 🎂✨',
        reminder: 'Olá, {Nome}! O grande dia está chegando! 🎈\n\nLembramos que o {Evento} acontecerá em breve:\n📅 Data: {Data}\n🕐 Horário: {Horario}\n📍 Local: {Local}\n\nSeu passe com QR Code para entrada no dia:\n{Link}\n\nAté logo!',
        thankYou: 'Olá, {Nome}! Agradecemos imensamente a sua presença no {Evento}. Foi inesquecível ter vocês comemorando esse dia tão especial com a Lorena! 💖🎉'
      },
      createdAt: '2026-08-28T02:43:42.858Z',
      updatedAt: '2026-09-08T23:48:00.000Z',
      coverHotspots: [
        {
          id: 'hs-1',
          name: 'Confirmar Presença',
          actionType: 'confirm_rsvp',
          targetUrl: '#formulario',
          openInNewTab: false,
          x: 5.6,
          y: 64.5,
          width: 43.4,
          height: 6.0
        },
        {
          id: 'hs-2',
          name: 'Saber Como Chegar',
          actionType: 'google_maps',
          targetUrl: 'https://maps.google.com/?q=Rua+Cachoeira%2C+n%C2%BA+34%2C+Jardim+Rosa+de+Fran%C3%A7a%2C+Guarulhos',
          openInNewTab: true,
          x: 51.3,
          y: 64.4,
          width: 43.3,
          height: 6.0
        }
      ]
    }
  ],
  invitations: [
    {
      id: 'inv-1788327021288-0k12',
      code: 'TQLBX2',
      eventId: 'evt-2026-seguranca',
      condoName: 'sol',
      managerName: 'Adriano',
      janitorName: 'Antonio',
      whatsapp: '(11) 93473-9629',
      attendeeRole: 'both',
      participantCount: 2,
      status: 'confirmed',
      viewCount: 1,
      firstViewedAt: '2026-09-02T05:30:21.288Z',
      lastViewedAt: '2026-09-02T05:30:21.288Z',
      confirmedAt: '2026-09-02T05:30:21.288Z',
      declinedAt: null,
      checkedInAt: null,
      internalNotes: 'Inscrição via Link Geral',
      history: [
        {
          id: 'h-1',
          timestamp: '2026-09-02T05:30:21.288Z',
          type: 'created',
          description: 'Convite gerado automaticamente via Formulário Geral'
        },
        {
          id: 'h-2',
          timestamp: '2026-09-02T05:30:21.288Z',
          type: 'confirmed',
          description: 'Presença confirmada pelo formulário aberto: Síndico e Zelador (2 pessoas)'
        }
      ],
      createdAt: '2026-09-02T05:30:21.288Z',
      updatedAt: '2026-09-02T05:30:58.775Z'
    }
  ],
  notifications: [
    {
      id: 'notif-1788327021331',
      eventId: 'evt-2026-seguranca',
      title: 'Nova Inscrição (Formulário Geral)',
      message: 'sol (Adriano) confirmou presença pelo link geral (2 pessoas).',
      timestamp: '2026-09-02T05:30:21.288Z',
      type: 'confirmed',
      invitationCode: 'TQLBX2',
      read: false
    }
  ]
};

function getLocalDb() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.events)) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  saveLocalDb(INITIAL_FALLBACK_DB);
  return INITIAL_FALLBACK_DB;
}

function saveLocalDb(db: any) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    console.error('Failed to save to local storage', e);
  }
}

async function requestApi<T>(
  url: string,
  options?: RequestInit
): Promise<{ ok: boolean; data?: T; isFallback: boolean; error?: string }> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/html') || res.status === 404) {
      // Static host fallback (e.g. Netlify serving index.html for unknown paths)
      return { ok: false, isFallback: true };
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, isFallback: false, error: err.error || res.statusText };
    }
    const data = await res.json();
    return { ok: true, data, isFallback: false };
  } catch {
    return { ok: false, isFallback: true };
  }
}

export async function uploadImage(fileOrBase64: File | string, filename?: string): Promise<{ url: string; success: boolean }> {
  let base64 = '';
  let name = filename || 'image.png';

  if (typeof fileOrBase64 === 'string') {
    base64 = fileOrBase64;
  } else {
    name = fileOrBase64.name;
    base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(fileOrBase64);
    });
  }

  const result = await requestApi<{ url: string; success: boolean }>(`${API_BASE}/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64, filename: name }),
    cache: 'no-store'
  });

  if (result.ok && result.data) {
    return result.data;
  }
  if (!result.isFallback && result.error) {
    throw new Error(result.error);
  }

  // Fallback: return base64 Data URL directly
  return { url: base64, success: true };
}

export async function fetchEvents(): Promise<CondoEvent[]> {
  const result = await requestApi<CondoEvent[]>(`${API_BASE}/events`, { cache: 'no-store' });
  if (result.ok && result.data) {
    return result.data;
  }
  if (!result.isFallback && result.error) {
    throw new Error(result.error);
  }

  const db = getLocalDb();
  return db.events;
}

export async function createEvent(data: Partial<CondoEvent>): Promise<CondoEvent> {
  const result = await requestApi<CondoEvent>(`${API_BASE}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    cache: 'no-store'
  });

  if (result.ok && result.data) {
    return result.data;
  }
  if (!result.isFallback && result.error) {
    throw new Error(result.error);
  }

  const db = getLocalDb();
  const newEvent: CondoEvent = {
    id: 'evt-' + Date.now(),
    title: data.title || 'Aniversário da Lorena',
    date: data.date || '2027-01-10',
    time: data.time || 'A partir das 16h',
    location: data.location || 'Rua Cachoeira, nº 34, Jardim Rosa de França, Guarulhos',
    address: data.address || 'Rua Cachoeira, nº 34, Jardim Rosa de França, Guarulhos',
    bannerUrl: data.bannerUrl || '/covers/default-cover.png',
    logoUrl: data.logoUrl,
    presentationText: data.presentationText || '',
    shareTitle: data.shareTitle || data.title || 'Novo Evento',
    shareDescription: data.shareDescription || '',
    requireJanitor: data.requireJanitor !== false,
    maxParticipants: data.maxParticipants || 50,
    confirmationDeadline: data.confirmationDeadline,
    waitingListEnabled: data.waitingListEnabled !== false,
    status: data.status || 'active',
    coverHotspots: data.coverHotspots || [],
    whatsappTemplates: data.whatsappTemplates || INITIAL_FALLBACK_DB.events[0].whatsappTemplates,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.events.unshift(newEvent);
  saveLocalDb(db);
  return newEvent;
}

export async function updateEvent(id: string, data: Partial<CondoEvent>): Promise<CondoEvent> {
  const result = await requestApi<CondoEvent>(`${API_BASE}/events/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    cache: 'no-store'
  });

  if (result.ok && result.data) {
    return result.data;
  }
  if (!result.isFallback && result.error) {
    throw new Error(result.error);
  }

  const db = getLocalDb();
  const idx = db.events.findIndex((e: CondoEvent) => e.id === id);
  if (idx === -1) throw new Error('Evento não encontrado no armazenamento local.');
  db.events[idx] = { ...db.events[idx], ...data, updatedAt: new Date().toISOString() };
  saveLocalDb(db);
  return db.events[idx];
}

export async function deleteEvent(id: string): Promise<void> {
  const result = await requestApi<void>(`${API_BASE}/events/${id}`, { method: 'DELETE', cache: 'no-store' });
  if (result.ok) return;
  if (!result.isFallback && result.error) throw new Error(result.error);

  const db = getLocalDb();
  db.events = db.events.filter((e: CondoEvent) => e.id !== id);
  db.invitations = db.invitations.filter((i: Invitation) => i.eventId !== id);
  saveLocalDb(db);
}

export async function fetchInvitations(eventId: string): Promise<Invitation[]> {
  const result = await requestApi<Invitation[]>(`${API_BASE}/events/${eventId}/invitations`, { cache: 'no-store' });
  if (result.ok && result.data) return result.data;
  if (!result.isFallback && result.error) throw new Error(result.error);

  const db = getLocalDb();
  return db.invitations.filter((i: Invitation) => i.eventId === eventId);
}

export async function checkDuplicate(
  eventId: string,
  params: { condoName?: string; managerName?: string; whatsapp?: string; excludeId?: string }
): Promise<{ hasDuplicate: boolean; duplicates: Invitation[] }> {
  const result = await requestApi<{ hasDuplicate: boolean; duplicates: Invitation[] }>(
    `${API_BASE}/events/${eventId}/check-duplicate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      cache: 'no-store'
    }
  );

  if (result.ok && result.data) return result.data;
  if (!result.isFallback && result.error) return { hasDuplicate: false, duplicates: [] };

  const db = getLocalDb();
  const eventInvs = db.invitations.filter((i: Invitation) => i.eventId === eventId && i.id !== params.excludeId);
  const cleanCondo = (params.condoName || '').trim().toLowerCase();
  const cleanPhone = (params.whatsapp || '').replace(/\D/g, '');

  const duplicates = eventInvs.filter((i: Invitation) => {
    if (cleanCondo && i.condoName.trim().toLowerCase() === cleanCondo) return true;
    if (cleanPhone && i.whatsapp.replace(/\D/g, '') === cleanPhone) return true;
    return false;
  });

  return { hasDuplicate: duplicates.length > 0, duplicates };
}

function generateInvitationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function createInvitation(
  eventId: string,
  data: {
    responsibleName?: string;
    familyOrGroup?: string;
    guestsNames?: string;
    adultsCount?: number;
    childrenCount?: number;
    specialNeeds?: string;
    condoName?: string;
    managerName?: string;
    janitorName?: string;
    whatsapp: string;
    internalNotes?: string;
    customShareImageUrl?: string;
    status?: Invitation['status'];
  }
): Promise<Invitation> {
  const result = await requestApi<Invitation>(`${API_BASE}/events/${eventId}/invitations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    cache: 'no-store'
  });

  if (result.ok && result.data) return result.data;
  if (!result.isFallback && result.error) throw new Error(result.error);

  const db = getLocalDb();
  const respName = data.responsibleName || data.managerName || '';
  const famName = data.familyOrGroup || data.condoName || respName;
  const guests = data.guestsNames || data.janitorName || '';
  const adults = data.adultsCount !== undefined ? data.adultsCount : 1;
  const children = data.childrenCount || 0;

  const newInvitation: Invitation = {
    id: 'inv-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    code: generateInvitationCode(),
    eventId,
    responsibleName: respName,
    familyOrGroup: famName,
    guestsNames: guests,
    adultsCount: adults,
    childrenCount: children,
    specialNeeds: data.specialNeeds || '',
    condoName: famName,
    managerName: respName,
    janitorName: guests,
    whatsapp: data.whatsapp,
    attendeeRole: 'manager',
    participantCount: adults + children,
    status: data.status || 'not_viewed',
    viewCount: 0,
    firstViewedAt: null,
    lastViewedAt: null,
    confirmedAt: null,
    declinedAt: null,
    checkedInAt: null,
    internalNotes: data.internalNotes,
    customShareImageUrl: data.customShareImageUrl,
    history: [
      {
        id: 'h-' + Date.now(),
        timestamp: new Date().toISOString(),
        type: 'created',
        description: 'Convite criado no painel administrativo'
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.invitations.unshift(newInvitation);
  saveLocalDb(db);
  return newInvitation;
}

export async function batchImportInvitations(
  eventId: string,
  items: Array<{
    responsibleName?: string;
    familyOrGroup?: string;
    guestsNames?: string;
    adultsCount?: number;
    childrenCount?: number;
    condoName?: string;
    managerName?: string;
    janitorName?: string;
    whatsapp: string;
    internalNotes?: string;
  }>
): Promise<{ success: boolean; importedCount: number; invitations: Invitation[] }> {
  const result = await requestApi<{ success: boolean; importedCount: number; invitations: Invitation[] }>(
    `${API_BASE}/events/${eventId}/invitations/batch`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
      cache: 'no-store'
    }
  );

  if (result.ok && result.data) return result.data;
  if (!result.isFallback && result.error) throw new Error(result.error);

  const db = getLocalDb();
  const imported: Invitation[] = items.map((item, idx) => ({
    id: `inv-${Date.now()}-${idx}`,
    code: generateInvitationCode(),
    eventId,
    condoName: item.condoName,
    managerName: item.managerName,
    janitorName: item.janitorName,
    whatsapp: item.whatsapp,
    attendeeRole: 'manager',
    participantCount: 1,
    status: 'pending',
    viewCount: 0,
    firstViewedAt: null,
    lastViewedAt: null,
    confirmedAt: null,
    declinedAt: null,
    checkedInAt: null,
    internalNotes: item.internalNotes,
    history: [
      {
        id: `h-${Date.now()}-${idx}`,
        timestamp: new Date().toISOString(),
        type: 'created',
        description: 'Convite importado via planilha'
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));

  db.invitations.unshift(...imported);
  saveLocalDb(db);
  return { success: true, importedCount: imported.length, invitations: imported };
}

export async function getActiveEventPublic(): Promise<{
  event: CondoEvent;
  confirmedParticipants: number;
  availableSlots: number;
}> {
  const result = await requestApi<{
    event: CondoEvent;
    confirmedParticipants: number;
    availableSlots: number;
  }>(`${API_BASE}/events/active/public`, { cache: 'no-store' });

  if (result.ok && result.data) return result.data;
  if (!result.isFallback && result.error) throw new Error(result.error);

  const db = getLocalDb();
  const event = db.events.find((e: CondoEvent) => e.status === 'active') || db.events[0];
  if (!event) throw new Error('Nenhum evento ativo disponível');

  const confirmedCount = db.invitations
    .filter((i: Invitation) => i.eventId === event.id && i.status === 'confirmed')
    .reduce((sum: number, i: Invitation) => sum + (i.participantCount || 1), 0);

  const availableSlots = Math.max(0, (event.maxParticipants || 50) - confirmedCount);

  return { event, confirmedParticipants: confirmedCount, availableSlots };
}

export async function registerPublicInvitation(
  eventId: string,
  data: {
    condoName?: string;
    managerName?: string;
    janitorName?: string;
    whatsapp: string;
    attendeeRole?: 'manager' | 'janitor' | 'both';
    internalNotes?: string;
    responsibleName?: string;
    familyOrGroup?: string;
    adultsCount?: number;
    childrenCount?: number;
    guestsNames?: string;
    guestsList?: import('../types').GuestPerson[];
    specialNeeds?: string;
  }
): Promise<{ success: boolean; invitation: Invitation; event: CondoEvent; isExisting?: boolean }> {
  const result = await requestApi<{ success: boolean; invitation: Invitation; event: CondoEvent; isExisting?: boolean }>(
    `${API_BASE}/events/${eventId}/public-register`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      cache: 'no-store'
    }
  );

  if (result.ok && result.data) return result.data;
  if (!result.isFallback && result.error) throw new Error(result.error);

  const db = getLocalDb();
  const event = db.events.find((e: CondoEvent) => e.id === eventId) || db.events[0];
  const resp = data.responsibleName || data.managerName || data.condoName || 'Convidado';
  const fam = data.familyOrGroup || data.condoName || resp;
  const adults = data.adultsCount !== undefined ? Math.max(1, Number(data.adultsCount)) : (data.attendeeRole === 'both' ? 2 : 1);
  const children = data.childrenCount !== undefined ? Math.max(0, Number(data.childrenCount)) : 0;
  const participantCount = Math.max(1, adults + children);

  const newInv: Invitation = {
    id: 'inv-' + Date.now(),
    code: generateInvitationCode(),
    eventId: event.id,
    responsibleName: resp,
    familyOrGroup: fam,
    condoName: fam,
    managerName: resp,
    janitorName: data.guestsNames || data.janitorName,
    guestsNames: data.guestsNames || resp,
    guestsList: data.guestsList || [],
    adultsCount: adults,
    childrenCount: children,
    participantCount,
    specialNeeds: data.specialNeeds || '',
    whatsapp: data.whatsapp,
    attendeeRole: data.attendeeRole || 'manager',
    status: 'confirmed',
    viewCount: 1,
    firstViewedAt: new Date().toISOString(),
    lastViewedAt: new Date().toISOString(),
    confirmedAt: new Date().toISOString(),
    declinedAt: null,
    checkedInAt: null,
    internalNotes: data.internalNotes || 'Inscrição via Link Geral',
    history: [
      {
        id: 'h-' + Date.now(),
        timestamp: new Date().toISOString(),
        type: 'confirmed',
        description: `Presença confirmada pelo link geral (${participantCount} participante${participantCount > 1 ? 's' : ''})`
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.invitations.unshift(newInv);

  const notif: NotificationItem = {
    id: 'notif-' + Date.now(),
    eventId: event.id,
    title: 'Nova Inscrição (Formulário Geral)',
    message: `${fam} (${resp}) confirmou presença (${participantCount} pessoas: ${adults} adultos, ${children} crianças).`,
    timestamp: new Date().toISOString(),
    type: 'confirmed',
    invitationCode: newInv.code,
    read: false
  };
  db.notifications.unshift(notif);

  saveLocalDb(db);
  return { success: true, invitation: newInv, event, isExisting: false };
}

export async function getInvitationByCode(
  code: string
): Promise<{ invitation: Invitation; event: CondoEvent }> {
  const result = await requestApi<{ invitation: Invitation; event: CondoEvent }>(
    `${API_BASE}/invitations/by-code/${code}`,
    { cache: 'no-store' }
  );

  if (result.ok && result.data) return result.data;
  if (!result.isFallback && result.error) throw new Error(result.error);

  const db = getLocalDb();
  const inv = db.invitations.find((i: Invitation) => i.code.toUpperCase() === code.toUpperCase() || i.id === code);

  if (!inv) {
    // If generic link or not found, fall back to first event
    const ev = db.events[0];
    const syntheticInv: Invitation = {
      id: 'inv-generic',
      code: 'geral',
      eventId: ev.id,
      responsibleName: 'Convidado Especial',
      familyOrGroup: 'Família Convidada',
      condoName: 'Família Convidada',
      managerName: 'Responsável',
      whatsapp: '',
      attendeeRole: 'manager',
      participantCount: 1,
      adultsCount: 1,
      childrenCount: 0,
      status: 'pending',
      viewCount: 1,
      firstViewedAt: new Date().toISOString(),
      lastViewedAt: new Date().toISOString(),
      confirmedAt: null,
      declinedAt: null,
      checkedInAt: null,
      history: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    return { invitation: syntheticInv, event: ev };
  }

  const ev = db.events.find((e: CondoEvent) => e.id === inv.eventId) || db.events[0];
  inv.viewCount = (inv.viewCount || 0) + 1;
  inv.lastViewedAt = new Date().toISOString();
  saveLocalDb(db);

  return { invitation: inv, event: ev };
}

export async function submitRsvp(
  code: string,
  data: {
    action: 'confirm' | 'decline';
    attendeeRole?: 'manager' | 'janitor' | 'both' | 'none';
    condoName?: string;
    managerName?: string;
    janitorName?: string;
    whatsapp?: string;
    responsibleName?: string;
    familyOrGroup?: string;
    adultsCount?: number;
    childrenCount?: number;
    guestsNames?: string;
    guestsList?: import('../types').GuestPerson[];
    specialNeeds?: string;
  }
): Promise<{ success: boolean; invitation: Invitation; event: CondoEvent }> {
  const result = await requestApi<{ success: boolean; invitation: Invitation; event: CondoEvent }>(
    `${API_BASE}/invitations/by-code/${code}/rsvp`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      cache: 'no-store'
    }
  );

  if (result.ok && result.data) return result.data;
  if (!result.isFallback && result.error) throw new Error(result.error);

  const db = getLocalDb();
  const idx = db.invitations.findIndex((i: Invitation) => i.code.toUpperCase() === code.toUpperCase() || i.id === code);
  if (idx === -1) throw new Error('Convite não encontrado no armazenamento local');

  const inv = db.invitations[idx];
  const isConfirm = data.action === 'confirm';
  const adults = data.adultsCount !== undefined ? Math.max(1, Number(data.adultsCount)) : (inv.adultsCount || 1);
  const children = data.childrenCount !== undefined ? Math.max(0, Number(data.childrenCount)) : (inv.childrenCount || 0);
  const participantCount = isConfirm ? Math.max(1, adults + children) : 0;

  inv.status = isConfirm ? 'confirmed' : 'declined';
  inv.participantCount = participantCount;
  inv.adultsCount = adults;
  inv.childrenCount = children;
  if (data.responsibleName) {
    inv.responsibleName = data.responsibleName;
    inv.managerName = data.responsibleName;
  }
  if (data.familyOrGroup) {
    inv.familyOrGroup = data.familyOrGroup;
    inv.condoName = data.familyOrGroup;
  }
  if (data.guestsNames) inv.guestsNames = data.guestsNames;
  if (data.guestsList) inv.guestsList = data.guestsList;
  if (data.specialNeeds !== undefined) inv.specialNeeds = data.specialNeeds;
  if (data.whatsapp) inv.whatsapp = data.whatsapp;
  if (isConfirm) inv.confirmedAt = new Date().toISOString();
  else inv.declinedAt = new Date().toISOString();

  inv.history.push({
    id: 'h-' + Date.now(),
    timestamp: new Date().toISOString(),
    type: isConfirm ? 'confirmed' : 'declined',
    description: isConfirm
      ? `Presença confirmada: ${participantCount} pessoas (${adults} adultos, ${children} crianças)`
      : 'Presença recusada pelo convidado'
  });

  const ev = db.events.find((e: CondoEvent) => e.id === inv.eventId) || db.events[0];
  saveLocalDb(db);
  return { success: true, invitation: inv, event: ev };
}

export async function updateInvitation(id: string, data: Partial<Invitation>): Promise<Invitation> {
  const result = await requestApi<Invitation>(`${API_BASE}/invitations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    cache: 'no-store'
  });

  if (result.ok && result.data) return result.data;
  if (!result.isFallback && result.error) throw new Error(result.error);

  const db = getLocalDb();
  const idx = db.invitations.findIndex((i: Invitation) => i.id === id);
  if (idx === -1) throw new Error('Convite não encontrado');
  db.invitations[idx] = { ...db.invitations[idx], ...data, updatedAt: new Date().toISOString() };
  saveLocalDb(db);
  return db.invitations[idx];
}

export async function toggleCheckin(
  id: string,
  options?: { checkedInCount?: number; undo?: boolean }
): Promise<Invitation> {
  const result = await requestApi<Invitation>(`${API_BASE}/invitations/${id}/checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options || {}),
    cache: 'no-store'
  });

  if (result.ok && result.data) return result.data;
  if (!result.isFallback && result.error) throw new Error(result.error);

  const db = getLocalDb();
  const idx = db.invitations.findIndex((i: Invitation) => i.id === id);
  if (idx === -1) throw new Error('Convite não encontrado');
  const inv = db.invitations[idx];
  inv.checkedInAt = inv.checkedInAt ? null : new Date().toISOString();
  inv.history.push({
    id: 'h-' + Date.now(),
    timestamp: new Date().toISOString(),
    type: 'checkin',
    description: inv.checkedInAt ? 'Check-in presencial realizado' : 'Check-in desfeito'
  });
  saveLocalDb(db);
  return inv;
}

export async function logWhatsAppOpened(id: string, templateType: string): Promise<void> {
  const result = await requestApi<void>(`${API_BASE}/invitations/${id}/log-whatsapp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ templateType })
  });

  if (result.ok) return;

  const db = getLocalDb();
  const idx = db.invitations.findIndex((i: Invitation) => i.id === id);
  if (idx !== -1) {
    db.invitations[idx].history.push({
      id: 'h-' + Date.now(),
      timestamp: new Date().toISOString(),
      type: 'whatsapp_opened',
      description: `Disparo WhatsApp aberto (${templateType})`
    });
    saveLocalDb(db);
  }
}

export async function deleteInvitation(id: string): Promise<void> {
  const result = await requestApi<void>(`${API_BASE}/invitations/${id}`, { method: 'DELETE', cache: 'no-store' });
  if (result.ok) return;
  if (!result.isFallback && result.error) throw new Error(result.error);

  const db = getLocalDb();
  db.invitations = db.invitations.filter((i: Invitation) => i.id !== id);
  saveLocalDb(db);
}

export async function fetchNotifications(): Promise<NotificationItem[]> {
  const result = await requestApi<NotificationItem[]>(`${API_BASE}/notifications`, { cache: 'no-store' });
  if (result.ok && result.data) return result.data;
  if (!result.isFallback && result.error) return [];

  const db = getLocalDb();
  return db.notifications || [];
}

export async function markNotificationRead(id: string): Promise<void> {
  const result = await requestApi<void>(`${API_BASE}/notifications/${id}/read`, { method: 'POST', cache: 'no-store' });
  if (result.ok) return;

  const db = getLocalDb();
  const notif = db.notifications?.find((n: NotificationItem) => n.id === id);
  if (notif) {
    notif.read = true;
    saveLocalDb(db);
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  const result = await requestApi<void>(`${API_BASE}/notifications/mark-all-read`, { method: 'POST', cache: 'no-store' });
  if (result.ok) return;

  const db = getLocalDb();
  if (db.notifications) {
    db.notifications.forEach((n: NotificationItem) => { n.read = true; });
    saveLocalDb(db);
  }
}

export async function clearAllNotifications(): Promise<void> {
  const result = await requestApi<void>(`${API_BASE}/notifications/clear`, { method: 'POST', cache: 'no-store' });
  if (result.ok) return;

  const db = getLocalDb();
  db.notifications = [];
  saveLocalDb(db);
}

export async function loginAdmin(pin: string): Promise<{ success: boolean; token: string }> {
  const result = await requestApi<{ success: boolean; token: string }>(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
    cache: 'no-store'
  });

  if (result.ok && result.data) return result.data;
  if (!result.isFallback && result.error) {
    throw new Error(result.error || 'Senha incorreta');
  }

  // Local fallback auth
  const db = getLocalDb();
  if (pin === (db.adminPin || 'admin123') || pin === 'admin123') {
    return {
      success: true,
      token: 'admin-local-token-' + Date.now()
    };
  }

  throw new Error('Senha ou PIN incorreto');
}

export async function changeAdminPassword(
  currentPin: string,
  newPin: string
): Promise<{ success: boolean; message: string }> {
  const result = await requestApi<{ success: boolean; message: string }>(`${API_BASE}/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPin, newPin }),
    cache: 'no-store'
  });

  if (result.ok && result.data) return result.data;
  if (!result.isFallback && result.error) {
    throw new Error(result.error || 'Falha ao alterar senha');
  }

  const db = getLocalDb();
  if (currentPin !== (db.adminPin || 'admin123')) {
    throw new Error('Senha atual inválida');
  }
  if (!newPin || newPin.length < 4) {
    throw new Error('Nova senha deve ter pelo menos 4 caracteres');
  }

  db.adminPin = newPin;
  saveLocalDb(db);
  return { success: true, message: 'Senha alterada com sucesso no armazenamento local!' };
}
