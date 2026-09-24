import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Send, CheckCircle2, Eye, HelpCircle, Bell, Heart, Copy, Check, Video, Download } from 'lucide-react';
import { Invitation, CondoEvent } from '../types';
import { getWhatsAppMessage, openWhatsApp, formatPhone } from '../lib/utils';
import { logWhatsAppOpened } from '../lib/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  invitation: Invitation | null;
  event: CondoEvent;
  onSent?: (templateType: string) => void;
}

export const WhatsAppModal: React.FC<Props> = ({
  isOpen,
  onClose,
  invitation,
  event,
  onSent
}) => {
  const [selectedType, setSelectedType] = useState<
    'confirmed' | 'viewedNotConfirmed' | 'notViewed' | 'reminder' | 'thankYou'
  >('notViewed');
  const [messageText, setMessageText] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (invitation) {
      // Auto pick best template based on guest status
      let initialType: typeof selectedType = 'notViewed';
      if (invitation.status === 'confirmed' || invitation.status === 'checked_in') {
        initialType = 'confirmed';
      } else if (invitation.status === 'viewed') {
        initialType = 'viewedNotConfirmed';
      } else {
        initialType = 'notViewed';
      }
      setSelectedType(initialType);
      const text = getWhatsAppMessage(initialType, invitation, event);
      setMessageText(text);
    }
  }, [invitation, event, isOpen]);

  const handleTypeChange = (type: typeof selectedType) => {
    if (!invitation) return;
    setSelectedType(type);
    const text = getWhatsAppMessage(type, invitation, event);
    setMessageText(text);
  };

  if (!isOpen || !invitation) return null;

  const handleSend = async () => {
    openWhatsApp(invitation.whatsapp, messageText);
    await logWhatsAppOpened(invitation.id, selectedType);
    if (onSent) onSent(selectedType);
    onClose();
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative text-slate-800 flex flex-col max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <MessageSquare size={18} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Disparar Mensagem via WhatsApp</h2>
        </div>
        <p className="text-slate-500 text-xs mb-3">
          Para: <strong className="text-slate-800">{invitation.responsibleName || invitation.managerName}</strong>
          {(invitation.familyOrGroup || invitation.condoName) && (
            <span> • {invitation.familyOrGroup || invitation.condoName}</span>
          )}{' '}
          ({formatPhone(invitation.whatsapp)})
        </p>

        {/* Video Sharing Banner */}
        <div className="bg-pink-50 border border-pink-200 rounded-xl p-3 mb-3 text-xs text-pink-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-start gap-2">
            <div className="p-1.5 bg-pink-600 text-white rounded-lg shrink-0 mt-0.5 sm:mt-0">
              <Video size={14} />
            </div>
            <div>
              <p className="font-bold text-pink-900 leading-tight">
                Fluxo com Vídeo Convite da Lorena
              </p>
              <p className="text-[11px] text-pink-800/90 leading-tight mt-0.5">
                Envie o vídeo da Lorena junto com esta mensagem. O link abaixo abre a capa digital interativa para confirmar presença e abrir o Google Maps!
              </p>
            </div>
          </div>
          <a
            href={event.videoUrl || '/covers/convite-lorena.mp4'}
            download="convite-lorena.mp4"
            className="shrink-0 px-3 py-1.5 bg-white hover:bg-pink-100 text-pink-700 font-bold rounded-lg border border-pink-300 text-xs flex items-center gap-1.5 shadow-2xs transition"
          >
            <Download size={13} />
            <span>Baixar Vídeo (.mp4)</span>
          </a>
        </div>

        {/* Template Selector Tabs */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 mb-4">
          <button
            type="button"
            onClick={() => handleTypeChange('notViewed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              selectedType === 'notViewed'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HelpCircle size={13} />
            <span>Não Visualizou</span>
          </button>

          <button
            type="button"
            onClick={() => handleTypeChange('viewedNotConfirmed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              selectedType === 'viewedNotConfirmed'
                ? 'bg-sky-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-sky-700'
            }`}
          >
            <Eye size={13} />
            <span>Visualizou / Pendente</span>
          </button>

          <button
            type="button"
            onClick={() => handleTypeChange('confirmed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              selectedType === 'confirmed'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            <CheckCircle2 size={13} />
            <span>Confirmado</span>
          </button>

          <button
            type="button"
            onClick={() => handleTypeChange('reminder')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              selectedType === 'reminder'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-amber-700'
            }`}
          >
            <Bell size={13} />
            <span>Lembrete</span>
          </button>

          <button
            type="button"
            onClick={() => handleTypeChange('thankYou')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              selectedType === 'thankYou'
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'text-slate-600 hover:text-teal-800'
            }`}
          >
            <Heart size={13} />
            <span>Agradecimento</span>
          </button>
        </div>

        {/* WhatsApp Preview Bubble */}
        <div className="flex-1 flex flex-col mb-4">
          <div className="flex items-center justify-between mb-1.5 text-xs">
            <span className="text-slate-600 font-bold">Prévia da Mensagem (Editável):</span>
            <button
              onClick={handleCopyText}
              className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-semibold"
            >
              {copied ? <Check size={12} className="text-teal-700 font-bold" /> : <Copy size={12} />}
              <span>{copied ? 'Copiado' : 'Copiar Texto'}</span>
            </button>
          </div>

          <div className="relative bg-[#efeae2] border border-[#d1d7db] rounded-2xl p-4 flex-1 overflow-y-auto">
            <div className="bg-[#d9fdd3] text-slate-900 rounded-xl p-3.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans shadow-xs border border-[#b9ebaf]">
              <textarea
                rows={9}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="w-full bg-transparent border-none text-slate-900 focus:outline-none resize-none font-sans text-xs sm:text-sm leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={handleSend}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition flex items-center gap-2 shadow-md shadow-emerald-600/25"
          >
            <Send size={16} />
            <span>Abrir WhatsApp Web / App</span>
          </button>
        </div>
      </div>
    </div>
  );
};
