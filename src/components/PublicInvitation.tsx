import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  Building2,
  User,
  Phone,
  Download,
  ExternalLink,
  Sparkles,
  AlertCircle,
  FileText,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  QrCode as QrIcon,
  MessageCircle,
  Bookmark,
  X,
  Play,
  Pause,
  RotateCcw,
  Video,
  Volume2,
  VolumeX
} from 'lucide-react';
import confetti from 'canvas-confetti';
import QRCode from 'qrcode';
import { Invitation, CondoEvent, AttendeeRole } from '../types';
import { getInvitationByCode, submitRsvp, getActiveEventPublic, registerPublicInvitation } from '../lib/api';
import { formatPhone, formatDateBR, downloadCalendarFile, buildInvitationUrl } from '../lib/utils';
import { AtivaLogo } from './AtivaLogo';
import { InteractiveCoverViewer } from './InteractiveCoverViewer';
import { FullscreenRsvpModal, GuestItem } from './FullscreenRsvpModal';
import { generateInteractivePdf } from '../lib/interactivePdf';
import { fireCelebrationConfetti } from '../lib/confetti';

interface Props {
  code?: string;
  onNavigateToAdmin?: () => void;
  onBackToAdmin?: () => void;
  onSelectCode?: (newCode: string) => void;
}

