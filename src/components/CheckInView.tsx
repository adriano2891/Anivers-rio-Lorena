import React, { useState, useMemo } from 'react';
import {
  CalendarCheck,
  Search,
  CheckCircle2,
  Users,
  QrCode,
  User,
  Clock,
  RotateCcw,
  Sparkles,
  Camera,
  AlertCircle,
  Heart,
  Baby,
  Edit3,
  Phone,
  Check,
  X
} from 'lucide-react';
import { Invitation, CondoEvent } from '../types';
import { formatDateTimeBR, formatDateBR, formatPhone } from '../lib/utils';
import { toggleCheckin } from '../lib/api';

interface Props {
  event: CondoEvent;
  invitations: Invitation[];
  onUpdateInvitation: (updated: Invitation) => void;
}

export const CheckInView: React.FC<Props> = ({
  event,
  invitations,
  onUpdateInvitation
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'checked_in' | 'pending'>('all');
  const [manualCode, setManualCode] = useState('');
  const [checkinStatusMessage, setCheckinStatusMessage] = useState<string | null>(null);
  const [checkinErrorMessage, setCheckinErrorMessage] = useState<string | null>(null);
  const [partialModalInvitation, setPartialModalInvitation] = useState<Invitation | null>(null);
  const [partialCountInput, setPartialCountInput] = useState<number>(1);

  // Filtered lists
  const confirmedList = useMemo(
    () => invitations.filter((i) => i.status === 'confirmed' || i.status === 'checked_in'),
    [invitations]
  );

  const checkedInList = useMemo(
    () => invitations.filter((i) => i.status === 'checked_in'),
    [invitations]
  );

  // Total confirmed participants (adults + children)
  const totalConfirmedParticipants = useMemo(
    () =>
      confirmedList.reduce((acc, curr) => {
        const adults = curr.adultsCount !== undefined ? curr.adultsCount : (curr.participantCount || 1);
        const children = curr.childrenCount || 0;
        return acc + (curr.adultsCount !== undefined ? adults + children : (curr.participantCount || 1));
      }, 0),
    [confirmedList]
  );

  // Total people who actually checked in
  const totalCheckedInParticipants = useMemo(
    () =>
      checkedInList.reduce((acc, curr) => {
        if (curr.checkedInCount !== undefined) {
          return acc + curr.checkedInCount;
        }
        const adults = curr.adultsCount !== undefined ? curr.adultsCount : (curr.participantCount || 1);
        const children = curr.childrenCount || 0;
        return acc + (curr.adultsCount !== undefined ? adults + children : (curr.participantCount || 1));
      }, 0),
    [checkedInList]
  );

  const remainingParticipants = Math.max(0, totalConfirmedParticipants - totalCheckedInParticipants);

  // Search filter across responsible, family, guests, whatsapp, code
  const filteredGuests = useMemo(() => {
    return invitations
      .filter((inv) => {
        if (filter === 'checked_in') return inv.status === 'checked_in';
        if (filter === 'pending') return inv.status === 'confirmed' || inv.status === 'pending';
        return true;
      })
      .filter((inv) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase().trim();
        const resp = (inv.responsibleName || inv.managerName || '').toLowerCase();
        const fam = (inv.familyOrGroup || inv.condoName || '').toLowerCase();
        const guests = (inv.guestsNames || inv.janitorName || '').toLowerCase();
        const code = inv.code.toLowerCase();
        const phone = inv.whatsapp || '';

        return (
          resp.includes(q) ||
          fam.includes(q) ||
          guests.includes(q) ||
          code.includes(q) ||
          phone.includes(q)
        );
      });
  }, [invitations, filter, search]);

  const handleFullCheckin = async (inv: Invitation) => {
    const totalPeople =
      inv.adultsCount !== undefined
        ? inv.adultsCount + (inv.childrenCount || 0)
        : inv.participantCount || 1;

    try {
      const updated = await toggleCheckin(inv.id, { checkedInCount: totalPeople });
      onUpdateInvitation(updated);
      setCheckinErrorMessage(null);
      const name = updated.responsibleName || updated.managerName;
      setCheckinStatusMessage(
        updated.status === 'checked_in'
          ? `Check-in de ${name} confirmado! (${totalPeople} ${totalPeople === 1 ? 'pessoa presente' : 'pessoas presentes'})`
          : `Check-in de ${name} desfeito.`
      );
      setTimeout(() => setCheckinStatusMessage(null), 4000);
    } catch (err: any) {
      setCheckinErrorMessage(err.message || 'Erro ao registrar check-in.');
    }
  };

  const handleOpenPartialModal = (inv: Invitation) => {
    const totalPeople =
      inv.adultsCount !== undefined
        ? inv.adultsCount + (inv.childrenCount || 0)
        : inv.participantCount || 1;

    setPartialModalInvitation(inv);
    setPartialCountInput(inv.checkedInCount !== undefined ? inv.checkedInCount : totalPeople);
  };

  const handleConfirmPartialCheckin = async () => {
    if (!partialModalInvitation) return;
    const count = Math.max(1, Number(partialCountInput) || 1);

    try {
      const updated = await toggleCheckin(partialModalInvitation.id, { checkedInCount: count });
      onUpdateInvitation(updated);
      setCheckinErrorMessage(null);
      const name = updated.responsibleName || updated.managerName;
      setCheckinStatusMessage(
        `Check-in parcial registrado para ${name}: ${count} pessoas presentes!`
      );
      setPartialModalInvitation(null);
      setTimeout(() => setCheckinStatusMessage(null), 4000);
    } catch (err: any) {
      setCheckinErrorMessage(err.message || 'Erro ao registrar check-in parcial.');
    }
  };

  const handleUndoCheckin = async (inv: Invitation) => {
    try {
      const updated = await toggleCheckin(inv.id, { undo: true });
      onUpdateInvitation(updated);
      setCheckinErrorMessage(null);
      const name = updated.responsibleName || updated.managerName;
      setCheckinStatusMessage(`Check-in de ${name} foi cancelado com sucesso.`);
      setTimeout(() => setCheckinStatusMessage(null), 4000);
    } catch (err: any) {
      setCheckinErrorMessage(err.message || 'Erro ao cancelar check-in.');
    }
  };

  const handleManualCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    const clean = manualCode.trim().toUpperCase().replace('#', '');
    const found = invitations.find(
      (i) => i.code.toUpperCase() === clean || i.id === clean
    );
    if (!found) {
      setCheckinErrorMessage(`Código "${manualCode}" não encontrado na lista de convidados.`);
      setTimeout(() => setCheckinErrorMessage(null), 4000);
      return;
    }
    handleFullCheckin(found);
    setManualCode('');
  };

  return (
    <div className="space-y-5">
      {/* Toast Feedback */}
      {checkinStatusMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span>{checkinStatusMessage}</span>
          </div>
          <button
            onClick={() => setCheckinStatusMessage(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {checkinErrorMessage && (
        <div className="bg-rose-50 border border-rose-300 text-rose-900 px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-rose-600 shrink-0" />
            <span>{checkinErrorMessage}</span>
          </div>
          <button
            onClick={() => setCheckinErrorMessage(null)}
            className="text-rose-700 hover:text-rose-950 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner & Fast QR Code Search */}
      <div className="bg-gradient-to-r from-pink-50 via-white to-sky-50 border border-pink-200 rounded-3xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-pink-600 text-xs font-bold uppercase tracking-wider">
              <Sparkles size={15} />
              <span>Recepção • Aniversário da Lorena</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900">
              Controle de Entrada & Check-in no Dia da Festa
            </h2>
            <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
              Localize convidados por nome, WhatsApp ou passe QR Code. Registre a entrada completa ou parcial do grupo sem duplicações.
            </p>
          </div>

          {/* Quick Manual Code / QR Code Input Form */}
          <form
            onSubmit={handleManualCodeSubmit}
            className="flex items-center gap-2 max-w-md w-full shrink-0"
          >
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <QrCode size={18} />
              </div>
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Digitar código do convite (ex: AB12)"
                className="w-full bg-white border border-pink-300 rounded-2xl pl-10 pr-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 shadow-2xs"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-2xl transition shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer min-h-[42px]"
            >
              <CheckCircle2 size={16} />
              <span>Validar</span>
            </button>
          </form>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Confirmados */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Pessoas Confirmadas</span>
            <Users size={16} className="text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {totalConfirmedParticipants}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {confirmedList.length} grupos / famílias
          </div>
        </div>

        {/* Já Presentes */}
        <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-purple-800 uppercase tracking-wider flex items-center justify-between">
            <span>Já Chegaram (Presentes)</span>
            <CalendarCheck size={16} className="text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-900 mt-1">
            {totalCheckedInParticipants}
          </div>
          <div className="text-[11px] text-purple-700 mt-0.5">
            {checkedInList.length} famílias deram entrada
          </div>
        </div>

        {/* Restantes a Chegar */}
        <div className="bg-pink-50/70 border border-pink-200 rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-pink-800 uppercase tracking-wider flex items-center justify-between">
            <span>Aguardando Chegada</span>
            <Clock size={16} className="text-pink-600" />
          </div>
          <div className="text-2xl font-black text-pink-900 mt-1">
            {remainingParticipants}
          </div>
          <div className="text-[11px] text-pink-700 mt-0.5">
            {confirmedList.length - checkedInList.length} grupos ainda esperados
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por responsável, família, convidados, WhatsApp ou código..."
            className="w-full bg-white border border-slate-300 rounded-2xl pl-10 pr-4 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 shadow-2xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs self-start shrink-0">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-2 rounded-xl font-medium transition cursor-pointer min-h-[38px] ${
              filter === 'all'
                ? 'bg-pink-600 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos ({invitations.length})
          </button>
          <button
            onClick={() => setFilter('checked_in')}
            className={`px-3 py-2 rounded-xl font-medium transition cursor-pointer min-h-[38px] ${
              filter === 'checked_in'
                ? 'bg-purple-600 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Presentes ({checkedInList.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-2 rounded-xl font-medium transition cursor-pointer min-h-[38px] ${
              filter === 'pending'
                ? 'bg-slate-800 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Aguardando ({invitations.length - checkedInList.length})
          </button>
        </div>
      </div>

      {/* Guest List Cards */}
      <div className="space-y-3">
        {filteredGuests.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-500 text-xs italic shadow-xs">
            Nenhum convidado encontrado com os termos pesquisados.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredGuests.map((inv) => {
              const resp = inv.responsibleName || inv.managerName || 'Convidado';
              const fam = inv.familyOrGroup || inv.condoName || resp;
              const adults = inv.adultsCount !== undefined ? inv.adultsCount : (inv.participantCount || 1);
              const children = inv.childrenCount || 0;
              const totalPeople = adults + children;
              const isCheckedIn = inv.status === 'checked_in';
              const checkedCount = inv.checkedInCount !== undefined ? inv.checkedInCount : (isCheckedIn ? totalPeople : 0);
              const isPartial = isCheckedIn && checkedCount < totalPeople;

              return (
                <div
                  key={inv.id}
                  className={`bg-white border rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col justify-between transition relative ${
                    isCheckedIn
                      ? 'border-purple-300 bg-gradient-to-br from-white to-purple-50/40 ring-1 ring-purple-300/50'
                      : 'border-slate-200 hover:border-pink-200'
                  }`}
                >
                  <div>
                    {/* Top Row: Responsible & Status Badge */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-slate-900 text-base leading-snug">
                            {resp}
                          </h4>
                          <span className="text-[10px] font-mono text-pink-700 bg-pink-50 px-2 py-0.5 rounded-md border border-pink-200 font-black">
                            #{inv.code}
                          </span>
                        </div>
                        {fam && fam !== resp && (
                          <div className="text-xs text-pink-700 font-semibold mt-0.5">
                            {fam}
                          </div>
                        )}
                      </div>

                      {/* Status indicator */}
                      <div className="shrink-0">
                        {isCheckedIn ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-800 border border-purple-300 shadow-2xs">
                            <CheckCircle2 size={14} className="text-purple-600" />
                            <span>
                              {isPartial
                                ? `Parcial (${checkedCount}/${totalPeople})`
                                : `Completo (${totalPeople}/${totalPeople})`}
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <Clock size={12} />
                            <span>Aguardando</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Group Details */}
                    <div className="space-y-1.5 text-xs text-slate-700 my-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80">
                      {/* Guest names */}
                      {(inv.guestsNames || inv.janitorName) && (
                        <div className="flex justify-between items-start">
                          <span className="text-slate-500 font-medium shrink-0">Convidados:</span>
                          <span className="font-semibold text-slate-900 text-right pl-3">
                            {inv.guestsNames || inv.janitorName}
                          </span>
                        </div>
                      )}

                      {/* People breakdown */}
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">Grupo:</span>
                        <span className="font-bold text-pink-700 bg-pink-50 px-2 py-0.5 rounded-md border border-pink-200">
                          {totalPeople} {totalPeople === 1 ? 'pessoa' : 'pessoas'} ({adults} adultos, {children} crianças)
                        </span>
                      </div>

                      {/* WhatsApp */}
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">WhatsApp:</span>
                        <span className="font-mono text-slate-700">{formatPhone(inv.whatsapp)}</span>
                      </div>

                      {/* Special Needs */}
                      {inv.specialNeeds && (
                        <div className="text-[11px] text-amber-900 bg-amber-50 p-2 rounded-xl border border-amber-200 mt-1">
                          <strong>⚠️ Observações:</strong> {inv.specialNeeds}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-1 flex flex-wrap items-center gap-2">
                    {isCheckedIn ? (
                      <>
                        <button
                          onClick={() => handleOpenPartialModal(inv)}
                          className="flex-1 py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs min-h-[42px]"
                        >
                          <Edit3 size={14} />
                          <span>Ajustar Quantidade ({checkedCount})</span>
                        </button>
                        <button
                          onClick={() => handleUndoCheckin(inv)}
                          className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer min-h-[42px]"
                          title="Desfazer check-in deste grupo"
                        >
                          <RotateCcw size={14} />
                          <span>Desfazer</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleFullCheckin(inv)}
                          className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer min-h-[42px]"
                        >
                          <CheckCircle2 size={16} />
                          <span>Check-in Todos ({totalPeople})</span>
                        </button>
                        {totalPeople > 1 && (
                          <button
                            onClick={() => handleOpenPartialModal(inv)}
                            className="py-2.5 px-3.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer min-h-[42px]"
                          >
                            <Users size={14} />
                            <span>Parcial</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Partial Check-In Modal */}
      {partialModalInvitation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-pink-200 rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl relative text-slate-800 animate-in fade-in zoom-in-95">
            <button
              onClick={() => setPartialModalInvitation(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-1.5 text-pink-600 text-xs font-bold uppercase tracking-wider mb-1">
              <Users size={14} />
              <span>Check-in Parcial</span>
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-1">
              {partialModalInvitation.responsibleName || partialModalInvitation.managerName}
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Informe quantas pessoas deste grupo compareceram ao evento hoje.
            </p>

            <div className="bg-pink-50/60 border border-pink-200 rounded-2xl p-4 text-center space-y-3 mb-5">
              <div className="text-xs text-slate-600">
                Total de convidados cadastrados:{' '}
                <strong className="text-slate-900">
                  {partialModalInvitation.adultsCount !== undefined
                    ? partialModalInvitation.adultsCount + (partialModalInvitation.childrenCount || 0)
                    : partialModalInvitation.participantCount || 1}{' '}
                  pessoas
                </strong>
              </div>

              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setPartialCountInput((p) => Math.max(1, p - 1))}
                  className="w-10 h-10 rounded-xl bg-white border border-pink-300 text-pink-700 font-black text-lg hover:bg-pink-100 flex items-center justify-center cursor-pointer shadow-2xs"
                >
                  -
                </button>
                <div className="font-mono text-3xl font-black text-slate-900 w-16">
                  {partialCountInput}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setPartialCountInput((p) => {
                      const max =
                        partialModalInvitation.adultsCount !== undefined
                          ? partialModalInvitation.adultsCount + (partialModalInvitation.childrenCount || 0)
                          : partialModalInvitation.participantCount || 1;
                      return Math.min(max, p + 1);
                    })
                  }
                  className="w-10 h-10 rounded-xl bg-white border border-pink-300 text-pink-700 font-black text-lg hover:bg-pink-100 flex items-center justify-center cursor-pointer shadow-2xs"
                >
                  +
                </button>
              </div>
              <div className="text-[11px] text-pink-700 font-bold">
                {partialCountInput === 1 ? '1 pessoa presente' : `${partialCountInput} pessoas presentes`}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPartialModalInvitation(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPartialCheckin}
                className="flex-1 py-2.5 bg-pink-600 hover:bg-pink-700 text-white text-xs font-black rounded-xl transition shadow-md shadow-pink-600/25 cursor-pointer"
              >
                Confirmar Entrada
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
