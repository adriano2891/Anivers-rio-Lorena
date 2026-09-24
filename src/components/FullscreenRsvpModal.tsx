import React, { useEffect, useRef } from 'react';
import {
  CheckCircle2,
  XCircle,
  X,
  ArrowLeft,
  User,
  Phone,
  Users,
  MapPin,
  ExternalLink,
  Download,
  Sparkles,
  Heart,
  Baby,
  AlertTriangle,
  Calendar,
  Clock
} from 'lucide-react';
import { CondoEvent, Invitation } from '../types';
import { fireCelebrationConfetti } from '../lib/confetti';
import { formatDateBR } from '../lib/utils';

interface FullscreenRsvpModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CondoEvent;
  invitation: Invitation | null;
  showSuccessCard: boolean;
  showDeclinedCard: boolean;
  qrDataUrl: string;
  submitting: boolean;
  // Birthday fields
  responsibleName: string;
  setResponsibleName: (val: string) => void;
  familyOrGroup: string;
  setFamilyOrGroup: (val: string) => void;
  whatsapp: string;
  handlePhoneChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  guestsNames: string;
  setGuestsNames: (val: string) => void;
  adultsCount: number;
  setAdultsCount: React.Dispatch<React.SetStateAction<number>>;
  childrenCount: number;
  setChildrenCount: React.Dispatch<React.SetStateAction<number>>;
  specialNeeds: string;
  setSpecialNeeds: (val: string) => void;
  availableSlots?: number;
  handleConfirm: (e: React.FormEvent) => void;
  handleDecline: () => void;
  setShowSuccessCard: (val: boolean) => void;
  setShowDeclinedCard: (val: boolean) => void;
  downloadCalendarFile: (event: CondoEvent) => void;
}