export const PublicInvitation: React.FC<Props> = ({
  code = 'geral',
  onNavigateToAdmin,
  onBackToAdmin,
  onSelectCode
}) => {
  const isGenericCode = !code || code.toLowerCase() === 'geral' || code.toLowerCase() === 'aberto' || code.toLowerCase() === 'novo';

  const [mode, setMode] = useState<'generic' | 'code'>(isGenericCode ? 'generic' : 'code');
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [event, setEvent] = useState<CondoEvent | null>(null);
  const [confirmedCount, setConfirmedCount] = useState<number>(0);
  const [availableSlots, setAvailableSlots] = useState<number>(50);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [responsibleName, setResponsibleName] = useState('');
  const [familyOrGroup, setFamilyOrGroup] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [guestsNames, setGuestsNames] = useState('');
  const [guestList, setGuestList] = useState<GuestItem[]>([]);
  const [adultsCount, setAdultsCount] = useState<number>(1);
  const [childrenCount, setChildrenCount] = useState<number>(0);
  const [specialNeeds, setSpecialNeeds] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  const [showDeclinedCard, setShowDeclinedCard] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  const handleAddGuest = () => {
    setGuestList((prev) => [
      ...prev,
      {
        id: `guest-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: '',
        age: ''
      }
    ]);
  };

  const handleRemoveGuest = (id: string) => {
    setGuestList((prev) => prev.filter((g) => g.id !== id));
  };

  const handleGuestChange = (id: string, field: 'name' | 'age', value: string) => {
    setGuestList((prev) =>
      prev.map((g) => (g.id === id ? { ...g, [field]: value } : g))
    );
  };

  // Helper to detect if URL requested immediate form open (e.g. from PDF link with ?confirmar=1, ?rsvp=1, #formulario)
  const shouldInitialAutoOpen = () => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    const hash = (window.location.hash || '').toLowerCase();
    return (
      params.get('confirmar') === '1' ||
      params.get('confirmar') === 'true' ||
      params.get('rsvp') === '1' ||
      params.get('openForm') === 'true' ||
      params.get('open') === 'form' ||
      hash.includes('formulario') ||
      hash.includes('confirmar') ||
      hash.includes('rsvp')
    );
  };

  // Active view: 'video' (Vídeo Convite Principal) or 'cover' (Capa Digital Interativa)
  const [activeView, setActiveView] = useState<'video' | 'cover'>('video');
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);
  const [isVideoEnded, setIsVideoEnded] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Fullscreen Form State
  const [isFormFullscreenOpen, setIsFormFullscreenOpen] = useState(shouldInitialAutoOpen);
  const savedScrollPosRef = useRef<number>(0);

  const openFullscreenForm = () => {
    // Save exact scroll position before opening fullscreen
    savedScrollPosRef.current = window.scrollY || document.documentElement.scrollTop || 0;
    setIsFormFullscreenOpen(true);
  };

  const closeFullscreenForm = () => {
    setIsFormFullscreenOpen(false);

    // Clean up query param/hash without triggering page refresh
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        let changed = false;
        if (url.searchParams.has('confirmar')) {
          url.searchParams.delete('confirmar');
          changed = true;
        }
        if (url.searchParams.has('rsvp')) {
          url.searchParams.delete('rsvp');
          changed = true;
        }
        if (url.searchParams.has('openForm')) {
          url.searchParams.delete('openForm');
          changed = true;
        }
        if (url.hash.includes('formulario') || url.hash.includes('confirmar')) {
          url.hash = '';
          changed = true;
        }
        if (changed) {
          window.history.replaceState({}, '', url.pathname + (url.search ? url.search : '') + (url.hash ? url.hash : ''));
        }
      } catch {
        // ignore url parsing error
      }
    }

    // Restore exact scroll position without jumps or reload
    requestAnimationFrame(() => {
      window.scrollTo({
        top: savedScrollPosRef.current,
        behavior: 'instant' as ScrollBehavior
      });
    });
  };

  // Listen to external popstate/hashchange in case user navigated directly with #formulario or ?confirmar=1
  useEffect(() => {
    if (shouldInitialAutoOpen()) {
      setIsFormFullscreenOpen(true);
    }
  }, [code]);

  // Lock background page scroll strictly while fullscreen is open
  useEffect(() => {
    if (isFormFullscreenOpen) {
      const prevBodyOverflow = document.body.style.overflow;
      const prevHtmlOverflow = document.documentElement.style.overflow;
      const prevBodyTouchAction = document.body.style.touchAction;

      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          closeFullscreenForm();
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = prevBodyOverflow;
        document.documentElement.style.overflow = prevHtmlOverflow;
        document.body.style.touchAction = prevBodyTouchAction;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isFormFullscreenOpen]);

  const showToast = (msg: string) => {
    setToastNotice(msg);
    setTimeout(() => setToastNotice(null), 3500);
  };

  const handleDownloadPdf = async () => {
    if (!event) return;
    setIsExportingPdf(true);
    showToast('Processando download do convite em PDF otimizado...');
    try {
      const result = await generateInteractivePdf({
        event,
        hotspots: event.coverHotspots || [],
        invitationCode: invitation?.code || 'geral',
        autoDownload: true
      });
      showToast(`PDF baixado com sucesso: "${result.fileName}"!`);
    } catch (err: any) {
      console.error(err);
      showToast('Não foi possível gerar o PDF: ' + (err.message || 'Erro ao carregar imagem'));
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!event) return;
    const inviteUrl = buildInvitationUrl(invitation?.code || 'geral');
    const message = `🎉 *${event.shareTitle || event.title}*\n${
      event.shareDescription || 'Confira o convite oficial e confirme sua presença.'
    }\n\n📅 *Data:* ${formatDateBR(event.date)} às ${event.time}\n📍 *Local:* ${
      event.address || event.location
    }\n\n🔗 *Acesse o convite interativo e confirme sua presença:*\n${inviteUrl}`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Synchronize when prop changes
  useEffect(() => {
    if (!code || code.toLowerCase() === 'geral' || code.toLowerCase() === 'aberto') {
      setMode('generic');
    } else {
      setMode('code');
    }
  }, [code]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        if (mode === 'generic') {
          // Load active event for generic open form
          try {
            const data = await getActiveEventPublic();
            setEvent(data.event);
            setConfirmedCount(data.confirmedParticipants);
            setAvailableSlots(data.availableSlots);
            setInvitation(null);
            setShowSuccessCard(false);
            setShowDeclinedCard(false);

            if (data.event) {
              document.title = `${data.event.shareTitle || data.event.title} | Formulário de Confirmação Grupo Ativa`;
              try {
                localStorage.setItem('ativa_cached_public_event', JSON.stringify(data));
              } catch (e) {
                // ignore quota
              }
            }
          } catch (fetchErr) {
            console.warn('[Invitation] Failed to fetch active event from server, checking local cache:', fetchErr);
            const cached = localStorage.getItem('ativa_cached_public_event');
            if (cached) {
              const parsed = JSON.parse(cached);
              setEvent(parsed.event);
              setConfirmedCount(parsed.confirmedParticipants || 0);
              setAvailableSlots(parsed.availableSlots || 50);
            } else {
              // Fallback to default event data
              setEvent({
                id: 'evt-2026-seguranca',
                title: 'Aniversário da Lorena',
                date: '2027-01-10',
                time: 'A partir das 16h',
                location: 'Rua Cachoeira, nº 34, Jardim Rosa de França, Guarulhos',
                address: 'Rua Cachoeira, nº 34, Jardim Rosa de França, Guarulhos',
                bannerUrl: '/covers/default-cover.png',
                presentationText: 'Bem-vindo ao Aniversário da Lorena! Confirme sua presença abaixo.',
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
                    x: 9.2,
                    y: 70.5,
                    width: 39.4,
                    height: 7.1
                  },
                  {
                    id: 'hs-2',
                    name: 'Saber Como Chegar',
                    actionType: 'google_maps',
                    targetUrl: 'https://maps.google.com/?q=Rua+Cachoeira%2C+n%C2%BA+34%2C+Jardim+Rosa+de+Fran%C3%A7a%2C+Guarulhos',
                    openInNewTab: true,
                    x: 51.4,
                    y: 70.5,
                    width: 39.4,
                    height: 7.1
                  }
                ],
                createdAt: '2026-08-28T02:43:42.858Z',
                updatedAt: new Date().toISOString()
              });
            }
          }
          setResponsibleName('');
          setFamilyOrGroup('');
          setWhatsapp('');
          setGuestsNames('');
          setAdultsCount(1);
          setChildrenCount(0);
          setSpecialNeeds('');
        } else {
          // Load invitation by specific code
          const activeCode = code && code.toLowerCase() !== 'geral' ? code : 'ROYAL01';
          const data = await getInvitationByCode(activeCode);
          setInvitation(data.invitation);
          setEvent(data.event);

          if (data.event && data.invitation) {
            const guestTitle = data.invitation.responsibleName || data.invitation.managerName || 'Convidado';
            document.title = `${guestTitle} | Convite Aniversário da Lorena`;
          }

          // Prepopulate form fields
          setResponsibleName(data.invitation.responsibleName || data.invitation.managerName || '');
          setFamilyOrGroup(data.invitation.familyOrGroup || data.invitation.condoName || '');
          setWhatsapp(data.invitation.whatsapp || '');
          setGuestsNames(data.invitation.guestsNames || data.invitation.janitorName || '');

          if (data.invitation.guestsList && Array.isArray(data.invitation.guestsList) && data.invitation.guestsList.length > 0) {
            setGuestList(
              data.invitation.guestsList.map((g, idx) => ({
                id: g.id || `guest-${idx}-${Date.now()}`,
                name: g.name || '',
                age: g.age || ''
              }))
            );
          } else if (data.invitation.guestsNames || data.invitation.janitorName) {
            const raw = data.invitation.guestsNames || data.invitation.janitorName || '';
            const parsed = raw
              .split(',')
              .map((item, idx) => {
                const trimmed = item.trim();
                const match = trimmed.match(/^(.+?)\s*\((.*?)\)$/);
                if (match) {
                  return {
                    id: `guest-pre-${idx}-${Date.now()}`,
                    name: match[1].trim(),
                    age: match[2].trim()
                  };
                }
                return {
                  id: `guest-pre-${idx}-${Date.now()}`,
                  name: trimmed,
                  age: ''
                };
              })
              .filter((g) => g.name.length > 0);
            if (parsed.length > 0) {
              setGuestList(parsed);
            }
          }

          setAdultsCount(
            data.invitation.adultsCount !== undefined
              ? data.invitation.adultsCount
              : data.invitation.participantCount || 1
          );
          setChildrenCount(data.invitation.childrenCount || 0);
          setSpecialNeeds(data.invitation.specialNeeds || '');

          // If the guest already confirmed before, show the pass (but allow editing)
          if (data.invitation.status === 'confirmed' || data.invitation.status === 'checked_in') {
            setShowSuccessCard(true);
          } else if (data.invitation.status === 'declined') {
            setShowDeclinedCard(true);
          } else {
            // Pending or viewed: directly open form!
            setShowSuccessCard(false);
            setShowDeclinedCard(false);
          }

          // Generate QR code for entry
          const passUrl = buildInvitationUrl(data.invitation.code);
          const qr = await QRCode.toDataURL(passUrl, { width: 320, margin: 2 });
          setQrDataUrl(qr);
        }
      } catch (err: any) {
        setError(err.message || 'Não foi possível carregar as informações do convite.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [code, mode]);

  // When invitation changes (e.g. after confirmation), generate its QR code
  useEffect(() => {
    if (invitation?.code) {
      const passUrl = buildInvitationUrl(invitation.code);
      QRCode.toDataURL(passUrl, { width: 320, margin: 2 }).then(setQrDataUrl).catch(console.error);
    }
  }, [invitation?.code]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setWhatsapp(formatted);
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!responsibleName.trim()) {
      alert('Por favor, preencha o Nome do responsável adulto (campo obrigatório).');
      return;
    }

    try {
      setSubmitting(true);

      const validGuests = guestList.filter((g) => g.name && g.name.trim().length > 0);
      const formattedGuestsNames = validGuests
        .map((g) => {
          const name = g.name.trim();
          const age = g.age.trim();
          if (!age) return name;
          const ageStr = age.toLowerCase().includes('ano') ? age : `${age} anos`;
          return `${name} (${ageStr})`;
        })
        .join(', ');

      let additionalAdults = 0;
      let additionalChildren = 0;
      validGuests.forEach((g) => {
        const ageNum = parseInt(g.age, 10);
        if (!isNaN(ageNum) && ageNum < 18) {
          additionalChildren++;
        } else {
          additionalAdults++;
        }
      });

      const safeAdults = 1 + additionalAdults;
      const safeChildren = additionalChildren;
      const famClean = familyOrGroup.trim() || responsibleName.trim();
      const phoneClean = whatsapp.trim() || '+55 (11) 99999-9999';

      const payload = {
        responsibleName: responsibleName.trim(),
        familyOrGroup: famClean,
        condoName: famClean,
        managerName: responsibleName.trim(),
        janitorName: formattedGuestsNames,
        guestsNames: formattedGuestsNames,
        guestsList: validGuests,
        adultsCount: safeAdults,
        childrenCount: safeChildren,
        specialNeeds: specialNeeds.trim(),
        whatsapp: phoneClean
      };

      if (mode === 'generic' || !invitation) {
        if (!event) throw new Error('Evento não carregado');
        const res = await registerPublicInvitation(event.id, payload);

        setInvitation(res.invitation);
        setGuestsNames(formattedGuestsNames);
        setAdultsCount(safeAdults);
        setChildrenCount(safeChildren);
        setShowSuccessCard(true);
        setShowDeclinedCard(false);

        // Grande explosão comemorativa de confetes
        fireCelebrationConfetti();
      } else {
        const res = await submitRsvp(invitation.code, {
          action: 'confirm',
          ...payload
        });

        setInvitation(res.invitation);
        setGuestsNames(formattedGuestsNames);
        setAdultsCount(safeAdults);
        setChildrenCount(safeChildren);
        setShowSuccessCard(true);
        setShowDeclinedCard(false);

        // Grande explosão comemorativa de confetes
        fireCelebrationConfetti();
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao confirmar presença');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!invitation) {
      alert('Como este é o formulário de inscrição, basta não enviar para não participar.');
      return;
    }

    const confirmDecline = window.confirm(
      'Tem certeza de que não poderá comparecer ao aniversário?'
    );
    if (!confirmDecline) return;

    try {
      setSubmitting(true);
      const res = await submitRsvp(invitation.code, {
        action: 'decline',
        responsibleName,
        familyOrGroup,
        whatsapp
      });
      setInvitation(res.invitation);
      setShowDeclinedCard(true);
      setShowSuccessCard(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar resposta');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartNewGenericRegistration = () => {
    setInvitation(null);
    setResponsibleName('');
    setFamilyOrGroup('');
    setGuestsNames('');
    setGuestList([]);
    setWhatsapp('');
    setSpecialNeeds('');
    setAdultsCount(1);
    setChildrenCount(0);
    setShowSuccessCard(false);
    setShowDeclinedCard(false);
    setMode('generic');
    if (onSelectCode) {
      onSelectCode('geral');
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          background:
            'radial-gradient(1100px 700px at 50% 0%, rgba(0, 122, 120, 0.12) 0%, transparent 60%), linear-gradient(165deg, #e6f6f5 0%, #f4faf9 35%, #ffffff 70%, #dcf1ef 100%)'
        }}
      >
        <div className="bg-white border border-teal-200 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-extrabold text-slate-900">Carregando formulário do convite...</h2>
          <p className="text-slate-600 text-xs mt-2 font-medium">Acessando informações e disponibilidade em tempo real</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          background:
            'radial-gradient(1100px 700px at 50% 0%, rgba(0, 122, 120, 0.12) 0%, transparent 60%), linear-gradient(165deg, #e6f6f5 0%, #f4faf9 35%, #ffffff 70%, #dcf1ef 100%)'
        }}
      >
        <div className="bg-white border border-teal-200 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-200">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Convite Não Encontrado</h2>
          <p className="text-slate-600 text-sm mb-6 leading-relaxed">
            {error || 'Não foi possível carregar as informações do convite.'}
          </p>

          <div className="space-y-2">
            <button
              onClick={handleStartNewGenericRegistration}
              className="w-full bg-teal-700 hover:bg-teal-800 text-white py-3 rounded-xl font-bold transition text-sm flex items-center justify-center gap-2 shadow-sm"
            >
              <Sparkles size={16} />
              <span>Abrir Formulário de Inscrição</span>
            </button>

            {(onNavigateToAdmin || onBackToAdmin) && (
              <button
                onClick={onNavigateToAdmin || onBackToAdmin}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 py-2.5 rounded-xl font-semibold transition text-xs border border-slate-300"
              >
                Ir para o Painel Administrativo
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const handleCoverActionTrigger = (spot: any) => {
    const spotName = (spot.name || '').toLowerCase();
    const targetUrl = (spot.targetUrl || '').toLowerCase();
    const isFormAction =
      spot.actionType === 'confirm_rsvp' ||
      spot.actionType === 'open_form' ||
      spot.actionType === 'register' ||
      targetUrl === '#formulario' ||
      targetUrl.startsWith('#') ||
      spotName.includes('confirm') ||
      spotName.includes('presen') ||
      spotName.includes('inscri') ||
      spotName.includes('particip') ||
      spotName.includes('cadastr') ||
      spotName.includes('formul');

    if (isFormAction) {
      openFullscreenForm();
      return;
    }

    let url = spot.targetUrl?.trim();
    if (!url) return;

    if (
      !url.startsWith('http://') &&
      !url.startsWith('https://') &&
      !url.startsWith('mailto:') &&
      !url.startsWith('tel:')
    ) {
      url = `https://${url}`;
    }

    if (spot.openInNewTab) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = url;
    }
  };

  // Ensure responsive, instant-clickable cover areas even before custom setup
  const effectiveHotspots =
    event?.coverHotspots && event.coverHotspots.length > 0
      ? event.coverHotspots
      : [
          {
            id: 'hs-rsvp-default',
            name: 'Confirmar Presença',
            actionType: 'confirm_rsvp' as const,
            targetUrl: '#formulario',
            openInNewTab: false,
            x: 15,
            y: 73,
            width: 70,
            height: 14
          },
          {
            id: 'hs-maps-default',
            name: 'Como Chegar (Maps)',
            actionType: 'google_maps' as const,
            targetUrl: `https://maps.google.com/?q=${encodeURIComponent(
              event?.address || 'Rua Cachoeira, nº 34, Jardim Rosa de França, Guarulhos'
            )}`,
            openInNewTab: true,
            x: 15,
            y: 88,
            width: 70,
            height: 10
          }
        ];

  if (loading && !event) {
    return (
      <div
        className="min-h-screen min-h-[100dvh] w-full flex items-center justify-center p-4 text-slate-800"
        style={{
          background:
            'radial-gradient(1100px 700px at 50% 0%, rgba(0, 122, 120, 0.12) 0%, transparent 60%), linear-gradient(165deg, #e6f6f5 0%, #f4faf9 30%, #ffffff 65%, #ddf2f0 100%)'
        }}
      >
        <div className="bg-white/95 backdrop-blur-md p-8 rounded-3xl border border-teal-200 shadow-xl flex flex-col items-center gap-4 max-w-sm text-center">
          <div className="w-10 h-10 rounded-full border-4 border-teal-200 border-t-[#007A78] animate-spin" />
          <h2 className="text-sm font-bold text-slate-800">Carregando convite...</h2>
          <p className="text-xs text-slate-500">Recuperando informações salvas no banco de dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen min-h-[100dvh] h-[100dvh] sm:h-auto w-full max-w-full overflow-hidden sm:overflow-x-hidden text-slate-800 p-0 sm:py-6 sm:px-4 md:px-6 flex flex-col justify-between"
      style={{
        background:
          'radial-gradient(1100px 700px at 50% 0%, rgba(0, 122, 120, 0.12) 0%, transparent 60%), radial-gradient(850px 550px at 90% 90%, rgba(15, 118, 110, 0.08) 0%, transparent 55%), linear-gradient(165deg, #e6f6f5 0%, #f4faf9 30%, #ffffff 65%, #ddf2f0 100%)'
      }}
    >
      <div className="w-full h-full min-h-[100dvh] sm:min-h-0 sm:max-w-xl md:max-w-2xl mx-auto flex-1 flex flex-col justify-center sm:space-y-3 sm:space-y-4 sm:my-auto overflow-hidden">

        {/* Feedback Toast */}
        {toastNotice && (
          <div className="fixed sm:static top-3 left-3 right-3 z-40 bg-[#007A78] text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-teal-200 shrink-0" />
              <span>{toastNotice}</span>
            </div>
            <button onClick={() => setToastNotice(null)} className="text-teal-100 hover:text-white text-xs ml-2 font-bold cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center">
              ✕
            </button>
          </div>
        )}

        {/* Modo Switcher: Vídeo Convite vs Capa Digital */}
        <div className="flex items-center justify-center gap-1.5 p-1 bg-white/80 backdrop-blur-md rounded-2xl border border-pink-200/90 shadow-xs max-w-xs mx-auto mb-1 z-20">
          <button
            type="button"
            onClick={() => {
              setActiveView('video');
              setIsVideoEnded(false);
            }}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeView === 'video'
                ? 'bg-pink-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-pink-600'
            }`}
          >
            <Video size={14} />
            <span>Vídeo Convite</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('cover')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeView === 'cover'
                ? 'bg-pink-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-pink-600'
            }`}
          >
            <Sparkles size={14} />
            <span>Capa Digital</span>
          </button>
        </div>

        {/* Card Principal do Convite com degrade nos tons claros */}
        <div
          className="w-full h-full min-h-[100dvh] sm:min-h-0 rounded-none sm:rounded-3xl overflow-hidden border-0 sm:border border-pink-200/90 shadow-none sm:shadow-2xl flex flex-col justify-center items-center relative"
          style={{
            background: 'linear-gradient(155deg, #ffffff 0%, #fff7fa 50%, #f0f9ff 100%)'
          }}
        >
          {activeView === 'video' ? (
            /* VÍDEO CONVITE PRINCIPAL DA LORENA */
            <div className="w-full h-full min-h-[100dvh] sm:min-h-0 flex flex-col items-center justify-center relative bg-slate-950 overflow-hidden">
              <div className="relative w-full max-w-[420px] aspect-[9/16] max-h-[85vh] flex items-center justify-center bg-black">
                <video
                  ref={videoRef}
                  src={event?.videoUrl || '/covers/convite-lorena.mp4'}
                  poster={event?.bannerUrl || '/covers/default-cover.png'}
                  playsInline
                  controls
                  className="w-full h-full object-contain"
                  onPlay={() => {
                    setIsVideoPlaying(true);
                    setIsVideoEnded(false);
                  }}
                  onPause={() => setIsVideoPlaying(false)}
                  onEnded={() => {
                    setIsVideoPlaying(false);
                    setIsVideoEnded(true);
                  }}
                />

                {/* Tela Final / Chamada Clara ao Terminar o Vídeo */}
                {isVideoEnded && (
                  <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-30 animate-in fade-in duration-300">
                    <div className="w-14 h-14 rounded-full bg-pink-500/20 text-pink-400 border border-pink-400/40 flex items-center justify-center mb-3 shadow-lg animate-bounce">
                      <Sparkles size={28} />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight">
                      Você está convidado(a)! 🎂✨
                    </h3>
                    <p className="text-pink-100 text-sm sm:text-base font-bold mb-6 max-w-sm leading-snug">
                      Abra o convite para confirmar sua presença e ver como chegar.
                    </p>

                    <div className="w-full max-w-xs space-y-3">
                      <button
                        type="button"
                        onClick={openFullscreenForm}
                        className="w-full py-3.5 px-5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-95 text-white rounded-2xl font-black text-sm sm:text-base shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all border border-emerald-400/50"
                      >
                        <CheckCircle2 size={20} />
                        <span>Confirmar presença</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(
                            `${event?.location || 'Salão Happy Day Kids'}, ${event?.address || 'Rua Cachoeira, nº 34, Jardim Rosa de França, Guarulhos'}`
                          )}`;
                          window.open(mapsUrl, '_blank', 'noopener,noreferrer');
                        }}
                        className="w-full py-3.5 px-5 bg-white/95 hover:bg-white active:scale-95 text-teal-900 rounded-2xl font-black text-sm sm:text-base shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all border border-teal-200"
                      >
                        <MapPin size={20} className="text-teal-600" />
                        <span>Como chegar</span>
                      </button>

                      <div className="flex items-center justify-center gap-4 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (videoRef.current) {
                              videoRef.current.currentTime = 0;
                              videoRef.current.play();
                              setIsVideoEnded(false);
                            }
                          }}
                          className="text-xs text-pink-200 hover:text-white flex items-center gap-1.5 underline cursor-pointer"
                        >
                          <RotateCcw size={13} />
                          <span>Assistir novamente</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveView('cover')}
                          className="text-xs text-pink-200 hover:text-white flex items-center gap-1.5 underline cursor-pointer"
                        >
                          <span>Ver capa digital</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chamada persistente abaixo do vídeo */}
              <div className="w-full bg-slate-900/90 border-t border-slate-800 p-3 sm:p-4 text-center z-20">
                <p className="text-pink-200 font-bold text-xs sm:text-sm mb-2.5">
                  Abra o convite para confirmar sua presença e ver como chegar:
                </p>
                <div className="flex items-center justify-center gap-2 max-w-sm mx-auto">
                  <button
                    type="button"
                    onClick={openFullscreenForm}
                    className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-black shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-95"
                  >
                    <CheckCircle2 size={16} />
                    <span>Confirmar presença</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(
                        `${event?.location || 'Salão Happy Day Kids'}, ${event?.address || 'Rua Cachoeira, nº 34, Jardim Rosa de França, Guarulhos'}`
                      )}`;
                      window.open(mapsUrl, '_blank', 'noopener,noreferrer');
                    }}
                    className="flex-1 py-2.5 px-3 bg-white/95 hover:bg-white text-teal-900 rounded-xl text-xs sm:text-sm font-black border border-teal-200 shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-95"
                  >
                    <MapPin size={16} className="text-teal-600" />
                    <span>Como chegar</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* CAPA DIGITAL INTERATIVA OFICIAL COM HIPERLINKS */
            event?.bannerUrl ? (
              <div
                className="w-full h-full min-h-[100dvh] sm:min-h-0 overflow-hidden flex items-center justify-center"
                style={{
                  background: 'linear-gradient(145deg, #fff5f8 0%, #ffffff 50%, #f0f9ff 100%)'
                }}
              >
                <InteractiveCoverViewer
                  imageUrl={event.bannerUrl}
                  altText={event.title}
                  hotspots={effectiveHotspots}
                  showHotspotBorders={false}
                  interactive={true}
                  onActionTrigger={handleCoverActionTrigger}
                  className="w-full h-full min-h-[100dvh] sm:min-h-0"
                />
              </div>
            ) : (
              <div
                className="p-6 sm:p-8 text-center border-b border-pink-100/90"
                style={{
                  background: 'linear-gradient(145deg, #fff0f5 0%, #ffffff 50%, #f0f9ff 100%)'
                }}
              >
                <span className="inline-block px-3 py-1 rounded-full bg-pink-100 text-pink-700 font-bold text-xs uppercase tracking-wider mb-3 border border-pink-200">
                  Convite Oficial • Aniversário da Lorena
                </span>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 mb-2 tracking-tight">
                  {event?.title}
                </h1>
                {event?.description && (
                  <p className="text-slate-600 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
                    {event.description}
                  </p>
                )}
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={openFullscreenForm}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-sm font-bold shadow-md cursor-pointer"
                  >
                    <CheckCircle2 size={18} />
                    <span>Confirmar presença</span>
                  </button>
                </div>
              </div>
            )
          )}
        </div>

        {/* Floating Quick Action Bar on Mobile for instant 1-tap confirmation */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 p-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-slate-950/95 via-slate-900/80 to-transparent flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={openFullscreenForm}
            className="flex-1 max-w-[210px] py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-black shadow-lg flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
          >
            <CheckCircle2 size={16} className="text-emerald-200" />
            <span>Confirmar Presença</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(
                `${event?.location || 'Salão Happy Day Kids'}, ${event?.address || 'Rua Cachoeira, nº 34, Jardim Rosa de França, Guarulhos'}`
              )}`;
              window.open(mapsUrl, '_blank', 'noopener,noreferrer');
            }}
            className="flex-1 max-w-[180px] py-2.5 px-3 bg-white/95 hover:bg-white active:bg-slate-100 text-teal-900 rounded-xl text-xs font-black shadow-lg flex items-center justify-center gap-1.5 cursor-pointer border border-teal-200 active:scale-95 transition-all"
          >
            <MapPin size={16} className="text-teal-600" />
            <span>Como Chegar</span>
          </button>
        </div>

        {/* Rodapé delicado no Desktop */}
        <div className="hidden sm:block text-center text-[11px] text-pink-700 font-semibold py-2">
          Aniversário da Lorena • 10/01/2027 a partir das 16h • Esperamos por você! 🎉
        </div>
      </div>

      {/* Modal / Camada Fullscreen de Confirmação de Presença (100dvw x 100dvh) */}
      <FullscreenRsvpModal
        isOpen={isFormFullscreenOpen}
        onClose={closeFullscreenForm}
        event={event}
        invitation={invitation}
        showSuccessCard={showSuccessCard}
        showDeclinedCard={showDeclinedCard}
        qrDataUrl={qrDataUrl}
        submitting={submitting}
        responsibleName={responsibleName}
        setResponsibleName={setResponsibleName}
        familyOrGroup={familyOrGroup}
        setFamilyOrGroup={setFamilyOrGroup}
        whatsapp={whatsapp}
        handlePhoneChange={handlePhoneChange}
        guestList={guestList}
        onAddGuest={handleAddGuest}
        onRemoveGuest={handleRemoveGuest}
        onGuestChange={handleGuestChange}
        guestsNames={guestsNames}
        setGuestsNames={setGuestsNames}
        adultsCount={adultsCount}
        setAdultsCount={setAdultsCount}
        childrenCount={childrenCount}
        setChildrenCount={setChildrenCount}
        specialNeeds={specialNeeds}
        setSpecialNeeds={setSpecialNeeds}
        availableSlots={availableSlots}
        handleConfirm={handleConfirm}
        handleDecline={handleDecline}
        setShowSuccessCard={setShowSuccessCard}
        setShowDeclinedCard={setShowDeclinedCard}
        downloadCalendarFile={downloadCalendarFile}
      />
    </div>
  );
};

