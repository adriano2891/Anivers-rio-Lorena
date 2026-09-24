import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Phone,
  Users,
  Sparkles,
  AlertTriangle,
  Check,
  Copy,
  CheckCircle2,
  AlertCircle,
  Heart,
  Baby
} from 'lucide-react';
import { Invitation, CondoEvent } from '../types';
import { checkDuplicate, createInvitation, updateInvitation } from '../lib/api';
import { formatPhone, buildInvitationUrl, openWhatsApp, getWhatsAppMessage } from '../lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  event: CondoEvent;
  invitationToEdit?: Invitation | null;
  onSuccess: (inv: Invitation) => void;
}

export const GuestModal: React.FC<Props> = ({
  isOpen,
  onClose,
  event,
  invitationToEdit,
  onSuccess
}) => {
  const [responsibleName, setResponsibleName] = useState('');
  const [familyOrGroup, setFamilyOrGroup] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [guestsNames, setGuestsNames] = useState('');
  const [adultsCount, setAdultsCount] = useState<number>(1);
  const [childrenCount, setChildrenCount] = useState<number>(0);
  const [specialNeeds, setSpecialNeeds] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [customShareImageUrl, setCustomShareImageUrl] = useState('');
  const [status, setStatus] = useState<Invitation['status']>('not_viewed');

  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<Invitation | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (invitationToEdit) {
      setResponsibleName(invitationToEdit.responsibleName || invitationToEdit.managerName || '');
      setFamilyOrGroup(invitationToEdit.familyOrGroup || invitationToEdit.condoName || '');
      setWhatsapp(invitationToEdit.whatsapp || '');
      setGuestsNames(invitationToEdit.guestsNames || invitationToEdit.janitorName || '');
      setAdultsCount(
        invitationToEdit.adultsCount !== undefined
          ? invitationToEdit.adultsCount
          : invitationToEdit.participantCount || 1
      );
      setChildrenCount(invitationToEdit.childrenCount || 0);
      setSpecialNeeds(invitationToEdit.specialNeeds || '');
      setInternalNotes(invitationToEdit.internalNotes || '');
      setCustomShareImageUrl(invitationToEdit.customShareImageUrl || '');
      setStatus(invitationToEdit.status);
    } else {
      setResponsibleName('');
      setFamilyOrGroup('');
      setWhatsapp('');
      setGuestsNames('');
      setAdultsCount(1);
      setChildrenCount(0);
      setSpecialNeeds('');
      setInternalNotes('');
      setCustomShareImageUrl('');
      setStatus('not_viewed');
    }
    setDuplicateWarning(null);
    setSaveErrorMessage(null);
    setSaveSuccessMessage(null);
  }, [invitationToEdit, isOpen]);

  // Debounced duplicate check
  useEffect(() => {
    if (!isOpen || invitationToEdit) return;
    if (!responsibleName.trim() && !whatsapp.trim()) {
      setDuplicateWarning(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setCheckingDuplicate(true);
        const res = await checkDuplicate(event.id, {
          condoName: familyOrGroup || responsibleName,
          managerName: responsibleName,
          whatsapp,
          excludeId: invitationToEdit?.id
        });
        if (res.hasDuplicate && res.duplicates.length > 0) {
          setDuplicateWarning(res.duplicates[0]);
        } else {
          setDuplicateWarning(null);
        }
      } catch (err) {
        console.error('Error checking duplicate:', err);
      } finally {
        setCheckingDuplicate(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [responsibleName, familyOrGroup, whatsapp, event.id, isOpen, invitationToEdit]);

  if (!isOpen) return null;

  const totalPeople = Math.max(1, (Number(adultsCount) || 0) + (Number(childrenCount) || 0));

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!responsibleName.trim() || !whatsapp.trim()) {
      setSaveErrorMessage('Por favor, informe o Nome do Responsável e o WhatsApp.');
      return;
    }

    setSaveSuccessMessage(null);
    setSaveErrorMessage(null);

    const cleanResp = responsibleName.trim();
    const cleanFam = (familyOrGroup.trim() || cleanResp);
    const cleanGuests = guestsNames.trim();
    const cleanPhone = whatsapp.trim();
    const safeAdults = Math.max(1, Number(adultsCount) || 1);
    const safeChildren = Math.max(0, Number(childrenCount) || 0);

    try {
      setSubmitting(true);
      let result: Invitation;

      if (invitationToEdit) {
        result = await updateInvitation(invitationToEdit.id, {
          responsibleName: cleanResp,
          familyOrGroup: cleanFam,
          condoName: cleanFam,
          managerName: cleanResp,
          janitorName: cleanGuests,
          guestsNames: cleanGuests,
          adultsCount: safeAdults,
          childrenCount: safeChildren,
          participantCount: status === 'confirmed' || status === 'checked_in' ? safeAdults + safeChildren : 0,
          specialNeeds: specialNeeds.trim(),
          whatsapp: cleanPhone,
          internalNotes: internalNotes.trim(),
          customShareImageUrl: customShareImageUrl.trim() || undefined,
          status
        });
      } else {
        result = await createInvitation(event.id, {
          responsibleName: cleanResp,
          familyOrGroup: cleanFam,
          condoName: cleanFam,
          managerName: cleanResp,
          janitorName: cleanGuests,
          guestsNames: cleanGuests,
          adultsCount: safeAdults,
          childrenCount: safeChildren,
          specialNeeds: specialNeeds.trim(),
          whatsapp: cleanPhone,
          internalNotes: internalNotes.trim(),
          customShareImageUrl: customShareImageUrl.trim() || undefined,
          status
        });
      }

      onSuccess(result);
      setSaveSuccessMessage(
        invitationToEdit
          ? 'Convite atualizado com sucesso!'
          : 'Convite criado com sucesso!'
      );
      setTimeout(() => {
        setSaveSuccessMessage(null);
        onClose();
      }, 1000);
    } catch (err: any) {
      setSaveErrorMessage(
        err.message || 'Não foi possível salvar o convite. Verifique os dados e tente novamente.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (!invitationToEdit) return;
    const url = buildInvitationUrl(invitationToEdit.code);
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSendWhatsAppNow = () => {
    if (!invitationToEdit) return;
    const msg = getWhatsAppMessage('notViewed', invitationToEdit, event);
    openWhatsApp(invitationToEdit.whatsapp, msg);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white border border-pink-200 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative text-slate-800 max-h-[92vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-pink-50 transition cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2 mb-1 text-pink-600 font-bold text-xs uppercase tracking-wider">
          <Heart size={14} className="fill-pink-500 text-pink-500" />
          <span>Gestão de Convidados • Aniversário da Lorena</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-1 tracking-tight">
          {invitationToEdit ? 'Editar Convite' : 'Cadastrar Novo Convite'}
        </h2>
        <p className="text-slate-500 text-xs mb-5 leading-relaxed">
          {invitationToEdit
            ? `Código exclusivo do convite: #${invitationToEdit.code}`
            : 'Preencha os dados do responsável e gere o link personalizado para a festa.'}
        </p>

        {/* Visual Feedback Messages */}
        {saveSuccessMessage && (
          <div className="mb-4 bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <span>{saveSuccessMessage}</span>
            </div>
            <button
              onClick={() => setSaveSuccessMessage(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {saveErrorMessage && (
          <div className="mb-4 bg-rose-50 border border-rose-300 text-rose-900 px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} className="text-rose-600 shrink-0" />
              <span>{saveErrorMessage}</span>
            </div>
            <button
              onClick={() => handleSubmit()}
              className="px-3 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold transition shrink-0 ml-2 cursor-pointer"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Duplicate Warning */}
        {duplicateWarning && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-800 flex items-start gap-2.5">
            <AlertTriangle size={18} className="shrink-0 text-amber-600 mt-0.5" />
            <div>
              <span className="font-bold block text-amber-900">Atenção: Possível convidado duplicado</span>
              Já existe um convite cadastrado para{' '}
              <strong>{duplicateWarning.responsibleName || duplicateWarning.managerName}</strong> (
              {formatPhone(duplicateWarning.whatsapp)}). Código:{' '}
              <span className="font-mono font-bold text-slate-900">#{duplicateWarning.code}</span>.
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome do Responsável */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nome do Responsável <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User size={16} />
              </div>
              <input
                type="text"
                required
                value={responsibleName}
                onChange={(e) => setResponsibleName(e.target.value)}
                placeholder="Ex: Mariana Silva"
                className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition shadow-2xs"
              />
            </div>
          </div>

          {/* Família / Grupo / Identificação */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Família / Grupo / Apelido
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Users size={16} />
              </div>
              <input
                type="text"
                value={familyOrGroup}
                onChange={(e) => setFamilyOrGroup(e.target.value)}
                placeholder="Ex: Família Silva / Tios da Lorena"
                className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition shadow-2xs"
              />
            </div>
          </div>

          {/* WhatsApp */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              WhatsApp para Contato <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Phone size={16} />
              </div>
              <input
                type="tel"
                required
                value={whatsapp}
                onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
                placeholder="+55 (11) 99999-9999"
                className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition shadow-2xs"
              />
            </div>
          </div>

          {/* Convidados / Acompanhantes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nome dos Convidados / Acompanhantes
            </label>
            <input
              type="text"
              value={guestsNames}
              onChange={(e) => setGuestsNames(e.target.value)}
              placeholder="Ex: Mariana, Carlos, Dudu e Alice"
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition shadow-2xs"
            />
          </div>

          {/* Quantidade de Adultos e Crianças */}
          <div className="bg-pink-50/60 border border-pink-200/80 rounded-2xl p-3.5 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-pink-900">
              <span className="flex items-center gap-1.5">
                <Users size={15} className="text-pink-600" />
                Composição do Grupo
              </span>
              <span className="text-pink-700 font-black">
                Total: {totalPeople} {totalPeople === 1 ? 'pessoa' : 'pessoas'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Adultos */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Adultos
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAdultsCount((prev) => Math.max(1, prev - 1))}
                    className="w-8 h-8 rounded-lg bg-white border border-pink-200 text-pink-700 font-black hover:bg-pink-100 flex items-center justify-center cursor-pointer text-sm"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={adultsCount}
                    onChange={(e) => setAdultsCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-white border border-pink-300 rounded-lg py-1 text-center font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                  <button
                    type="button"
                    onClick={() => setAdultsCount((prev) => prev + 1)}
                    className="w-8 h-8 rounded-lg bg-white border border-pink-200 text-pink-700 font-black hover:bg-pink-100 flex items-center justify-center cursor-pointer text-sm"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Crianças */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Baby size={12} className="text-pink-600" /> Crianças
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setChildrenCount((prev) => Math.max(0, prev - 1))}
                    className="w-8 h-8 rounded-lg bg-white border border-pink-200 text-pink-700 font-black hover:bg-pink-100 flex items-center justify-center cursor-pointer text-sm"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={childrenCount}
                    onChange={(e) => setChildrenCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-white border border-pink-300 rounded-lg py-1 text-center font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                  <button
                    type="button"
                    onClick={() => setChildrenCount((prev) => prev + 1)}
                    className="w-8 h-8 rounded-lg bg-white border border-pink-200 text-pink-700 font-black hover:bg-pink-100 flex items-center justify-center cursor-pointer text-sm"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Estado do Convite */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Estado do Convite
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition shadow-2xs cursor-pointer"
            >
              <option value="not_viewed">⚪ Não visualizado</option>
              <option value="viewed">🔵 Visualizado</option>
              <option value="pending">🟡 Aguardando resposta</option>
              <option value="confirmed">🟢 Confirmado</option>
              <option value="declined">🔴 Recusado (Não comparecerá)</option>
              <option value="checked_in">🟣 Check-in Realizado</option>
            </select>
          </div>

          {/* Observações e Necessidades Especiais */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Observações e Necessidades Especiais
            </label>
            <textarea
              rows={2}
              value={specialNeeds}
              onChange={(e) => setSpecialNeeds(e.target.value)}
              placeholder="Ex: Alice tem alergia a amendoim; bebê de 6 meses (precisa de cadeirão)"
              className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition shadow-2xs"
            />
          </div>

          {/* Anotações Internas dos Organizadores */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Anotações Internas (Visível apenas para o administrador)
            </label>
            <textarea
              rows={2}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Ex: Família confirmou no almoço; amigos de infância da mamãe"
              className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition shadow-2xs"
            />
          </div>

          {/* Link Tools (quando editando) */}
          {invitationToEdit && (
            <div className="bg-pink-50/50 p-3.5 rounded-2xl border border-pink-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="truncate text-xs text-slate-700 font-mono">
                {buildInvitationUrl(invitationToEdit.code)}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl text-slate-700 transition flex items-center gap-1 text-xs font-semibold cursor-pointer shadow-2xs"
                  title="Copiar Link"
                >
                  {copiedLink ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copiedLink ? 'Copiado!' : 'Copiar'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleSendWhatsAppNow}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-white transition flex items-center gap-1 text-xs font-bold cursor-pointer shadow-2xs"
                  title="Enviar convite pelo WhatsApp"
                >
                  <Phone size={14} />
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs sm:text-sm font-semibold transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs sm:text-sm font-bold transition shadow-md shadow-pink-600/25 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Salvando...' : invitationToEdit ? 'Atualizar Convite' : 'Salvar Convite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