export const FullscreenRsvpModal: React.FC<FullscreenRsvpModalProps> = ({
  isOpen,
  onClose,
  event,
  invitation,
  showSuccessCard,
  showDeclinedCard,
  qrDataUrl,
  submitting,
  responsibleName,
  setResponsibleName,
  familyOrGroup,
  setFamilyOrGroup,
  whatsapp,
  handlePhoneChange,
  guestsNames,
  setGuestsNames,
  adultsCount,
  setAdultsCount,
  childrenCount,
  setChildrenCount,
  specialNeeds,
  setSpecialNeeds,
  availableSlots = 150,
  handleConfirm,
  handleDecline,
  setShowSuccessCard,
  setShowDeclinedCard,
  downloadCalendarFile
}) => {
  const confettiFiredRef = useRef<string | null>(null);

  // Explosão de confetes ao exibir o passe QR Code / confirmação de presença
  useEffect(() => {
    if (isOpen && showSuccessCard) {
      const triggerKey = `${invitation?.code || 'confirmed'}-${qrDataUrl ? 'qr' : 'init'}`;
      if (confettiFiredRef.current !== triggerKey) {
        confettiFiredRef.current = triggerKey;
        const timer = setTimeout(() => {
          fireCelebrationConfetti();
        }, 150);
        return () => clearTimeout(timer);
      }
    } else if (!showSuccessCard) {
      confettiFiredRef.current = null;
    }
  }, [isOpen, showSuccessCard, qrDataUrl, invitation?.code]);

  // ESC key listener to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalPeople = Math.max(1, (Number(adultsCount) || 0) + (Number(childrenCount) || 0));
  const isCapacityReached = availableSlots <= 0;
  const isNearCapacity = availableSlots > 0 && availableSlots <= 20;

  return (
    <div
      id="fullscreen-rsvp-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fullscreen-modal-title"
      className="fixed inset-0 z-[9999] w-screen w-[100dvw] h-screen h-[100dvh] flex flex-col overflow-hidden text-slate-800 animate-in fade-in duration-150"
      style={{
        overscrollBehavior: 'none',
        background:
          'radial-gradient(1100px 650px at 50% 0%, rgba(244, 114, 182, 0.15) 0%, transparent 65%), radial-gradient(900px 600px at 10% 90%, rgba(186, 230, 253, 0.2) 0%, transparent 60%), linear-gradient(160deg, #fdf2f8 0%, #ffffff 40%, #f0f9ff 100%)'
      }}
    >
      {/* Barra Superior Fixa com Botão Fechar */}
      <header className="shrink-0 w-full bg-white/95 border-b border-pink-200/80 px-4 py-3 flex items-center justify-between backdrop-blur-md z-10 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-pink-100 border border-pink-300 flex items-center justify-center text-pink-600 shrink-0 shadow-2xs">
            <Heart size={16} className="fill-pink-500 text-pink-500" />
          </div>
          <div className="min-w-0">
            <h1 id="fullscreen-modal-title" className="text-xs sm:text-sm font-black text-slate-900 truncate">
              {showSuccessCard ? 'Presença Confirmada 🎉' : 'Confirmar Presença'}
            </h1>
            <p className="text-[10px] text-pink-700 font-semibold truncate">
              {event.title} • 10/01/2027
            </p>
          </div>
        </div>

        {/* Botão × Fechar */}
        <button
          type="button"
          id="btn-close-fullscreen-top"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-pink-50 text-slate-700 hover:text-pink-700 border border-pink-200 text-xs sm:text-sm font-bold transition shadow-2xs cursor-pointer select-none"
          aria-label="Fechar formulário e voltar ao convite"
        >
          <span className="text-lg font-bold leading-none select-none">×</span>
          <span>Fechar</span>
        </button>
      </header>

      {/* Área Central Rolável */}
      <div
        className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-4 py-4 sm:py-6 flex flex-col items-center justify-start pb-[max(2rem,env(safe-area-inset-bottom))]"
        style={{ touchAction: 'pan-y' }}
      >
        <div className="w-full max-w-lg md:max-w-xl mx-auto py-1">
          {showSuccessCard ? (
            /* TELA DE SUCESSO APÓS CONFIRMAÇÃO */
            <div
              id="rsvp-success-fullscreen-card"
              className="border border-pink-200 rounded-3xl p-5 sm:p-7 shadow-2xl text-slate-900 text-center animate-in fade-in zoom-in-95 duration-200"
              style={{
                background: 'linear-gradient(155deg, #ffffff 0%, #fff7fa 50%, #f0f9ff 100%)'
              }}
            >
              <div
                onClick={() => fireCelebrationConfetti()}
                title="Comemorar confirmação!"
                className="w-16 h-16 bg-pink-100 text-pink-600 hover:bg-pink-200 cursor-pointer active:scale-95 rounded-full flex items-center justify-center mx-auto mb-3 border border-pink-300 shadow-md transition-transform"
              >
                <CheckCircle2 size={36} className="text-pink-600" />
              </div>

              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-950 tracking-tight mb-1.5">
                Presença Confirmada com Sucesso! 🎉
              </h2>
              <p className="text-slate-700 text-xs sm:text-sm font-medium mb-4 sm:mb-5 leading-relaxed max-w-md mx-auto">
                Estamos muito felizes em celebrar este dia especial com você e sua família! Guarde seu passe de entrada abaixo.
              </p>

              {/* Botão Voltar ao Convite */}
              <div className="mb-4 sm:mb-5">
                <button
                  type="button"
                  id="btn-voltar-ao-convite"
                  onClick={onClose}
                  className="w-full bg-pink-600 hover:bg-pink-700 active:bg-pink-800 text-white font-black py-3 sm:py-3.5 px-6 rounded-2xl shadow-lg shadow-pink-600/25 transition text-sm sm:text-base tracking-wide flex items-center justify-center gap-2 min-h-[48px] cursor-pointer"
                >
                  <ArrowLeft size={18} />
                  <span>Voltar ao convite</span>
                </button>
              </div>

              {/* Passe QR Code Oficial */}
              {qrDataUrl && invitation && (
                <div
                  onClick={() => fireCelebrationConfetti()}
                  title="Clique para comemorar!"
                  className="bg-white hover:bg-pink-50/40 active:scale-[0.98] transition cursor-pointer border border-pink-200 rounded-3xl p-4 sm:p-5 max-w-[280px] sm:max-w-[300px] mx-auto mb-4 shadow-sm text-center"
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-pink-600 mb-1.5 flex items-center justify-center gap-1">
                    <Sparkles size={12} /> Passe Oficial de Entrada
                  </div>
                  <img
                    src={qrDataUrl}
                    alt={`QR Code ${invitation.code}`}
                    className="w-40 h-40 mx-auto rounded-2xl bg-white p-2 border border-pink-100 object-contain block shadow-2xs"
                  />
                  <div className="mt-2 font-mono font-black text-sm sm:text-base tracking-widest text-pink-700 bg-pink-50 py-1 px-3.5 rounded-xl border border-pink-200 inline-block">
                    #{invitation.code}
                  </div>
                </div>
              )}

              {/* Resumo dos Dados Confirmados */}
              {invitation && (
                <div className="bg-white/80 rounded-2xl p-4 border border-pink-100 text-left mb-5 space-y-2.5 text-xs sm:text-sm shadow-2xs">
                  <div className="flex items-center justify-between gap-2 py-1 border-b border-pink-100">
                    <span className="text-slate-500 font-medium">Responsável:</span>
                    <span className="font-bold text-slate-900 text-right truncate pl-2">
                      {invitation.responsibleName || invitation.managerName}
                    </span>
                  </div>

                  {(invitation.familyOrGroup || invitation.condoName) && (
                    <div className="flex items-center justify-between gap-2 py-1 border-b border-pink-100">
                      <span className="text-slate-500 font-medium">Família / Grupo:</span>
                      <span className="font-semibold text-slate-800 text-right truncate pl-2">
                        {invitation.familyOrGroup || invitation.condoName}
                      </span>
                    </div>
                  )}

                  {(invitation.guestsNames || invitation.janitorName) && (
                    <div className="flex items-start justify-between gap-2 py-1 border-b border-pink-100">
                      <span className="text-slate-500 font-medium shrink-0">Acompanhantes:</span>
                      <span className="font-semibold text-slate-800 text-right pl-2">
                        {invitation.guestsNames || invitation.janitorName}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 py-1 border-b border-pink-100">
                    <span className="text-slate-500 font-medium">Total de Pessoas:</span>
                    <span className="font-black text-pink-700 text-right">
                      {invitation.adultsCount !== undefined
                        ? `${invitation.adultsCount + (invitation.childrenCount || 0)} pessoas (${invitation.adultsCount} adultos, ${invitation.childrenCount || 0} crianças)`
                        : `${invitation.participantCount || 1} pessoas`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 py-1 border-b border-pink-100">
                    <span className="text-slate-500 font-medium">Data & Horário:</span>
                    <span className="font-bold text-slate-900 text-right">
                      10/01/2027 a partir das 16h
                    </span>
                  </div>

                  {event?.address && (
                    <div className="flex items-start justify-between gap-2 py-1">
                      <span className="text-slate-500 font-medium shrink-0">Local da Festa:</span>
                      <span className="font-bold text-slate-900 text-right pl-2">
                        {event.address}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Ações complementares */}
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={() => downloadCalendarFile(event)}
                  className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-700 active:bg-pink-800 text-white font-bold py-3 px-4 rounded-xl transition shadow-xs text-xs sm:text-sm min-h-[44px] cursor-pointer"
                >
                  <Download size={16} />
                  <span>Salvar na Agenda (.ics)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSuccessCard(false)}
                  className="w-full sm:flex-1 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-bold py-3 px-4 rounded-xl border border-slate-300 transition text-xs sm:text-sm min-h-[44px] cursor-pointer"
                >
                  Editar Confirmação
                </button>
              </div>
            </div>
          ) : showDeclinedCard && invitation ? (
            /* RESPOSTA REGISTRADA: NÃO PODERÁ COMPARECER */
            <div className="bg-white border border-rose-200 rounded-3xl p-5 sm:p-7 shadow-2xl text-slate-900 text-center">
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3 border border-rose-200">
                <XCircle size={36} />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-1.5 tracking-tight">
                Resposta Registrada
              </h2>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-5 max-w-md mx-auto">
                Registramos que você e sua família não poderão comparecer desta vez. Sentiremos sua falta e agradecemos muito pelo carinho de nos avisar!
              </p>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeclinedCard(false);
                    setShowSuccessCard(false);
                  }}
                  className="w-full bg-pink-600 hover:bg-pink-700 active:bg-pink-800 text-white font-bold py-3.5 px-6 rounded-2xl transition text-xs sm:text-sm shadow-md min-h-[44px] cursor-pointer"
                >
                  Mudei de ideia: Desejo Confirmar Presença 🎉
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold py-3 px-4 rounded-xl border border-slate-300 transition text-xs sm:text-sm min-h-[44px] cursor-pointer"
                >
                  Voltar ao convite
                </button>
              </div>
            </div>
          ) : (
            /* FORMULÁRIO DE CONFIRMAÇÃO */
            <div
              className="border border-pink-200 rounded-3xl p-4 sm:p-6 md:p-7 shadow-2xl text-slate-900 animate-in fade-in zoom-in-95 duration-150"
              style={{
                background: 'linear-gradient(155deg, #ffffff 0%, #fff7fa 50%, #f0f9ff 100%)'
              }}
            >
              {/* Top info */}
              <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-pink-100">
                <div>
                  <div className="flex items-center gap-1.5 text-pink-600 font-bold text-[11px] tracking-wider uppercase mb-0.5">
                    <Sparkles size={13} className="text-pink-600 shrink-0" />
                    <span>Confirmação de Presença</span>
                  </div>
                  <h2 className="text-lg sm:text-xl md:text-2xl font-black text-slate-950 tracking-tight leading-tight">
                    Aniversário da Lorena 🎉
                  </h2>
                  <p className="text-slate-600 text-xs sm:text-sm mt-0.5 leading-normal">
                    Preencha os dados abaixo para confirmar sua presença e emitir o passe oficial da festa.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-pink-50 transition cursor-pointer shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center"
                  title="Fechar formulário"
                  aria-label="Fechar formulário"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Event Date & Location quick pill */}
              <div className="mb-4 bg-white/90 border border-pink-200/80 rounded-2xl p-3 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-2">
                  <Calendar size={15} className="text-pink-600 shrink-0" />
                  <span className="font-bold text-slate-900">10/01/2027 a partir das 16h</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 text-[11px]">
                  <MapPin size={14} className="text-sky-600 shrink-0" />
                  <span className="truncate">Rua Cachoeira, nº 34, Guarulhos</span>
                </div>
              </div>

              {/* Capacity Warnings */}
              {isCapacityReached ? (
                <div className="mb-4 bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-800 flex items-start gap-2.5">
                  <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-black text-rose-900 text-sm mb-0.5">
                      Capacidade Máxima Atingida
                    </strong>
                    Todas as 150 vagas para o Aniversário da Lorena já foram preenchidas. Entre em contato com os organizadores caso precise de assistência.
                  </div>
                </div>
              ) : isNearCapacity ? (
                <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-800 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                  <span>
                    <strong>Últimas Vagas:</strong> Restam apenas <strong>{availableSlots}</strong> vagas para atingir a capacidade máxima (150 pessoas).
                  </span>
                </div>
              ) : null}

              <form id="rsvp-form" onSubmit={handleConfirm} className="space-y-3.5">
                {/* 1. Nome do responsável */}
                <div>
                  <label htmlFor="input-resp-name" className="block text-[11px] sm:text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
                    Nome do Responsável <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User size={18} />
                    </div>
                    <input
                      id="input-resp-name"
                      type="text"
                      required
                      value={responsibleName}
                      onChange={(e) => setResponsibleName(e.target.value)}
                      placeholder="Ex: Mariana Silva"
                      className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-slate-900 font-semibold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-xs sm:text-sm shadow-2xs min-h-[48px]"
                    />
                  </div>
                </div>

                {/* 2. Família / Grupo & WhatsApp */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="input-family-name" className="block text-[11px] sm:text-xs font-bold text-slate-900 uppercase tracking-wider mb-1 truncate">
                      Família / Grupo (Opcional)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Users size={18} />
                      </div>
                      <input
                        id="input-family-name"
                        type="text"
                        value={familyOrGroup}
                        onChange={(e) => setFamilyOrGroup(e.target.value)}
                        placeholder="Ex: Família Silva / Tios"
                        className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-slate-900 font-semibold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-xs sm:text-sm shadow-2xs min-h-[48px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="input-whatsapp" className="block text-[11px] sm:text-xs font-bold text-slate-900 uppercase tracking-wider mb-1 truncate">
                      WhatsApp <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Phone size={18} />
                      </div>
                      <input
                        id="input-whatsapp"
                        type="tel"
                        required
                        value={whatsapp}
                        onChange={handlePhoneChange}
                        placeholder="+55 (11) 99999-9999"
                        className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-slate-900 font-mono font-semibold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-xs sm:text-sm shadow-2xs min-h-[48px]"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Convidados / Acompanhantes */}
                <div>
                  <label htmlFor="input-guests-names" className="block text-[11px] sm:text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
                    Nome dos Acompanhantes / Convidados
                  </label>
                  <input
                    id="input-guests-names"
                    type="text"
                    value={guestsNames}
                    onChange={(e) => setGuestsNames(e.target.value)}
                    placeholder="Ex: Mariana, Carlos, Dudu e Alice"
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 sm:py-3 text-slate-900 font-semibold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-xs sm:text-sm shadow-2xs min-h-[48px]"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Liste os nomes das pessoas que virão com você.
                  </p>
                </div>

                {/* 4. Quantidade de Adultos e Crianças */}
                <div className="bg-white border border-pink-200 rounded-2xl p-4 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5 text-pink-700">
                      <Users size={15} /> Quantidade de Pessoas
                    </span>
                    <span className="text-pink-600 font-black bg-pink-50 px-2.5 py-0.5 rounded-lg border border-pink-200">
                      Total: {totalPeople} {totalPeople === 1 ? 'pessoa' : 'pessoas'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Adultos
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setAdultsCount((prev) => Math.max(1, prev - 1))}
                          className="w-9 h-9 rounded-xl bg-pink-50 border border-pink-200 text-pink-700 font-black hover:bg-pink-100 flex items-center justify-center cursor-pointer text-base"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={15}
                          value={adultsCount}
                          onChange={(e) => setAdultsCount(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full bg-slate-50 border border-pink-200 rounded-xl py-1.5 text-center font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 min-h-[38px]"
                        />
                        <button
                          type="button"
                          onClick={() => setAdultsCount((prev) => prev + 1)}
                          className="w-9 h-9 rounded-xl bg-pink-50 border border-pink-200 text-pink-700 font-black hover:bg-pink-100 flex items-center justify-center cursor-pointer text-base"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                        <Baby size={13} className="text-pink-600" /> Crianças
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setChildrenCount((prev) => Math.max(0, prev - 1))}
                          className="w-9 h-9 rounded-xl bg-pink-50 border border-pink-200 text-pink-700 font-black hover:bg-pink-100 flex items-center justify-center cursor-pointer text-base"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={15}
                          value={childrenCount}
                          onChange={(e) => setChildrenCount(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full bg-slate-50 border border-pink-200 rounded-xl py-1.5 text-center font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 min-h-[38px]"
                        />
                        <button
                          type="button"
                          onClick={() => setChildrenCount((prev) => prev + 1)}
                          className="w-9 h-9 rounded-xl bg-pink-50 border border-pink-200 text-pink-700 font-black hover:bg-pink-100 flex items-center justify-center cursor-pointer text-base"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Observações e necessidades especiais */}
                <div>
                  <label htmlFor="input-special-needs" className="block text-[11px] sm:text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
                    Observações e Necessidades Especiais (Opcional)
                  </label>
                  <textarea
                    id="input-special-needs"
                    rows={2}
                    value={specialNeeds}
                    onChange={(e) => setSpecialNeeds(e.target.value)}
                    placeholder="Ex: Alergia a amendoim, bebê de 6 meses (cadeirão), cadeira de rodas..."
                    className="w-full bg-white border border-slate-300 rounded-xl p-3 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-xs sm:text-sm shadow-2xs"
                  />
                </div>

                {/* Botões de Ação */}
                <div className="pt-2 space-y-2">
                  <button
                    type="submit"
                    id="btn-confirmar-presenca-submit"
                    disabled={submitting || isCapacityReached}
                    className="w-full bg-pink-600 hover:bg-pink-700 active:bg-pink-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-3.5 px-6 rounded-2xl shadow-lg shadow-pink-600/30 transition text-sm sm:text-base tracking-wide flex items-center justify-center gap-2 min-h-[48px] cursor-pointer"
                  >
                    <CheckCircle2 size={18} />
                    <span>
                      {submitting
                        ? 'Confirmando presença...'
                        : isCapacityReached
                        ? 'Capacidade Esgotada'
                        : `Confirmar Presença (${totalPeople} ${totalPeople === 1 ? 'pessoa' : 'pessoas'})`}
                    </span>
                  </button>

                  {invitation && (
                    <button
                      type="button"
                      onClick={handleDecline}
                      disabled={submitting}
                      className="w-full bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 font-bold py-2.5 px-4 rounded-xl border border-slate-300 hover:border-rose-300 transition text-xs min-h-[40px] cursor-pointer"
                    >
                      Infelizmente não poderei comparecer
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
