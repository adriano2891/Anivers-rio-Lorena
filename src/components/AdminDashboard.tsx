import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  QrCode,
  CalendarCheck,
  BarChart3,
  Settings,
  Bell,
  MessageSquare,
  LogOut,
  ExternalLink,
  Copy,
  Check,
  MoreVertical,
  ChevronDown,
  Trash2,
  Edit2,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Send,
  Building2,
  Phone,
  User,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  Share2,
  Image as ImageIcon,
  Menu,
  X,
  ChevronRight,
  PhoneCall,
  Database
} from 'lucide-react';
import { Invitation, CondoEvent, NotificationItem, DashboardMetrics } from '../types';
import {
  fetchEvents,
  fetchInvitations,
  fetchNotifications,
  deleteInvitation,
  updateInvitation,
  toggleCheckin,
  loginAdmin
} from '../lib/api';
import {
  formatDateTimeBR,
  formatDateBR,
  formatPhone,
  buildInvitationUrl,
  openWhatsApp,
  getWhatsAppMessage
} from '../lib/utils';
import { GuestModal } from './GuestModal';
import { GuestDrawer } from './GuestDrawer';
import { BatchImportModal } from './BatchImportModal';
import { QrCodeModal } from './QrCodeModal';
import { WhatsAppModal } from './WhatsAppModal';
import { GenericInviteModal } from './GenericInviteModal';
import { InteractiveCoverEditorModal } from './InteractiveCoverEditorModal';
import { CheckInView } from './CheckInView';
import { ReportsView } from './ReportsView';
import { EventSettingsModal } from './EventSettingsModal';
import { NotificationsPopover } from './NotificationsPopover';
import { SocialPreviewSection } from './SocialPreviewSection';
import { AtivaLogo } from './AtivaLogo';

interface Props {
  onOpenPublicInvitation?: (code: string) => void;
}

