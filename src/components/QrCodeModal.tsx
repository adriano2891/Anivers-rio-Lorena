import React, { useEffect, useState, useRef } from 'react';
import { X, Copy, Check, Download, Printer, Share2, ExternalLink } from 'lucide-react';
import QRCode from 'qrcode';
import { Invitation, CondoEvent } from '../types';
import { buildInvitationUrl, formatDateBR } from '../lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  invitation: Invitation | null;
  event: CondoEvent;
}

export const QrCodeModal: React.FC<Props> = ({ isOpen, onClose, invitation, event }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (invitation) {
      const url = buildInvitationUrl(invitation.code);
      QRCode.toDataURL(url, {
        width: 400,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      }).then(setQrDataUrl);
    }
  }, [invitation]);

  if (!isOpen || !invitation) return null;

  const invitationUrl = buildInvitationUrl(invitation.code);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(invitationUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadImage = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QRCode_Convite_${invitation.code}_${invitation.condoName.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Convite: ${event.title}`,
          text: `Olá, ${invitation.managerName}! Acesse seu convite exclusivo para o ${event.title}:`,
          url: invitationUrl
        });
      } catch (err) {
        console.log('Share dismissed');
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-slate-800 flex flex-col items-center text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition"
        >
          <X size={20} />
        </button>

        {/* Printable Card Area */}
        <div
          ref={printableRef}
          className="bg-slate-50/70 rounded-2xl p-6 text-slate-900 w-full shadow-2xs border border-slate-200 mb-5"
        >
          <div className="text-[10px] uppercase font-bold tracking-widest text-teal-800 mb-1">
            Convite Exclusivo & Check-in
          </div>
          <h3 className="font-extrabold text-base leading-tight text-slate-900 mb-1">
            {event.title}
          </h3>
          <div className="text-xs text-slate-600 font-medium mb-3">
            📅 {formatDateBR(event.date)} às {event.time}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3 my-2 text-left text-xs space-y-1 shadow-2xs">
            <div className="font-bold text-slate-900 truncate">{invitation.condoName}</div>
            <div className="text-slate-600 text-[11px]">
              Síndico: <span className="text-slate-800 font-semibold">{invitation.managerName}</span>
            </div>
            {invitation.janitorName && (
              <div className="text-slate-600 text-[11px]">
                Zelador: <span className="text-slate-800 font-semibold">{invitation.janitorName}</span>
              </div>
            )}
          </div>

          {qrDataUrl && (
            <div className="py-2">
              <img
                src={qrDataUrl}
                alt="QR Code"
                className="w-48 h-48 mx-auto rounded-lg shadow-2xs border border-slate-100 bg-white p-2"
              />
            </div>
          )}

          <div className="font-mono text-sm font-black tracking-widest text-teal-900 mt-1">
            CÓDIGO: {invitation.code}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Aponte a câmera para confirmar presença ou realizar check-in
          </div>
        </div>

        {/* Link Box */}
        <div className="w-full bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2 mb-4">
          <span className="font-mono text-xs text-slate-600 truncate flex-1 text-left px-1">
            {invitationUrl}
          </span>
          <button
            onClick={handleCopyLink}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition shrink-0 shadow-2xs"
          >
            {copiedLink ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
            <span>{copiedLink ? 'Copiado' : 'Copiar'}</span>
          </button>
        </div>

        {/* Buttons Grid */}
        <div className="grid grid-cols-3 gap-2 w-full">
          <button
            onClick={handleDownloadImage}
            className="p-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition flex flex-col items-center gap-1 shadow-2xs"
          >
            <Download size={16} />
            <span>Baixar PNG</span>
          </button>
          <button
            onClick={handlePrint}
            className="p-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition flex flex-col items-center gap-1 shadow-2xs"
          >
            <Printer size={16} />
            <span>Imprimir</span>
          </button>
          <button
            onClick={handleShare}
            className="p-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 shadow-md shadow-teal-700/20"
          >
            <Share2 size={16} />
            <span>Compartilhar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