export const AdminDashboard: React.FC<Props> = ({ onOpenPublicInvitation }) => {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('admin_session_token');
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  // Core Data
  const [events, setEvents] = useState<CondoEvent[]>([]);
  const [activeEvent, setActiveEvent] = useState<CondoEvent | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiveConnected, setIsLiveConnected] = useState(true);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'guests' | 'checkin' | 'reports' | 'social_preview'>('guests');

  // Table Filters & Search
  const [filter, setFilter] = useState<
    | 'all'
    | 'confirmed'
    | 'pending'
    | 'viewed_not_confirmed'
    | 'not_viewed'
    | 'declined'
    | 'needs_follow_up'
    | 'checked_in'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected row & Modals
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [invitationToEdit, setInvitationToEdit] = useState<Invitation | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isGenericModalOpen, setIsGenericModalOpen] = useState(false);
  const [copiedGenericLink, setCopiedGenericLink] = useState(false);
  const [isCoverModalOpen, setIsCoverModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileActionMenuId, setMobileActionMenuId] = useState<string | null>(null);
  const [invitationToDelete, setInvitationToDelete] = useState<Invitation | null>(null);
  const [deleting, setDeleting] = useState(false);

  const genericFormUrl = typeof window !== 'undefined' ? `${window.location.origin}/convite/geral` : '/convite/geral';

  const handleCopyGenericLink = () => {
    navigator.clipboard.writeText(genericFormUrl);
    setCopiedGenericLink(true);
    setTimeout(() => setCopiedGenericLink(false), 2500);
  };

  // Real-time live banner toast
  const [liveToast, setLiveToast] = useState<{
    title: string;
    message: string;
    type: string;
  } | null>(null);

  // Global Database Save Confirmation Toast
  const [saveToast, setSaveToast] = useState<{
    type: 'success' | 'error';
    message: string;
    onRetry?: () => void;
  } | null>(null);

  const triggerSaveSuccess = (message = 'Alterações salvas com sucesso') => {
    setSaveToast({ type: 'success', message });
    setTimeout(() => {
      setSaveToast((curr) => (curr?.type === 'success' ? null : curr));
    }, 4000);
  };

  const triggerSaveError = (
    message = 'Não foi possível salvar no banco de dados. Tente novamente.',
    onRetry?: () => void
  ) => {
    setSaveToast({ type: 'error', message, onRetry });
  };

  // Load initial data directly from database
  const loadAllData = async () => {
    try {
      setLoading(true);
      const allEvents = await fetchEvents();
      setEvents(allEvents);

      if (allEvents && allEvents.length > 0) {
        // Sort events so most recently updated event is selected first
        const sorted = [...allEvents].sort((a, b) => {
          const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return timeB - timeA;
        });

        const current = activeEvent
          ? sorted.find((e) => e.id === activeEvent.id) || sorted[0]
          : sorted[0];
        setActiveEvent(current);

        const invs = await fetchInvitations(current.id);
        setInvitations(invs);
      }

      const notifs = await fetchNotifications();
      setNotifications(notifs);
    } catch (err) {
      console.error('Error loading data from server:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAllData();
    }
  }, [isAuthenticated]);

  // Handle Event selection change
  const handleSelectEvent = async (event: CondoEvent) => {
    setActiveEvent(event);
    try {
      setLoading(true);
      const invs = await fetchInvitations(event.id);
      setInvitations(invs);
    } catch (err) {
      console.error('Error switching event:', err);
    } finally {
      setLoading(false);
    }
  };

  // Setup Real-Time Server-Sent Events (SSE)
  useEffect(() => {
    if (!isAuthenticated) return;

    const eventSource = new EventSource('/api/events/live');

    eventSource.onopen = () => {
      setIsLiveConnected(true);
    };

    eventSource.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        const { type, data } = payload;

        if (type === 'invitation_viewed') {
          setInvitations((prev) =>
            prev.map((i) => (i.id === data.id ? { ...i, ...data } : i))
          );
          setLiveToast({
            title: 'Convite Visualizado',
            message: `${data.condoName} (${data.managerName}) abriu o link do convite.`,
            type: 'viewed'
          });
          setTimeout(() => setLiveToast(null), 5000);
        } else if (type === 'invitation_rsvp') {
          setInvitations((prev) =>
            prev.map((i) => (i.id === data.id ? { ...i, ...data } : i))
          );
          if (data.status === 'confirmed') {
            setLiveToast({
              title: 'Nova Confirmação Recebida! 🎉',
              message: `${data.condoName} confirmou presença (${data.participantCount} pessoas).`,
              type: 'confirmed'
            });
          } else {
            setLiveToast({
              title: 'Resposta de Recusa',
              message: `${data.condoName} informou que não participará.`,
              type: 'declined'
            });
          }
          setTimeout(() => setLiveToast(null), 6000);
        } else if (type === 'invitation_created') {
          setInvitations((prev) => {
            if (prev.some((i) => i.id === data.id)) return prev;
            return [data, ...prev];
          });
        } else if (type === 'invitation_updated' || type === 'invitation_checkin') {
          setInvitations((prev) =>
            prev.map((i) => (i.id === data.id ? { ...i, ...data } : i))
          );
        } else if (type === 'invitation_deleted') {
          setInvitations((prev) => prev.filter((i) => i.id !== data.id));
        } else if (type === 'batch_imported') {
          if (activeEvent && data.eventId === activeEvent.id) {
            fetchInvitations(activeEvent.id).then(setInvitations);
          }
        } else if (type === 'event_updated') {
          setEvents((prev) => prev.map((ev) => (ev.id === data.id ? data : ev)));
          if (activeEvent?.id === data.id) {
            setActiveEvent(data);
          }
        }

        // Always refresh notifications
        fetchNotifications().then(setNotifications);
      } catch (err) {
        console.error('SSE Message error:', err);
      }
    };

    eventSource.onerror = () => {
      setIsLiveConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [isAuthenticated, activeEvent?.id]);

  // Auth Login Handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoggingIn(true);
      setPinError(null);
      const res = await loginAdmin(pinInput);
      localStorage.setItem('admin_session_token', res.token);
      setIsAuthenticated(true);
    } catch (err: any) {
      setPinError(err.message || 'Senha inválida');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_session_token');
    setIsAuthenticated(false);
  };

  // Metrics Calculation
  const metrics: DashboardMetrics = useMemo(() => {
    const total = invitations.length;
    const notViewed = invitations.filter((i) => i.status === 'not_viewed').length;
    const viewedOnly = invitations.filter((i) => i.status === 'viewed').length;
    const confirmed = invitations.filter(
      (i) => i.status === 'confirmed' || i.status === 'checked_in'
    ).length;
    const declined = invitations.filter((i) => i.status === 'declined').length;
    const pending = invitations.filter((i) => i.status === 'pending').length;

    // Calculate confirmed people: sum of adults + children
    const confirmedInvitations = invitations.filter(
      (i) => i.status === 'confirmed' || i.status === 'checked_in'
    );

    let totalAdults = 0;
    let totalChildren = 0;
    let checkedInGuestsCount = 0;

    confirmedInvitations.forEach((inv) => {
      const adults =
        inv.adultsCount !== undefined ? inv.adultsCount : inv.participantCount || 1;
      const children = inv.childrenCount || 0;
      totalAdults += adults;
      totalChildren += children;
      if (inv.status === 'checked_in') {
        checkedInGuestsCount +=
          inv.checkedInCount !== undefined ? inv.checkedInCount : adults + children;
      }
    });

    const totalParticipants = totalAdults + totalChildren;
    const checkInsCount = invitations.filter((i) => i.status === 'checked_in').length;
    const maxCapacity = activeEvent?.maxParticipants || 150;
    const occupancyRate = maxCapacity > 0 ? Math.round((totalParticipants / maxCapacity) * 100) : 0;

    // Needs follow up: viewed but not answered OR not viewed when deadline is near
    const needsFollowUpCount = invitations.filter(
      (i) => i.status === 'viewed' || i.status === 'not_viewed' || i.status === 'pending'
    ).length;

    return {
      totalInvitations: total,
      notViewed,
      viewedOnly,
      pending,
      confirmed,
      declined,
      totalParticipants,
      totalAdults,
      totalChildren,
      maxCapacity,
      occupancyRate,
      checkInsCount,
      checkedInGuestsCount,
      needsFollowUpCount
    };
  }, [invitations, activeEvent]);

  // Filtered and Searched Invitations
  const filteredInvitations = useMemo(() => {
    return invitations
      .filter((inv) => {
        if (filter === 'confirmed')
          return inv.status === 'confirmed' || inv.status === 'checked_in';
        if (filter === 'pending')
          return inv.status === 'pending';
        if (filter === 'viewed_not_confirmed') return inv.status === 'viewed';
        if (filter === 'not_viewed') return inv.status === 'not_viewed';
        if (filter === 'declined') return inv.status === 'declined';
        if (filter === 'checked_in') return inv.status === 'checked_in';
        if (filter === 'needs_follow_up')
          return inv.status === 'viewed' || (inv.status === 'not_viewed' && inv.viewCount === 0);
        return true;
      })
      .filter((inv) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        const resp = (inv.responsibleName || inv.managerName || '').toLowerCase();
        const fam = (inv.familyOrGroup || inv.condoName || '').toLowerCase();
        const guests = (inv.guestsNames || inv.janitorName || '').toLowerCase();
        const phone = (inv.whatsapp || '').toLowerCase();
        const code = (inv.code || '').toLowerCase();
        return (
          resp.includes(q) ||
          fam.includes(q) ||
          guests.includes(q) ||
          phone.includes(q) ||
          code.includes(q)
        );
      });
  }, [invitations, filter, searchQuery]);

  // Row actions
  const handleDeleteClick = (inv: Invitation) => {
    setInvitationToDelete(inv);
  };

  const executeDelete = async () => {
    if (!invitationToDelete) return;
    const id = invitationToDelete.id;
    try {
      setDeleting(true);
      await deleteInvitation(id);
      setInvitations((prev) => prev.filter((i) => i.id !== id));
      if (selectedInvitation?.id === id) {
        setIsDrawerOpen(false);
      }
      setInvitationToDelete(null);
      triggerSaveSuccess('Convite removido do banco de dados com sucesso!');
    } catch (err: any) {
      triggerSaveError(
        err.message || 'Não foi possível excluir o convite do banco de dados.',
        () => executeDelete()
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const inv = invitations.find((i) => i.id === id);
    if (inv) {
      setInvitationToDelete(inv);
    } else {
      try {
        await deleteInvitation(id);
        setInvitations((prev) => prev.filter((i) => i.id !== id));
      } catch (err: any) {
        triggerSaveError(err.message || 'Erro ao excluir');
      }
    }
  };

  const handleManualConfirm = async (inv: Invitation) => {
    try {
      const updated = await updateInvitation(inv.id, {
        status: 'confirmed',
        attendeeRole: inv.attendeeRole === 'none' ? 'manager' : inv.attendeeRole,
        participantCount: inv.participantCount || 1,
        confirmedAt: new Date().toISOString()
      });
      setInvitations((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      triggerSaveSuccess('Presença confirmada e salva no banco de dados com sucesso!');
    } catch (err: any) {
      triggerSaveError(
        err.message || 'Não foi possível salvar a confirmação no banco de dados.',
        () => handleManualConfirm(inv)
      );
    }
  };

  const handleManualDecline = async (inv: Invitation) => {
    try {
      const updated = await updateInvitation(inv.id, {
        status: 'declined',
        attendeeRole: 'none',
        participantCount: 0,
        declinedAt: new Date().toISOString()
      });
      setInvitations((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      triggerSaveSuccess('Status atualizado e salvo no banco de dados com sucesso!');
    } catch (err: any) {
      triggerSaveError(
        err.message || 'Não foi possível salvar as alterações no banco de dados.',
        () => handleManualDecline(inv)
      );
    }
  };

  const handleCopyLink = (code: string) => {
    const url = buildInvitationUrl(code);
    navigator.clipboard.writeText(url);
    alert('Link exclusivo copiado para a área de transferência!');
  };

  // If Not Authenticated, show Pin Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full shadow-xl text-slate-800">
          <div className="flex justify-center mb-6">
            <AtivaLogo size="xl" showSubtitle={true} />
          </div>

          <h1 className="text-xl font-bold text-center text-slate-900 mb-1">
            Painel Administrativo
          </h1>
          <p className="text-slate-600 text-xs text-center mb-6">
            Gestão de Convites & Confirmação de Presença
          </p>

          {pinError && (
            <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{pinError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Senha / PIN de Acesso
              </label>
              <input
                type="password"
                required
                autoFocus
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Digite a senha (padrão: admin123)"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 text-center font-mono tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white shadow-2xs"
              />
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold py-3.5 rounded-xl transition shadow-md shadow-teal-900/10 text-sm active:scale-[0.99] cursor-pointer"
            >
              {loggingIn ? 'Autenticando...' : 'Entrar no Sistema'}
            </button>
          </form>

          <div className="mt-6 text-center text-[11px] text-slate-500">
            Dica: A senha padrão inicial é <strong className="text-slate-700">admin123</strong>
          </div>
        </div>
      </div>
    );
  }

  if (!activeEvent) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-slate-800">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-teal-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-600 text-sm font-medium">Carregando painel administrativo...</p>
        </div>
      </div>
    );
  }

  const unreadNotifsCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Live Toast Banner */}
      {liveToast && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-full bg-white border border-teal-300 rounded-2xl p-4 shadow-xl flex items-start gap-3 animate-in slide-in-from-top-4 duration-300">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              liveToast.type === 'confirmed'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : liveToast.type === 'viewed'
                ? 'bg-sky-50 text-sky-700 border border-sky-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {liveToast.type === 'confirmed' ? (
              <CheckCircle2 size={20} />
            ) : liveToast.type === 'viewed' ? (
              <Eye size={20} />
            ) : (
              <XCircle size={20} />
            )}
          </div>
          <div className="flex-1">
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>{liveToast.title}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5 leading-tight">{liveToast.message}</p>
          </div>
          <button
            onClick={() => setLiveToast(null)}
            className="text-slate-400 hover:text-slate-700 text-xs p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Navbar */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          {/* Brand & Event Selector */}
          <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
            <AtivaLogo size="sm" showSubtitle={false} className="shrink-0" />

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-[150px] sm:max-w-md">
                  {activeEvent.title}
                </span>

                {events.length > 1 && (
                  <select
                    value={activeEvent.id}
                    onChange={(e) => {
                      const ev = events.find((item) => item.id === e.target.value);
                      if (ev) handleSelectEvent(ev);
                    }}
                    className="bg-slate-100 text-[10px] sm:text-[11px] text-slate-700 border border-slate-300 rounded-lg px-1.5 sm:px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-teal-600 cursor-pointer max-w-[110px] sm:max-w-none truncate font-medium"
                  >
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="text-[10px] sm:text-[11px] text-slate-500 flex items-center gap-1.5 sm:gap-2 mt-0.5 truncate">
                <span className="truncate">
                  📅 {formatDateBR(activeEvent.date)} às {activeEvent.time}
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline truncate">📍 {activeEvent.location}</span>
              </div>
            </div>
          </div>

          {/* Right Header Tools */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Database Persistence Indicator */}
            <div
              className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-semibold"
              title="Todas as alterações são salvas permanentemente no banco de dados do servidor"
            >
              <Database size={13} className="text-emerald-600 shrink-0" />
              <span className="hidden sm:inline">Banco Ativo</span>
            </div>

            {/* Realtime Live Indicator */}
            <div
              className="flex items-center gap-1.5 bg-slate-100 px-2 sm:px-2.5 py-1 rounded-full border border-slate-200 text-[10px] sm:text-[11px]"
              title={isLiveConnected ? 'Atualizações em Tempo Real Ativas' : 'Reconectando...'}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isLiveConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span className="hidden sm:inline text-slate-600 font-medium">
                {isLiveConnected ? 'Tempo Real Ativo' : 'Reconectando'}
              </span>
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 transition relative min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer"
                title="Notificações"
              >
                <Bell size={18} />
                {unreadNotifsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-teal-700 text-white rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-white animate-pulse">
                    {unreadNotifsCount}
                  </span>
                )}
              </button>

              <NotificationsPopover
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
                notifications={notifications}
                onUpdateNotifications={setNotifications}
                onSelectInvitationCode={(code) => {
                  const inv = invitations.find((i) => i.code === code);
                  if (inv) {
                    setSelectedInvitation(inv);
                    setIsDrawerOpen(true);
                  }
                }}
              />
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-2">
              {/* Capa Interativa & Hiperlinks Button */}
              <button
                onClick={() => setIsCoverModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-300 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Editar Capa Interativa, Hiperlinks Clicáveis e Exportar PDF"
              >
                <Sparkles size={15} className="text-teal-700" />
                <span>Capa Interativa &amp; Hiperlinks</span>
              </button>

              {/* Social Preview Button */}
              <button
                onClick={() => setActiveTab('social_preview')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs border cursor-pointer ${
                  activeTab === 'social_preview'
                    ? 'bg-sky-50 text-sky-800 border-sky-300 font-bold'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                }`}
                title="Configurar Preview de Compartilhamento (WhatsApp & Redes)"
              >
                <Share2 size={15} className="text-sky-600" />
                <span>Preview Social</span>
              </button>

              {/* Settings Button */}
              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition shadow-2xs cursor-pointer"
                title="Configurações do Evento"
              >
                <Settings size={18} />
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-700 border border-slate-300 transition shadow-2xs cursor-pointer"
                title="Sair do Painel"
              >
                <LogOut size={18} />
              </button>
            </div>

            {/* Mobile Menu Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition min-w-[40px] min-h-[40px] flex items-center justify-center border border-slate-300 shadow-2xs cursor-pointer"
              title="Abrir Menu Administrativo"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>

        {/* Desktop / Tablet Tab Navigation */}
        <div className="hidden md:flex max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 gap-6 text-xs font-semibold border-t border-slate-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('guests')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'guests'
                ? 'border-teal-700 text-teal-800 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users size={16} />
            <span>Lista de Convidados ({invitations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('checkin')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'checkin'
                ? 'border-purple-600 text-purple-800 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarCheck size={16} />
            <span>Check-in no Dia do Evento</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'reports'
                ? 'border-teal-700 text-teal-800 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 size={16} />
            <span>Relatórios & Estatísticas</span>
          </button>

          <button
            onClick={() => setActiveTab('social_preview')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'social_preview'
                ? 'border-sky-600 text-sky-800 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Share2 size={16} />
            <span>Preview de Compartilhamento</span>
          </button>
        </div>
      </header>

      {/* Global Database Save Toast Banner */}
      {saveToast && (
        <div
          className={`w-full py-2.5 px-4 text-xs font-semibold flex items-center justify-between shadow-md transition z-20 sticky top-16 ${
            saveToast.type === 'success'
              ? 'bg-emerald-700 text-white'
              : 'bg-rose-700 text-white'
          }`}
        >
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {saveToast.type === 'success' ? (
                <CheckCircle2 size={18} className="text-emerald-300 shrink-0" />
              ) : (
                <AlertCircle size={18} className="text-rose-200 shrink-0" />
              )}
              <span>{saveToast.message}</span>
            </div>
            <div className="flex items-center gap-2">
              {saveToast.onRetry && (
                <button
                  onClick={saveToast.onRetry}
                  className="px-2.5 py-1 bg-white text-rose-800 rounded font-bold text-xs hover:bg-rose-50 cursor-pointer shadow-xs transition"
                >
                  Tentar novamente
                </button>
              )}
              <button
                onClick={() => setSaveToast(null)}
                className="text-white/80 hover:text-white px-1 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Slide-Over Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end md:hidden animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-full max-w-xs bg-white border-l border-slate-200 shadow-2xl h-full flex flex-col z-10 animate-in slide-in-from-right duration-300 text-slate-800">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <AtivaLogo size="sm" showSubtitle={false} />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate max-w-[180px]">
                    {activeEvent.title}
                  </div>
                  <div className="text-[10px] text-slate-500">Painel Administrativo</div>
                </div>
              </div>

              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation Options */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 text-xs font-medium">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1.5">
                Navegação Principal
              </div>

              <button
                onClick={() => {
                  setActiveTab('guests');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition cursor-pointer ${
                  activeTab === 'guests'
                    ? 'bg-teal-700 text-white font-bold shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users size={18} />
                  <span>Lista de Convidados</span>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    activeTab === 'guests' ? 'bg-teal-900 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {invitations.length}
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('checkin');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl transition cursor-pointer ${
                  activeTab === 'checkin'
                    ? 'bg-purple-700 text-white font-bold shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <CalendarCheck size={18} />
                <span>Check-in no Evento</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('reports');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl transition cursor-pointer ${
                  activeTab === 'reports'
                    ? 'bg-teal-700 text-white font-bold shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <BarChart3 size={18} />
                <span>Relatórios & Estatísticas</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('social_preview');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl transition cursor-pointer ${
                  activeTab === 'social_preview'
                    ? 'bg-sky-700 text-white font-bold shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Share2 size={18} />
                <span>Preview Social</span>
              </button>

              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pt-4 pb-1.5">
                Ferramentas & Ações
              </div>

              <button
                onClick={() => {
                  setIsCoverModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-teal-800 hover:bg-teal-50 font-semibold transition cursor-pointer"
              >
                <Sparkles size={18} className="text-teal-700" />
                <span>Capa Interativa &amp; Hiperlinks</span>
              </button>

              <button
                onClick={() => {
                  setIsBatchModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-emerald-800 hover:bg-emerald-50 font-semibold transition cursor-pointer"
              >
                <FileSpreadsheet size={18} />
                <span>Importar Planilha (Excel/CSV)</span>
              </button>

              <button
                onClick={() => {
                  setIsGenericModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-sky-800 hover:bg-sky-50 font-semibold transition cursor-pointer"
              >
                <Sparkles size={18} />
                <span>Link Geral & Divulgação</span>
              </button>

              <button
                onClick={() => {
                  setIsSettingsModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <Settings size={18} />
                <span>Configurações do Evento</span>
              </button>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition cursor-pointer shadow-2xs"
              >
                <LogOut size={16} />
                <span>Sair do Painel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Body with Safe Bottom Padding */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-24 md:pb-10">
        {/* Event Cover & Quick Details Banner */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-xs group">
          {/* Background cover image with smooth blur/overlay */}
          <div className="absolute inset-0 z-0">
            {activeEvent.bannerUrl ? (
              <img
                src={activeEvent.bannerUrl}
                alt={activeEvent.title}
                className="w-full h-full object-cover opacity-15 group-hover:scale-105 transition duration-500"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-teal-50 via-slate-50 to-white" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent" />
          </div>

          <div className="relative z-10 p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 sm:gap-4">
              {/* Cover Thumbnail Preview */}
              <div
                onClick={() => setIsCoverModalOpen(true)}
                className="relative w-16 h-16 sm:w-24 sm:h-24 rounded-xl overflow-hidden border-2 border-teal-600/30 bg-slate-100 shrink-0 cursor-pointer shadow-xs group/thumb"
                title="Clique para trocar a capa"
              >
                {activeEvent.bannerUrl ? (
                  <img
                    src={activeEvent.bannerUrl}
                    alt="Capa"
                    className="w-full h-full object-cover group-hover/thumb:scale-110 transition duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <ImageIcon size={22} />
                  </div>
                )}
                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover/thumb:opacity-100 transition flex items-center justify-center text-white text-[10px] font-bold">
                  <span>Alterar</span>
                </div>
              </div>

              {/* Event Info */}
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] sm:text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200">
                    Capa Ativa
                  </span>
                  {activeEvent.presentationText && (
                    <span className="hidden sm:inline text-[11px] text-slate-600 truncate max-w-md">
                      • {activeEvent.presentationText}
                    </span>
                  )}
                </div>
                <h2 className="text-sm sm:text-lg font-bold text-slate-900 leading-tight truncate">
                  {activeEvent.title}
                </h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-xs text-slate-600">
                  <span>📅 {formatDateBR(activeEvent.date)} às {activeEvent.time}</span>
                  <span>📍 {activeEvent.location}</span>
                </div>
              </div>
            </div>

            {/* Banner Actions */}
            <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t border-slate-200 md:border-none">
              <button
                onClick={() => setIsCoverModalOpen(true)}
                className="flex-1 sm:flex-none px-3.5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs min-h-[42px] cursor-pointer"
              >
                <ImageIcon size={15} />
                <span>Trocar Capa</span>
              </button>

              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="flex-1 sm:flex-none px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 min-h-[42px] cursor-pointer shadow-2xs"
              >
                <Settings size={14} />
                <span>Configurações</span>
              </button>
            </div>
          </div>
        </div>

        {/* Near Capacity or Full Capacity Alert for Administrator */}
        {metrics.totalParticipants >= metrics.maxCapacity ? (
          <div className="bg-rose-50 border border-rose-300 rounded-2xl p-4 text-xs text-rose-900 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping shrink-0" />
              <div>
                <strong className="font-black text-sm block text-rose-950">
                  Capacidade Máxima Atingida ({metrics.maxCapacity} pessoas)!
                </strong>
                <span>
                  Todas as vagas da festa foram preenchidas. Novas confirmações públicas foram bloqueadas para evitar superlotação.
                </span>
              </div>
            </div>
            <span className="shrink-0 font-bold bg-rose-200 text-rose-900 px-3 py-1 rounded-xl text-xs">
              100% Ocupado
            </span>
          </div>
        ) : metrics.totalParticipants >= metrics.maxCapacity - 15 ? (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 text-xs text-amber-900 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <AlertCircle size={20} className="text-amber-600 shrink-0" />
              <div>
                <strong className="font-bold text-sm block text-amber-950">
                  Atenção: Vagas Próximas do Limite!
                </strong>
                <span>
                  Restam apenas <strong>{metrics.maxCapacity - metrics.totalParticipants} vagas</strong> para atingir a capacidade limite de {metrics.maxCapacity} pessoas.
                </span>
              </div>
            </div>
            <span className="shrink-0 font-bold bg-amber-200 text-amber-900 px-3 py-1 rounded-xl text-xs">
              {metrics.occupancyRate}% Ocupado
            </span>
          </div>
        ) : null}

        {/* Top Summary Dashboard Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 sm:gap-3">
          {/* Total Convites */}
          <div className="bg-white border border-pink-100 rounded-2xl p-3.5 sm:p-4 shadow-xs">
            <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Convites
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{metrics.totalInvitations}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Famílias cadastradas</div>
          </div>

          {/* Não Visualizados */}
          <div className="bg-white border border-pink-100 rounded-2xl p-3.5 sm:p-4 shadow-xs">
            <div className="text-[10px] sm:text-[11px] font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              Não Vistos
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-700 mt-1">{metrics.notViewed}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Não abriram o link</div>
          </div>

          {/* Visualizados */}
          <div className="bg-white border border-pink-100 rounded-2xl p-3.5 sm:p-4 shadow-xs">
            <div className="text-[10px] sm:text-[11px] font-semibold text-sky-700 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              Visualizados
            </div>
            <div className="text-xl sm:text-2xl font-black text-sky-700 mt-1">{metrics.viewedOnly}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Abriram sem confirmar</div>
          </div>

          {/* Aguardando Resposta */}
          <div className="bg-white border border-pink-100 rounded-2xl p-3.5 sm:p-4 shadow-xs">
            <div className="text-[10px] sm:text-[11px] font-semibold text-amber-700 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Aguardando
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-700 mt-1">{metrics.pending}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Aguardando resposta</div>
          </div>

          {/* Confirmados */}
          <div className="bg-white border border-pink-100 rounded-2xl p-3.5 sm:p-4 shadow-xs">
            <div className="text-[10px] sm:text-[11px] font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Confirmados
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">{metrics.confirmed}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Convites confirmados</div>
          </div>

          {/* Recusados */}
          <div className="bg-white border border-pink-100 rounded-2xl p-3.5 sm:p-4 shadow-xs">
            <div className="text-[10px] sm:text-[11px] font-semibold text-rose-700 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Recusados
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-700 mt-1">{metrics.declined}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Não comparecerão</div>
          </div>

          {/* Vagas Ocupadas */}
          <div className="bg-pink-50/70 border border-pink-200 rounded-2xl p-3.5 sm:p-4 shadow-xs col-span-2 sm:col-span-1">
            <div className="text-[10px] sm:text-[11px] font-bold text-pink-900 uppercase tracking-wider flex items-center gap-1">
              <Users size={12} className="text-pink-600" />
              Vagas Ocupadas
            </div>
            <div className="text-xl sm:text-2xl font-black text-pink-700 mt-1">
              {metrics.totalParticipants} / {metrics.maxCapacity}
            </div>
            <div className="text-[10px] text-pink-800 font-semibold mt-0.5">
              {metrics.totalAdults} ad. • {metrics.totalChildren} cr.
            </div>
          </div>
        </div>

        {/* Capacity Limit Bar & Party Occupancy */}
        <div className="bg-white border border-pink-200/80 rounded-2xl p-3.5 sm:p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs mb-2 gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-slate-900">Ocupação da Festa:</span>
              <span className="text-slate-600">
                <strong className="text-pink-700 font-black">{metrics.totalParticipants}</strong> pessoas confirmadas
                ({metrics.totalAdults} adultos + {metrics.totalChildren} crianças) de{' '}
                <strong className="text-slate-900">{metrics.maxCapacity}</strong> vagas ({metrics.occupancyRate}%)
              </span>
            </div>

            {activeEvent.confirmationDeadline && (
              <div className="text-slate-500 text-[11px]">
                ⏳ Prazo para confirmações:{' '}
                <strong className="text-pink-700 font-bold">
                  {formatDateBR(activeEvent.confirmationDeadline)}
                </strong>
              </div>
            )}
          </div>

          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                metrics.occupancyRate >= 100
                  ? 'bg-rose-500'
                  : metrics.occupancyRate >= 80
                  ? 'bg-amber-500'
                  : 'bg-pink-500'
              }`}
              style={{ width: `${Math.min(100, metrics.occupancyRate)}%` }}
            />
          </div>
        </div>

        {/* Dynamic View Tab */}
        {activeTab === 'guests' && (
          <div className="space-y-4">
            {/* Generic Open Invitation Link Card */}
            <div className="bg-gradient-to-r from-pink-50/80 via-white to-sky-50/40 border border-pink-200 rounded-2xl p-4 sm:p-5 shadow-xs">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Sparkles size={16} className="text-pink-600" />
                      <span>Link Geral de Confirmação (Aniversário da Lorena)</span>
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                    Divulgue este link geral para convidados em grupos de WhatsApp ou redes sociais. Qualquer família pode acessar, preencher os dados dos acompanhantes e emitir o passe oficial da festa instantaneamente.
                  </p>
                </div>

                {/* Quick actions for Generic Link */}
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleCopyGenericLink}
                    className="px-3 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs min-h-[40px] cursor-pointer"
                    title="Copiar link do formulário geral"
                  >
                    {copiedGenericLink ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedGenericLink ? 'Link Copiado!' : 'Copiar Link'}</span>
                  </button>

                  <button
                    onClick={() => setIsGenericModalOpen(true)}
                    className="px-3 py-2.5 bg-white hover:bg-slate-50 text-teal-800 border border-teal-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 min-h-[40px] cursor-pointer shadow-2xs"
                    title="Ver mensagem para grupos e QR Code para cartaz"
                  >
                    <Share2 size={14} />
                    <span>Divulgação & QR</span>
                  </button>

                  {onOpenPublicInvitation ? (
                    <button
                      onClick={() => onOpenPublicInvitation('geral')}
                      className="px-3 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-medium transition flex items-center justify-center gap-1.5 min-h-[40px] cursor-pointer shadow-2xs"
                      title="Abrir formulário de teste"
                    >
                      <ExternalLink size={14} />
                      <span>Abrir Formulário</span>
                    </button>
                  ) : (
                    <a
                      href={genericFormUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-medium transition flex items-center justify-center gap-1.5 min-h-[40px] shadow-2xs"
                    >
                      <ExternalLink size={14} />
                      <span>Abrir Formulário</span>
                    </a>
                  )}
                </div>
              </div>

              {/* URL preview pill */}
              <div className="mt-3 pt-3 border-t border-teal-100 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 gap-1">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="font-semibold text-slate-700 shrink-0">URL Pública:</span>
                  <code className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono text-teal-800 truncate max-w-xs sm:max-w-md">
                    {genericFormUrl}
                  </code>
                </div>
                <span className="text-emerald-700 font-medium shrink-0">
                  {metrics.totalInvitations} inscrições registradas
                </span>
              </div>
            </div>

            {/* Instant Search Bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search size={16} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar por responsável, família, convidados ou WhatsApp..."
                className="w-full bg-white border border-slate-300 rounded-2xl pl-10 pr-4 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 shadow-2xs"
              />
            </div>

            {/* Action Bar & Filter Pills */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Filter Pills with Horizontal Scrolling */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 overflow-x-auto text-xs scrollbar-none">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-2 rounded-xl font-medium transition whitespace-nowrap min-h-[36px] flex items-center gap-1 cursor-pointer ${
                    filter === 'all'
                      ? 'bg-pink-600 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Todos</span>
                  <span className="text-[10px] opacity-80">({invitations.length})</span>
                </button>

                <button
                  onClick={() => setFilter('not_viewed')}
                  className={`px-3 py-2 rounded-xl font-medium transition whitespace-nowrap min-h-[36px] flex items-center gap-1.5 cursor-pointer ${
                    filter === 'not_viewed'
                      ? 'bg-slate-700 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                  <span>Não visualizado</span>
                  <span className="text-[10px] opacity-80">({metrics.notViewed})</span>
                </button>

                <button
                  onClick={() => setFilter('viewed_not_confirmed')}
                  className={`px-3 py-2 rounded-xl font-medium transition whitespace-nowrap min-h-[36px] flex items-center gap-1.5 cursor-pointer ${
                    filter === 'viewed_not_confirmed'
                      ? 'bg-sky-600 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-sky-300" />
                  <span>Visualizado</span>
                  <span className="text-[10px] opacity-80">({metrics.viewedOnly})</span>
                </button>

                <button
                  onClick={() => setFilter('pending')}
                  className={`px-3 py-2 rounded-xl font-medium transition whitespace-nowrap min-h-[36px] flex items-center gap-1.5 cursor-pointer ${
                    filter === 'pending'
                      ? 'bg-amber-600 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-300" />
                  <span>Aguardando resposta</span>
                  <span className="text-[10px] opacity-80">({metrics.pending})</span>
                </button>

                <button
                  onClick={() => setFilter('confirmed')}
                  className={`px-3 py-2 rounded-xl font-medium transition whitespace-nowrap min-h-[36px] flex items-center gap-1.5 cursor-pointer ${
                    filter === 'confirmed'
                      ? 'bg-emerald-600 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-300" />
                  <span>Confirmado</span>
                  <span className="text-[10px] opacity-80">({metrics.confirmed})</span>
                </button>

                <button
                  onClick={() => setFilter('declined')}
                  className={`px-3 py-2 rounded-xl font-medium transition whitespace-nowrap min-h-[36px] flex items-center gap-1.5 cursor-pointer ${
                    filter === 'declined'
                      ? 'bg-rose-600 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-300" />
                  <span>Recusado</span>
                  <span className="text-[10px] opacity-80">({metrics.declined})</span>
                </button>

                <button
                  onClick={() => setFilter('checked_in')}
                  className={`px-3 py-2 rounded-xl font-medium transition whitespace-nowrap min-h-[36px] flex items-center gap-1.5 cursor-pointer ${
                    filter === 'checked_in'
                      ? 'bg-purple-600 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-purple-300" />
                  <span>Check-in Feito</span>
                  <span className="text-[10px] opacity-80">({metrics.checkInsCount})</span>
                </button>
              </div>

              {/* Desktop Action Buttons */}
              <div className="hidden sm:flex items-center gap-2">
                <button
                  onClick={() => setIsBatchModalOpen(true)}
                  className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 min-h-[40px] cursor-pointer shadow-2xs"
                >
                  <FileSpreadsheet size={15} className="text-emerald-600" />
                  <span>Importar Convites</span>
                </button>

                <button
                  onClick={() => {
                    setInvitationToEdit(null);
                    setIsGuestModalOpen(true);
                  }}
                  className="px-4 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs min-h-[40px] cursor-pointer"
                >
                  <Plus size={16} />
                  <span>Novo Convite</span>
                </button>
              </div>
            </div>

            {/* RESPONSIVE GUEST LIST: Desktop Table (hidden lg:block) vs Mobile/Tablet Cards (lg:hidden) */}
            
            {/* 1. Mobile & Tablet Cards View (lg:hidden) */}
            <div className="lg:hidden space-y-3">
              {filteredInvitations.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-xs italic shadow-xs">
                  Nenhum convidado encontrado para os filtros selecionados.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredInvitations.map((inv) => {
                    const isConfirmed =
                      inv.status === 'confirmed' || inv.status === 'checked_in';
                    const isDeclined = inv.status === 'declined';
                    const isViewed = inv.status === 'viewed';
                    const isPending = inv.status === 'pending';
                    const isCheckedIn = inv.status === 'checked_in';
                    const isMenuOpen = mobileActionMenuId === inv.id;

                    const totalPeople =
                      (inv.adultsCount !== undefined ? inv.adultsCount : inv.participantCount || 1) +
                      (inv.childrenCount || 0);

                    return (
                      <div
                        key={inv.id}
                        className="bg-white border border-pink-100 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-pink-200 transition relative"
                      >
                        <div>
                          {/* Card Top: Responsável & Status */}
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-900 text-sm leading-snug truncate">
                                {inv.responsibleName || inv.managerName}
                              </h4>
                              {(inv.familyOrGroup || inv.condoName) && (
                                <p className="text-xs text-pink-600 font-medium truncate">
                                  {inv.familyOrGroup || inv.condoName}
                                </p>
                              )}
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] font-mono text-pink-800 bg-pink-50 px-1.5 py-0.5 rounded border border-pink-200">
                                  #{inv.code}
                                </span>
                                {inv.internalNotes && (
                                  <span
                                    className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 truncate max-w-[130px]"
                                    title={inv.internalNotes}
                                  >
                                    📝 {inv.internalNotes}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Status Pill */}
                            <div className="shrink-0">
                              {isCheckedIn ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                  Check-in Feito
                                </span>
                              ) : isConfirmed ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Confirmado
                                </span>
                              ) : isDeclined ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  Recusado
                                </span>
                              ) : isPending ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  Aguardando resposta
                                </span>
                              ) : isViewed ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                                  Visualizado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                  Não visualizado
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Card Details Grid */}
                          <div className="space-y-1.5 text-xs text-slate-700 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 text-[11px] flex items-center gap-1.5">
                                <Phone size={13} className="text-slate-400" /> Contacto:
                              </span>
                              <span className="font-mono text-slate-800">
                                {formatPhone(inv.whatsapp)}
                              </span>
                            </div>

                            {(inv.guestsNames || inv.janitorName) && (
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-slate-500 text-[11px] flex items-center gap-1.5 shrink-0">
                                  <Users size={13} className="text-slate-400" /> Convidados:
                                </span>
                                <span className="text-slate-700 text-right truncate max-w-[170px]">
                                  {inv.guestsNames || inv.janitorName}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                              <span className="text-pink-700 text-[11px] font-medium flex items-center gap-1.5">
                                <Users size={13} /> Total de Pessoas:
                              </span>
                              <span className="font-bold text-pink-700">
                                {totalPeople} {totalPeople === 1 ? 'pessoa' : 'pessoas'}
                                {isConfirmed && (
                                  <span className="text-[10px] text-pink-600 font-normal ml-1">
                                    ({inv.adultsCount || inv.participantCount || 1} ad., {inv.childrenCount || 0} cr.)
                                  </span>
                                )}
                              </span>
                            </div>

                            {inv.specialNeeds && (
                              <div className="pt-1 border-t border-slate-200 text-[10px] text-amber-800 bg-amber-50/60 p-1.5 rounded-lg">
                                <strong>Obs / Necessidades:</strong> {inv.specialNeeds}
                              </div>
                            )}

                            {/* View & Confirmation timestamps */}
                            <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200 gap-1">
                              <span>
                                {inv.viewCount > 0 ? `Visto ${inv.viewCount}x` : 'Não visualizado'}
                              </span>
                              {inv.confirmedAt && (
                                <span className="text-emerald-700 font-medium">
                                  Confirmado: {formatDateBR(inv.confirmedAt)}
                                </span>
                              )}
                              {inv.declinedAt && (
                                <span className="text-rose-700 font-medium">
                                  Recusado: {formatDateBR(inv.declinedAt)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Card Direct Action Buttons */}
                        <div className="pt-1 flex items-center gap-1.5">
                          {/* 1. WhatsApp Button */}
                          <button
                            onClick={() => {
                              setSelectedInvitation(inv);
                              setIsWhatsAppModalOpen(true);
                            }}
                            className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs min-h-[44px] cursor-pointer"
                          >
                            <MessageSquare size={15} />
                            <span>WhatsApp</span>
                          </button>

                          {/* 2. Details Button */}
                          <button
                            onClick={() => {
                              setSelectedInvitation(inv);
                              setIsDrawerOpen(true);
                            }}
                            className="py-2.5 px-3.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1 min-h-[44px] border border-slate-300 shadow-2xs cursor-pointer"
                            title="Ver detalhes completos"
                          >
                            <Eye size={15} />
                            <span className="hidden sm:inline">Detalhes</span>
                          </button>

                          {/* 3. Edit Button */}
                          <button
                            onClick={() => {
                              setInvitationToEdit(inv);
                              setIsGuestModalOpen(true);
                            }}
                            className="p-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl transition min-w-[44px] min-h-[44px] flex items-center justify-center border border-slate-300 shadow-2xs cursor-pointer"
                            title="Editar Dados"
                          >
                            <Edit2 size={16} />
                          </button>

                          {/* 4. More Options Dropdown */}
                          <div className="relative">
                            <button
                              onClick={() =>
                                setMobileActionMenuId(isMenuOpen ? null : inv.id)
                              }
                              className={`p-2.5 rounded-xl transition min-w-[44px] min-h-[44px] flex items-center justify-center border cursor-pointer shadow-2xs ${
                                isMenuOpen
                                  ? 'bg-pink-600 text-white border-pink-600'
                                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                              }`}
                              title="Mais Ações"
                            >
                              <MoreVertical size={16} />
                            </button>

                            {isMenuOpen && (
                              <div className="absolute right-0 bottom-full mb-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 z-30 animate-in fade-in zoom-in-95 text-xs font-medium space-y-1">
                                <button
                                  onClick={() => {
                                    handleCopyLink(inv.code);
                                    setMobileActionMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 text-left transition cursor-pointer"
                                >
                                  <Copy size={14} className="text-pink-600" />
                                  <span>Copiar Link Exclusivo</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setSelectedInvitation(inv);
                                    setIsQrModalOpen(true);
                                    setMobileActionMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 text-left transition cursor-pointer"
                                >
                                  <QrCode size={14} className="text-purple-600" />
                                  <span>Ver QR Code / Passe</span>
                                </button>

                                <a
                                  href={buildInvitationUrl(inv.code)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 text-left transition"
                                  onClick={() => setMobileActionMenuId(null)}
                                >
                                  <ExternalLink size={14} className="text-sky-600" />
                                  <span>Abrir Convite Público</span>
                                </a>

                                <div className="border-t border-slate-200 my-1" />

                                <button
                                  onClick={() => {
                                    setMobileActionMenuId(null);
                                    handleDeleteClick(inv);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-left transition cursor-pointer"
                                >
                                  <Trash2 size={14} />
                                  <span>Excluir Convite</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Desktop Full Table View (hidden below lg) */}
            <div className="hidden lg:block bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-pink-50/50 text-slate-700 font-bold border-b border-pink-100">
                    <tr>
                      <th className="py-3.5 px-4">Responsável</th>
                      <th className="py-3.5 px-4">Contacto</th>
                      <th className="py-3.5 px-4">Convidados</th>
                      <th className="py-3.5 px-4">Total de Pessoas</th>
                      <th className="py-3.5 px-4">Estado do Convite</th>
                      <th className="py-3.5 px-4">Data da Confirmação</th>
                      <th className="py-3.5 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInvitations.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500 text-xs italic">
                          Nenhum convidado encontrado para os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      filteredInvitations.map((inv) => {
                        const isConfirmed =
                          inv.status === 'confirmed' || inv.status === 'checked_in';
                        const isDeclined = inv.status === 'declined';
                        const isViewed = inv.status === 'viewed';
                        const isPending = inv.status === 'pending';
                        const isCheckedIn = inv.status === 'checked_in';

                        const totalPeople =
                          (inv.adultsCount !== undefined ? inv.adultsCount : inv.participantCount || 1) +
                          (inv.childrenCount || 0);

                        return (
                          <tr
                            key={inv.id}
                            className="hover:bg-pink-50/30 transition group cursor-pointer"
                            onClick={() => {
                              setSelectedInvitation(inv);
                              setIsDrawerOpen(true);
                            }}
                          >
                            {/* Nome do Responsável / Família */}
                            <td className="py-3.5 px-4 font-semibold text-slate-900">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate max-w-[180px]">
                                  {inv.responsibleName || inv.managerName}
                                </span>
                                {inv.internalNotes && (
                                  <span
                                    className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"
                                    title={`Nota: ${inv.internalNotes}`}
                                  />
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] font-mono text-pink-700 bg-pink-50 px-1 py-0.2 rounded">
                                  #{inv.code}
                                </span>
                                {(inv.familyOrGroup || inv.condoName) && (
                                  <span className="text-[10px] text-slate-500 truncate max-w-[140px]">
                                    {inv.familyOrGroup || inv.condoName}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Contacto (WhatsApp) */}
                            <td className="py-3.5 px-4 font-mono text-slate-700">
                              {formatPhone(inv.whatsapp)}
                            </td>

                            {/* Convidados */}
                            <td className="py-3.5 px-4 text-slate-600">
                              <div className="truncate max-w-[160px]" title={inv.guestsNames || inv.janitorName || 'Nenhum adicional'}>
                                {inv.guestsNames || inv.janitorName || '—'}
                              </div>
                              {inv.specialNeeds && (
                                <div className="text-[10px] text-amber-700 font-medium truncate max-w-[160px]" title={inv.specialNeeds}>
                                  ⚠️ {inv.specialNeeds}
                                </div>
                              )}
                            </td>

                            {/* Total de Pessoas */}
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-pink-700 bg-pink-50 px-2 py-0.5 rounded-md border border-pink-200">
                                {totalPeople} {totalPeople === 1 ? 'pessoa' : 'pessoas'}
                              </span>
                              {isConfirmed && (
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  {inv.adultsCount || inv.participantCount || 1} ad. • {inv.childrenCount || 0} cr.
                                </div>
                              )}
                            </td>

                            {/* Estado do Convite */}
                            <td className="py-3.5 px-4">
                              {isCheckedIn ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                  Check-in Feito
                                </span>
                              ) : isConfirmed ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Confirmado
                                </span>
                              ) : isDeclined ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  Recusado
                                </span>
                              ) : isPending ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  Aguardando resposta
                                </span>
                              ) : isViewed ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                                  Visualizado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                  Não visualizado
                                </span>
                              )}
                            </td>

                            {/* Data da Confirmação */}
                            <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                              {inv.confirmedAt ? (
                                <span className="text-emerald-700 font-semibold">
                                  {formatDateTimeBR(inv.confirmedAt)}
                                </span>
                              ) : inv.declinedAt ? (
                                <span className="text-rose-700">
                                  Recusado ({formatDateTimeBR(inv.declinedAt).split(' ')[0]})
                                </span>
                              ) : inv.firstViewedAt ? (
                                <span className="text-sky-700">
                                  Visto ({formatDateTimeBR(inv.firstViewedAt).split(' ')[0]})
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            {/* Ações */}
                            <td
                              className="py-3.5 px-4 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-end gap-1">
                                {/* WhatsApp */}
                                <button
                                  onClick={() => {
                                    setSelectedInvitation(inv);
                                    setIsWhatsAppModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition cursor-pointer"
                                  title="Enviar WhatsApp"
                                >
                                  <MessageSquare size={14} />
                                </button>

                                {/* Copy Link */}
                                <button
                                  onClick={() => handleCopyLink(inv.code)}
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition border border-slate-200 cursor-pointer"
                                  title="Copiar Link"
                                >
                                  <Copy size={14} />
                                </button>

                                {/* Open QR */}
                                <button
                                  onClick={() => {
                                    setSelectedInvitation(inv);
                                    setIsQrModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition border border-slate-200 cursor-pointer"
                                  title="Ver QR Code / Passe"
                                >
                                  <QrCode size={14} />
                                </button>

                                {/* Edit */}
                                <button
                                  onClick={() => {
                                    setInvitationToEdit(inv);
                                    setIsGuestModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition border border-slate-200 cursor-pointer"
                                  title="Editar"
                                >
                                  <Edit2 size={14} />
                                </button>

                                {/* Open Public Page */}
                                <a
                                  href={buildInvitationUrl(inv.code)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition border border-slate-200"
                                  title="Abrir página do convite"
                                >
                                  <ExternalLink size={14} />
                                </a>

                                {/* Delete */}
                                <button
                                  onClick={() => handleDeleteClick(inv)}
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition border border-slate-200 cursor-pointer"
                                  title="Excluir Convite"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'checkin' && (
          <CheckInView
            event={activeEvent}
            invitations={invitations}
            onUpdateInvitation={(updated) =>
              setInvitations((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
            }
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView event={activeEvent} invitations={invitations} />
        )}

        {activeTab === 'social_preview' && (
          <SocialPreviewSection
            event={activeEvent}
            invitations={invitations}
            onEventUpdated={(updatedEvent) => {
              setActiveEvent(updatedEvent);
              setEvents((prev) => prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e)));
            }}
          />
        )}
      </main>

      {/* Mobile Floating Action Button (FAB) for Quick New Guest */}
      {activeTab === 'guests' && (
        <button
          onClick={() => {
            setInvitationToEdit(null);
            setIsGuestModalOpen(true);
          }}
          className="md:hidden fixed bottom-20 right-4 z-30 flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white px-4 py-3.5 rounded-full shadow-xl shadow-teal-900/20 font-bold text-xs transition active:scale-95 border border-teal-600 cursor-pointer"
          title="Cadastrar Novo Convite"
        >
          <Plus size={18} />
          <span>Novo Convite</span>
        </button>
      )}

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 safe-area-pb shadow-lg">
        <div className="grid grid-cols-5 h-16 items-center px-1">
          <button
            onClick={() => setActiveTab('guests')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
              activeTab === 'guests'
                ? 'text-teal-700 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users size={18} />
            <span className="text-[10px] mt-1">Convidados</span>
          </button>

          <button
            onClick={() => setActiveTab('checkin')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
              activeTab === 'checkin'
                ? 'text-purple-700 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <CalendarCheck size={18} />
            <span className="text-[10px] mt-1">Check-in</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
              activeTab === 'reports'
                ? 'text-teal-700 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <BarChart3 size={18} />
            <span className="text-[10px] mt-1">Relatórios</span>
          </button>

          <button
            onClick={() => setActiveTab('social_preview')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
              activeTab === 'social_preview'
                ? 'text-sky-700 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Share2 size={18} />
            <span className="text-[10px] mt-1">Preview</span>
          </button>

          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center py-1 rounded-xl text-slate-500 hover:text-slate-900 transition cursor-pointer"
          >
            <Menu size={18} />
            <span className="text-[10px] mt-1">Menu</span>
          </button>
        </div>
      </nav>

      {/* Modals & Drawers */}
      <GuestModal
        isOpen={isGuestModalOpen}
        onClose={() => {
          setIsGuestModalOpen(false);
          setInvitationToEdit(null);
        }}
        event={activeEvent}
        invitationToEdit={invitationToEdit}
        onSuccess={(inv) => {
          if (invitationToEdit) {
            setInvitations((prev) => prev.map((i) => (i.id === inv.id ? inv : i)));
          } else {
            setInvitations((prev) => [inv, ...prev]);
          }
          triggerSaveSuccess('Convite salvo com sucesso no banco de dados!');
        }}
      />

      <GuestDrawer
        invitation={selectedInvitation}
        event={activeEvent}
        onClose={() => setIsDrawerOpen(false)}
        onEdit={(inv) => {
          setIsDrawerOpen(false);
          setInvitationToEdit(inv);
          setIsGuestModalOpen(true);
        }}
        onDelete={handleDelete}
        onOpenWhatsApp={(inv) => {
          setSelectedInvitation(inv);
          setIsWhatsAppModalOpen(true);
        }}
        onOpenQr={(inv) => {
          setSelectedInvitation(inv);
          setIsQrModalOpen(true);
        }}
        onUpdate={(updated) => {
          setSelectedInvitation(updated);
          setInvitations((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
          triggerSaveSuccess('Convite atualizado no banco de dados!');
        }}
      />

      <BatchImportModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        event={activeEvent}
        existingInvitations={invitations}
        onSuccess={() => {
          fetchInvitations(activeEvent.id).then(setInvitations);
          triggerSaveSuccess('Convites importados e salvos no banco de dados com sucesso!');
        }}
      />

      <QrCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        invitation={selectedInvitation}
        event={activeEvent}
      />

      <WhatsAppModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        invitation={selectedInvitation}
        event={activeEvent}
      />

      <GenericInviteModal
        isOpen={isGenericModalOpen}
        onClose={() => setIsGenericModalOpen(false)}
        event={activeEvent}
        onOpenForm={() => {
          setIsGenericModalOpen(false);
          if (onOpenPublicInvitation) {
            onOpenPublicInvitation('geral');
          }
        }}
      />

      <InteractiveCoverEditorModal
        isOpen={isCoverModalOpen}
        onClose={() => setIsCoverModalOpen(false)}
        event={activeEvent}
        onEventUpdated={(updated) => {
          setActiveEvent(updated);
          setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
          triggerSaveSuccess('Alterações salvas com sucesso');
        }}
      />

      <EventSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentEvent={activeEvent}
        allEvents={events}
        onSelectEvent={handleSelectEvent}
        onEventsUpdated={(updatedEvents, updatedActive) => {
          setEvents(updatedEvents);
          if (updatedActive) setActiveEvent(updatedActive);
          triggerSaveSuccess('Alterações salvas com sucesso');
        }}
      />

      {/* Confirmation Modal before Deleting Invitation */}
      {invitationToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-pink-200 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-1">
              Remover Convite?
            </h3>
            <p className="text-xs text-slate-600 text-center mb-6 leading-relaxed">
              Tem certeza de que deseja remover o convite de{' '}
              <strong className="text-slate-900 font-bold">
                {invitationToDelete.responsibleName ||
                  invitationToDelete.managerName ||
                  invitationToDelete.familyOrGroup ||
                  invitationToDelete.condoName}
              </strong>
              ? Esta ação é irreversível e liberará as vagas reservadas no sistema.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setInvitationToDelete(null)}
                disabled={deleting}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeDelete}
                disabled={deleting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition text-xs shadow-md shadow-rose-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={15} />
                <span>{deleting ? 'Removendo...' : 'Sim, Remover'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
