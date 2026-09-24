import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Save,
  Download,
  Share2,
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  CheckCircle2,
  Sparkles,
  MapPin,
  MessageCircle,
  CheckSquare,
  HelpCircle,
  Move,
  Maximize2,
  Globe,
  Sliders,
  AlertCircle,
  FileText,
  Send,
  Smartphone
} from 'lucide-react';
import { CondoEvent, CoverHotspot, HotspotActionType } from '../types';
import { updateEvent, uploadImage } from '../lib/api';
import { generateInteractivePdf, getPdfFileName } from '../lib/interactivePdf';
import { buildInvitationUrl, formatDateBR } from '../lib/utils';
import { InteractiveCoverViewer } from './InteractiveCoverViewer';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  event: CondoEvent;
  onEventUpdated: (updatedEvent: CondoEvent) => void;
}

const COVER_PRESETS = [
  {
    name: 'Convite Oficial da Lorena (Foto de Capa)',
    url: 'https://i.ibb.co/ksBFdWSv/eeese.png',
    category: 'Oficial'
  },
  {
    name: 'Convite Lorena 4K (Design Delicado)',
    url: 'https://i.ibb.co/G4hJY92f/convite-lorena-99x210mm-4k.png',
    category: 'Oficial'
  },
  {
    name: 'Convite Padrão Local',
    url: '/covers/default-cover.png',
    category: 'Oficial'
  },
  {
    name: 'Festa Infantil Balões Rosa & Azul',
    url: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1200&q=80',
    category: 'Festa Infantil'
  },
  {
    name: 'Mesa de Doces & Aniversário',
    url: 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=1200&q=80',
    category: 'Festa Infantil'
  }
];

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export const InteractiveCoverEditorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  event,
  onEventUpdated
}) => {
  // Event & Cover State
  const [currentBannerUrl, setCurrentBannerUrl] = useState(event?.bannerUrl || COVER_PRESETS[0].url);
  const [eventTitle, setEventTitle] = useState(event?.title || '');
  const [presentationText, setPresentationText] = useState(event?.presentationText || '');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [hotspots, setHotspots] = useState<CoverHotspot[]>(() => {
    if (event?.coverHotspots && event.coverHotspots.length > 0) {
      return event.coverHotspots;
    }
    // Default initial hotspots for instant out-of-the-box interactivity
    return [
      {
        id: 'hs-rsvp-1',
        name: 'Confirmar Presença',
        actionType: 'confirm_rsvp',
        targetUrl: '#formulario',
        openInNewTab: false,
        x: 20,
        y: 75,
        width: 60,
        height: 12
      },
      {
        id: 'hs-maps-2',
        name: 'Como Chegar (Maps)',
        actionType: 'google_maps',
        targetUrl: `https://maps.google.com/?q=${encodeURIComponent(
          event?.address || 'Rua Cachoeira, nº 34, Jardim Rosa de França, Guarulhos'
        )}`,
        openInNewTab: true,
        x: 20,
        y: 89,
        width: 60,
        height: 8
      }
    ];
  });

  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(hotspots[0]?.id || null);
  const [previewMode, setPreviewMode] = useState<'editor' | 'guest' | 'whatsapp'>('editor');
  const previewAsGuest = previewMode === 'guest';
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfProgressText, setPdfProgressText] = useState<string | null>(null);
  const [toastData, setToastData] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    onRetry?: () => void;
  } | null>(null);

  // Tab: 'editor' | 'change_image'
  const [editorTab, setEditorTab] = useState<'editor' | 'change_image'>('editor');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dragging & Resizing Refs
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    type: 'move' | 'resize';
    handle?: ResizeHandle;
    hotspotId: string;
    startPointerX: number;
    startPointerY: number;
    initialX: number;
    initialY: number;
    initialW: number;
    initialH: number;
  } | null>(null);

  // Sync with prop changes on open
  useEffect(() => {
    if (isOpen && event) {
      setCurrentBannerUrl(event.bannerUrl || COVER_PRESETS[0].url);
      setEventTitle(event.title || '');
      setPresentationText(event.presentationText || '');
      if (event.coverHotspots && event.coverHotspots.length > 0) {
        setHotspots(event.coverHotspots);
        setSelectedHotspotId(event.coverHotspots[0].id);
      }
    }
  }, [isOpen, event]);

  const selectedHotspot = hotspots.find((h) => h.id === selectedHotspotId) || null;

  const showToast = (
    msg: string,
    type: 'success' | 'error' | 'info' = 'info',
    onRetry?: () => void
  ) => {
    setToastData({ type, message: msg, onRetry });
    if (type !== 'error') {
      setTimeout(() => setToastData(null), 4000);
    }
  };

  // Add new hotspot
  const handleAddHotspot = () => {
    const newId = `hs-${Date.now()}`;
    // Position slightly offset or centered
    const count = hotspots.length;
    const newHotspot: CoverHotspot = {
      id: newId,
      name: `Ação ${count + 1}`,
      actionType: 'confirm_rsvp',
      targetUrl: '#formulario',
      openInNewTab: false,
      x: Math.max(10, Math.min(60, 20 + count * 5)),
      y: Math.max(10, Math.min(70, 40 + count * 6)),
      width: 45,
      height: 10
    };
    setHotspots((prev) => [...prev, newHotspot]);
    setSelectedHotspotId(newId);
    setPreviewMode('editor');
    showToast('Nova área clicável adicionada! Ajuste o tamanho e posição na imagem.');
  };

  // Duplicate selected hotspot
  const handleDuplicateHotspot = (spot: CoverHotspot) => {
    const newId = `hs-${Date.now()}`;
    const duplicated: CoverHotspot = {
      ...spot,
      id: newId,
      name: `${spot.name} (Cópia)`,
      x: Math.min(spot.x + 3, 85),
      y: Math.min(spot.y + 3, 85)
    };
    setHotspots((prev) => [...prev, duplicated]);
    setSelectedHotspotId(newId);
    showToast('Área clicável duplicada com sucesso!');
  };

  // Delete hotspot
  const handleDeleteHotspot = (id: string) => {
    setHotspots((prev) => {
      const filtered = prev.filter((h) => h.id !== id);
      if (selectedHotspotId === id) {
        setSelectedHotspotId(filtered[0]?.id || null);
      }
      return filtered;
    });
    showToast('Área clicável removida.');
  };

  // Update field of selected hotspot
  const updateSelectedHotspot = (patch: Partial<CoverHotspot>) => {
    if (!selectedHotspotId) return;
    setHotspots((prev) =>
      prev.map((h) => (h.id === selectedHotspotId ? { ...h, ...patch } : h))
    );
  };

  // Quick Action Preset helper
  const applyActionPreset = (actionType: HotspotActionType) => {
    if (!selectedHotspotId) return;

    if (actionType === 'confirm_rsvp') {
      updateSelectedHotspot({
        name: 'Confirmar Presença',
        actionType: 'confirm_rsvp',
        targetUrl: '#formulario',
        openInNewTab: false
      });
    } else if (actionType === 'google_maps') {
      const addr = event.address || 'Rua Cachoeira, nº 34, Jardim Rosa de França, Guarulhos';
      updateSelectedHotspot({
        name: 'Como Chegar (Google Maps)',
        actionType: 'google_maps',
        targetUrl: `https://maps.google.com/?q=${encodeURIComponent(addr)}`,
        openInNewTab: true
      });
    } else if (actionType === 'whatsapp') {
      updateSelectedHotspot({
        name: 'Falar no WhatsApp',
        actionType: 'whatsapp',
        targetUrl: 'https://wa.me/5511981234567?text=Ol%C3%A1%2C%20gostaria%20de%20informa%C3%A7%C3%B5es%20sobre%20o%20evento',
        openInNewTab: true
      });
    } else if (actionType === 'register') {
      updateSelectedHotspot({
        name: 'Inscrição Oficial',
        actionType: 'register',
        targetUrl: '#formulario',
        openInNewTab: false
      });
    } else {
      updateSelectedHotspot({
        name: 'Acessar Link',
        actionType: 'custom_url',
        targetUrl: 'https://grupoativa.com.br',
        openInNewTab: true
      });
    }
  };

  // Test link in a new tab or trigger preview
  const handleTestLink = (spot: CoverHotspot) => {
    if (spot.actionType === 'confirm_rsvp' || spot.targetUrl === '#formulario') {
      showToast('Ação: Redireciona o convidado diretamente para o formulário de confirmação de presença.');
      return;
    }
    let url = spot.targetUrl?.trim();
    if (!url) {
      showToast('Por favor, informe uma URL de destino primeiro.');
      return;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Pointer drag/resize logic
  const handlePointerDown = (
    e: React.PointerEvent,
    type: 'move' | 'resize',
    hotspot: CoverHotspot,
    handle?: ResizeHandle
  ) => {
    if (previewAsGuest) return;
    e.preventDefault();
    e.stopPropagation();

    setSelectedHotspotId(hotspot.id);

    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    setDragState({
      type,
      handle,
      hotspotId: hotspot.id,
      startPointerX: e.clientX,
      startPointerY: e.clientY,
      initialX: hotspot.x,
      initialY: hotspot.y,
      initialW: hotspot.width,
      initialH: hotspot.height
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState || !imageContainerRef.current) return;

    const rect = imageContainerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const deltaXPercent = ((e.clientX - dragState.startPointerX) / rect.width) * 100;
    const deltaYPercent = ((e.clientY - dragState.startPointerY) / rect.height) * 100;

    setHotspots((prev) =>
      prev.map((h) => {
        if (h.id !== dragState.hotspotId) return h;

        if (dragState.type === 'move') {
          const newX = Math.max(0, Math.min(100 - dragState.initialW, dragState.initialX + deltaXPercent));
          const newY = Math.max(0, Math.min(100 - dragState.initialH, dragState.initialY + deltaYPercent));
          return {
            ...h,
            x: Math.round(newX * 10) / 10,
            y: Math.round(newY * 10) / 10
          };
        }

        // Resize
        let newX = dragState.initialX;
        let newY = dragState.initialY;
        let newW = dragState.initialW;
        let newH = dragState.initialH;
        const handle = dragState.handle || 'se';

        // Horizontal resizing
        if (handle.includes('e')) {
          newW = Math.max(4, Math.min(100 - newX, dragState.initialW + deltaXPercent));
        } else if (handle.includes('w')) {
          const rightEdge = dragState.initialX + dragState.initialW;
          newX = Math.max(0, Math.min(rightEdge - 4, dragState.initialX + deltaXPercent));
          newW = rightEdge - newX;
        }

        // Vertical resizing
        if (handle.includes('s')) {
          newH = Math.max(3, Math.min(100 - newY, dragState.initialH + deltaYPercent));
        } else if (handle.includes('n')) {
          const bottomEdge = dragState.initialY + dragState.initialH;
          newY = Math.max(0, Math.min(bottomEdge - 3, dragState.initialY + deltaYPercent));
          newH = bottomEdge - newY;
        }

        return {
          ...h,
          x: Math.round(newX * 10) / 10,
          y: Math.round(newY * 10) / 10,
          width: Math.round(newW * 10) / 10,
          height: Math.round(newH * 10) / 10
        };
      })
    );
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragState) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      setDragState(null);
    }
  };

  // Image Upload handler with instant preview and persistent storage upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WebP).', 'error');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      showToast('A imagem excede 25MB. Selecione uma imagem menor.', 'error');
      return;
    }

    setIsUploadingImage(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setCurrentBannerUrl(base64);
      setEditorTab('editor');

      try {
        showToast('Gravando imagem no storage persistente...', 'info');
        const uploadRes = await uploadImage(file);
        if (uploadRes?.url) {
          setCurrentBannerUrl(uploadRes.url);
          showToast('Imagem salva no storage! Clique em "Salvar Alterações" para confirmar no banco.', 'success');
        }
      } catch (uploadErr: any) {
        console.warn('Storage upload fallback:', uploadErr);
        showToast('Imagem carregada! O servidor fará a persistência ao salvar.', 'info');
      } finally {
        setIsUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Save Event, Banner, Texts, and Hotspots permanently to Database
  const handleSaveInvite = async () => {
    if (!event) return;
    setIsSaving(true);
    try {
      let finalBannerUrl = currentBannerUrl;

      // If user pasted a base64 image or upload was in progress, ensure it gets uploaded
      if (finalBannerUrl && finalBannerUrl.startsWith('data:image')) {
        try {
          const uploadRes = await uploadImage(finalBannerUrl, 'cover');
          if (uploadRes?.url) {
            finalBannerUrl = uploadRes.url;
            setCurrentBannerUrl(uploadRes.url);
          }
        } catch (uploadErr) {
          console.warn('Image upload fallback during save:', uploadErr);
        }
      }

      const updated = await updateEvent(event.id, {
        bannerUrl: finalBannerUrl,
        title: eventTitle.trim() || event.title,
        presentationText: presentationText.trim() || event.presentationText,
        coverHotspots: hotspots
      });

      onEventUpdated(updated);
      showToast('Alterações salvas com sucesso', 'success');
    } catch (err: any) {
      showToast(
        err.message || 'Não foi possível salvar as alterações no banco de dados. Tente novamente.',
        'error',
        () => handleSaveInvite()
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Interactive PDF Export
  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    setPdfProgressText('Gerando PDF otimizado para prévia no WhatsApp...');
    try {
      const result = await generateInteractivePdf({
        event: {
          ...event,
          bannerUrl: currentBannerUrl,
          title: eventTitle
        },
        hotspots,
        autoDownload: true,
        onProgress: (status) => setPdfProgressText(status)
      });
      showToast(`PDF baixado com sucesso: "${result.fileName}"!`);
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao gerar PDF: ' + (err.message || 'Falha ao processar imagem'));
    } finally {
      setIsExportingPdf(false);
      setPdfProgressText(null);
    }
  };

  // WhatsApp Document (PDF with Cover Preview) Sharing
  const handleSharePdfWhatsApp = async () => {
    setIsExportingPdf(true);
    setPdfProgressText('Preparando PDF com miniatura para envio no WhatsApp...');
    try {
      const result = await generateInteractivePdf({
        event: {
          ...event,
          bannerUrl: currentBannerUrl,
          title: eventTitle
        },
        hotspots,
        autoDownload: false,
        onProgress: (status) => setPdfProgressText(status)
      });

      const inviteUrl = `${window.location.origin}/convite/geral`;
      const message = `🎉 *${eventTitle}*\n${
        event.shareDescription || 'Segue em anexo o convite oficial em PDF.'
      }\n\n📅 *Data:* ${formatDateBR(event.date)} às ${event.time}\n📍 *Local:* ${
        event.location
      }\n\n🔗 *Acesse também online e confirme sua presença:*\n${inviteUrl}`;

      // Native mobile file sharing
      if (navigator.canShare && navigator.canShare({ files: [result.file] })) {
        await navigator.share({
          files: [result.file],
          title: eventTitle,
          text: message
        });
        showToast('Convite compartilhado com sucesso!');
      } else {
        // Desktop or browsers without file share: Download the file & guide the user to attach as document
        const link = document.createElement('a');
        link.href = result.dataUrl;
        link.download = result.fileName;
        link.click();

        try {
          await navigator.clipboard.writeText(message);
        } catch {}

        showToast(
          `PDF baixado como "${result.fileName}"! No WhatsApp, anexe como "Documento" (ícone de clipe) para exibir o preview da capa.`
        );

        // Open WhatsApp Web
        setTimeout(() => {
          window.open('https://web.whatsapp.com', '_blank');
        }, 1200);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error(err);
        showToast('Erro ao processar PDF: ' + (err.message || 'Tente novamente'));
      }
    } finally {
      setIsExportingPdf(false);
      setPdfProgressText(null);
    }
  };

  // WhatsApp Standard Link Sharing
  const handleShareWhatsApp = () => {
    const inviteUrl = `${window.location.origin}/convite/geral`;
    const message = `🎉 *${eventTitle}*\n${
      event.shareDescription || 'Confira o convite oficial e confirme sua presença.'
    }\n\n📅 *Data:* ${formatDateBR(event.date)} às ${event.time}\n📍 *Local:* ${
      event.location
    } - 3º Andar\n\n🔗 *Acesse o convite interativo e confirme sua presença:*\n${inviteUrl}`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl my-auto flex flex-col max-h-[94vh] overflow-hidden">
        
        {/* Header Bar */}
        <div className="p-4 sm:px-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Sparkles size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-slate-900 truncate">
                Editor de Capa Interativa &amp; Hiperlinks
              </h2>
              <p className="text-xs text-slate-500 truncate">
                Crie áreas clicáveis invisíveis sobre qualquer ponto da arte do convite.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons in Header */}
          <div className="flex items-center gap-2 shrink-0">
            {/* WhatsApp Share Button */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
              title="Compartilhar Convite no WhatsApp"
            >
              <MessageCircle size={15} />
              <span>WhatsApp</span>
            </button>

            {/* Interactive PDF Export Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
              title="Baixar Convite em PDF com Links Clicáveis"
            >
              <Download size={15} />
              <span>{isExportingPdf ? 'Gerando...' : 'Baixar em PDF'}</span>
            </button>

            {/* Save Button */}
            <button
              type="button"
              onClick={handleSaveInvite}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
            >
              <Save size={15} />
              <span>{isSaving ? 'Salvando...' : 'Salvar Convite'}</span>
            </button>

            {/* Close Modal */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition"
              title="Fechar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Status Toast */}
        {toastData && (
          <div
            className={`text-white text-xs font-semibold px-4 py-2.5 flex items-center justify-between shadow-inner transition ${
              toastData.type === 'success'
                ? 'bg-emerald-700'
                : toastData.type === 'error'
                ? 'bg-rose-700'
                : 'bg-teal-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {toastData.type === 'error' ? (
                <AlertCircle size={16} className="text-rose-200 shrink-0" />
              ) : (
                <CheckCircle2 size={16} className="text-emerald-300 shrink-0" />
              )}
              <span>{toastData.message}</span>
            </div>
            <div className="flex items-center gap-2">
              {toastData.onRetry && (
                <button
                  type="button"
                  onClick={toastData.onRetry}
                  className="px-2.5 py-1 bg-white text-rose-800 rounded font-bold text-xs hover:bg-rose-50 cursor-pointer shadow-xs transition"
                >
                  Tentar novamente
                </button>
              )}
              <button
                type="button"
                onClick={() => setToastData(null)}
                className="text-white/80 hover:text-white px-1 font-bold"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Sub-Header Navigation Tabs & View Mode Toggle */}
        <div className="px-4 sm:px-6 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditorTab('editor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                editorTab === 'editor'
                  ? 'bg-teal-50 text-teal-800 border border-teal-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Sliders size={14} />
              <span>Editor de Áreas Clicáveis</span>
              <span className="bg-teal-700 text-white text-[10px] px-1.5 py-0.2 rounded-full ml-0.5">
                {hotspots.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setEditorTab('change_image')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                editorTab === 'change_image'
                  ? 'bg-teal-50 text-teal-800 border border-teal-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ImageIcon size={14} />
              <span>Trocar Arte / Imagem da Capa</span>
            </button>
          </div>

          {/* Mode Switch: Editor vs Guest Preview vs WhatsApp PDF Preview */}
          {editorTab === 'editor' && (
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setPreviewMode('editor')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition ${
                  previewMode === 'editor'
                    ? 'bg-white text-teal-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye size={13} className="text-teal-700" />
                <span>Modo de Edição</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewMode('guest')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition ${
                  previewMode === 'guest'
                    ? 'bg-teal-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Veja exatamente como o convidado verá na web (100% invisível)"
              >
                <EyeOff size={13} />
                <span>Prévia do Convidado</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewMode('whatsapp')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition ${
                  previewMode === 'whatsapp'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-700 hover:text-slate-900 bg-emerald-50/70 border border-emerald-200/60'
                }`}
                title="Visualizar a miniatura da capa do PDF exatamente como aparece no WhatsApp"
              >
                <MessageCircle size={13} className={previewMode === 'whatsapp' ? 'text-white' : 'text-emerald-700'} />
                <span>Prévia no WhatsApp (PDF com Capa)</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100">
          
          {/* TAB 1: Visual Interactive Hotspot Canvas & Config */}
          {editorTab === 'editor' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: The Interactive Image Canvas (7 cols) */}
              <div className="lg:col-span-7 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      {previewMode === 'whatsapp' ? 'Prévia do Envio no WhatsApp' : 'Arte do Convite'}
                    </span>
                    <span className="text-[11px] text-slate-500 hidden sm:inline">
                      {previewMode === 'whatsapp'
                        ? '(Miniatura da capa e arquivo do documento com ~169 KB)'
                        : '(Arraste para reposicionar e use as alças nos cantos para redimensionar)'}
                    </span>
                  </div>

                  {previewMode === 'editor' && (
                    <button
                      type="button"
                      onClick={handleAddHotspot}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs transition"
                    >
                      <Plus size={14} />
                      <span>Adicionar Área Clicável</span>
                    </button>
                  )}
                </div>

                {/* Canvas Container with Border and Shadows */}
                <div className="bg-slate-900/90 rounded-2xl p-2 sm:p-4 border border-slate-300 shadow-md flex items-center justify-center">
                  {previewMode === 'whatsapp' ? (
                    /* WhatsApp PDF Document Preview Card - matching user's Image 2 reference */
                    <div className="w-full max-w-sm mx-auto py-2 font-sans select-none">
                      <div className="bg-[#0b141a] rounded-2xl p-4 border border-slate-800 shadow-2xl space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                          <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                            <MessageCircle size={13} />
                            Prévia Real do Documento no WhatsApp
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                            1 página • PDF
                          </span>
                        </div>

                        {/* WhatsApp Message Balloon (Dark Theme like Image 2) */}
                        <div className="bg-[#202c33] rounded-xl overflow-hidden border border-slate-700/60 shadow-lg text-white">
                          {/* Image Cover Thumbnail */}
                          <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-950">
                            <img
                              src={currentBannerUrl}
                              alt="Capa do Convite no WhatsApp"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/75 backdrop-blur-xs text-[9px] font-extrabold text-emerald-400 uppercase tracking-wide">
                              Capa com Hiperlinks
                            </div>
                          </div>

                          {/* PDF Document File Info */}
                          <div className="p-3 bg-[#111b21] flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex flex-col items-center justify-center shrink-0 shadow-xs font-black text-[9px]">
                              <FileText size={18} className="text-white" />
                              <span className="leading-none text-[8px] mt-0.5">PDF</span>
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-slate-100 truncate">
                                {getPdfFileName(eventTitle)}
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5 font-medium">
                                <span>1 página</span>
                                <span>•</span>
                                <span>PDF</span>
                                <span>•</span>
                                <span className="text-emerald-400 font-semibold">144 KB</span>
                              </div>
                            </div>

                            <div className="text-[10px] text-slate-500 self-end pb-0.5 flex items-center gap-0.5">
                              <span>12:28</span>
                              <span className="text-sky-400 font-bold">✓✓</span>
                            </div>
                          </div>
                        </div>

                        {/* Info Banner */}
                        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-[11px] text-emerald-300 space-y-1">
                          <p className="font-bold flex items-center gap-1.5 text-emerald-200">
                            <CheckCircle2 size={13} className="text-emerald-400" />
                            Capa e Miniatura Configuradas
                          </p>
                          <p className="text-slate-300 text-[10px] leading-relaxed">
                            O PDF gerado possui metadados oficiais e tamanho ultraleve (~144 KB). Ao enviar como documento no WhatsApp, a capa é exibida imediatamente como miniatura no topo e todos os links continuam clicáveis.
                          </p>
                        </div>

                        {/* Quick Action Buttons inside Preview */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleDownloadPdf}
                            disabled={isExportingPdf}
                            className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition border border-slate-700"
                          >
                            <Download size={13} />
                            <span>Baixar PDF</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleSharePdfWhatsApp}
                            disabled={isExportingPdf}
                            className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-xs"
                          >
                            <Send size={13} />
                            <span>Enviar no WhatsApp</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      ref={imageContainerRef}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      className="relative w-full max-w-lg mx-auto shadow-2xl rounded-lg overflow-hidden select-none bg-black"
                    >
                      {/* Background Image */}
                      <img
                        src={currentBannerUrl}
                        alt="Capa do Convite"
                        referrerPolicy="no-referrer"
                        className="w-full h-auto block object-contain pointer-events-none"
                      />

                      {/* Guest Preview Mode: Areas 100% invisible */}
                      {previewAsGuest ? (
                        <InteractiveCoverViewer
                          imageUrl={currentBannerUrl}
                          hotspots={hotspots}
                          showHotspotBorders={false}
                          interactive={true}
                          onActionTrigger={(spot) => {
                            showToast(`Clique do convidado simulado: [${spot.name}] ➔ ${spot.targetUrl}`);
                          }}
                        />
                      ) : (
                        /* Admin Editing Mode: Render Drag & Resize Hotspots */
                        hotspots.map((spot) => {
                          const isSelected = selectedHotspotId === spot.id;

                        return (
                          <div
                            key={spot.id}
                            style={{
                              left: `${spot.x}%`,
                              top: `${spot.y}%`,
                              width: `${spot.width}%`,
                              height: `${spot.height}%`
                            }}
                            onPointerDown={(e) => handlePointerDown(e, 'move', spot)}
                            className={`absolute select-none cursor-move transition-colors z-20 rounded ${
                              isSelected
                                ? 'border-2 border-teal-400 bg-teal-500/25 ring-2 ring-teal-400/40 shadow-xl'
                                : 'border-2 border-dashed border-sky-400 bg-sky-500/15 hover:bg-sky-500/30'
                            }`}
                          >
                            {/* Hotspot Header Label */}
                            <div className="absolute -top-6 left-0 bg-slate-900 text-white text-[10px] font-black px-2 py-0.5 rounded shadow flex items-center gap-1 whitespace-nowrap max-w-[200px] truncate pointer-events-none z-30">
                              <Sparkles size={10} className="text-teal-400 shrink-0" />
                              <span className="truncate">{spot.name || 'Hiperlink'}</span>
                            </div>

                            {/* Center Action Hint */}
                            <div className="w-full h-full flex items-center justify-center p-1 pointer-events-none overflow-hidden text-center">
                              <span className="text-[10px] font-bold text-white bg-slate-950/70 px-1.5 py-0.5 rounded shadow-xs truncate max-w-full">
                                {spot.targetUrl || '#formulario'}
                              </span>
                            </div>

                            {/* 8 Resize Handles (Only rendered when selected) */}
                            {isSelected && (
                              <>
                                {/* Corners */}
                                <div
                                  onPointerDown={(e) => handlePointerDown(e, 'resize', spot, 'nw')}
                                  className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-teal-700 rounded-full cursor-nwse-resize shadow-md z-30 hover:scale-125 transition-transform"
                                />
                                <div
                                  onPointerDown={(e) => handlePointerDown(e, 'resize', spot, 'ne')}
                                  className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-teal-700 rounded-full cursor-nesw-resize shadow-md z-30 hover:scale-125 transition-transform"
                                />
                                <div
                                  onPointerDown={(e) => handlePointerDown(e, 'resize', spot, 'sw')}
                                  className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-teal-700 rounded-full cursor-nesw-resize shadow-md z-30 hover:scale-125 transition-transform"
                                />
                                <div
                                  onPointerDown={(e) => handlePointerDown(e, 'resize', spot, 'se')}
                                  className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-teal-700 rounded-full cursor-nwse-resize shadow-md z-30 hover:scale-125 transition-transform"
                                />

                                {/* Edges */}
                                <div
                                  onPointerDown={(e) => handlePointerDown(e, 'resize', spot, 'n')}
                                  className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-2 bg-white border border-teal-700 rounded-sm cursor-ns-resize shadow-md z-30"
                                />
                                <div
                                  onPointerDown={(e) => handlePointerDown(e, 'resize', spot, 's')}
                                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-2 bg-white border border-teal-700 rounded-sm cursor-ns-resize shadow-md z-30"
                                />
                                <div
                                  onPointerDown={(e) => handlePointerDown(e, 'resize', spot, 'w')}
                                  className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-2 h-3.5 bg-white border border-teal-700 rounded-sm cursor-ew-resize shadow-md z-30"
                                />
                                <div
                                  onPointerDown={(e) => handlePointerDown(e, 'resize', spot, 'e')}
                                  className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-2 h-3.5 bg-white border border-teal-700 rounded-sm cursor-ew-resize shadow-md z-30"
                                />
                              </>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

                {/* Helpful Tip */}
                <div className="text-[11px] text-slate-500 bg-white p-3 rounded-xl border border-slate-200 flex items-start gap-2">
                  <HelpCircle size={15} className="text-teal-700 shrink-0 mt-0.5" />
                  <span>
                    <strong>Dica de Posicionamento:</strong> As coordenadas são proporcionais (percentuais). Ao abrir no celular ou no computador, as áreas permanecem milimetricamente sobre os botões desenhados na imagem original.
                  </span>
                </div>
              </div>

              {/* Right Column: Hotspot Configuration Panel (5 cols) */}
              <div className="lg:col-span-5 space-y-4">

                {/* Event Basic Info Config */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText size={14} className="text-teal-700" />
                      <span>Título e Informações do Convite</span>
                    </h3>
                  </div>
                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Título do Evento</label>
                      <input
                        type="text"
                        value={eventTitle}
                        onChange={(e) => setEventTitle(e.target.value)}
                        placeholder="Ex: Workshop e Convenção Síndicos"
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-teal-700 focus:ring-1 focus:ring-teal-700 font-medium bg-slate-50 focus:bg-white transition"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Texto de Apresentação</label>
                      <textarea
                        rows={2}
                        value={presentationText}
                        onChange={(e) => setPresentationText(e.target.value)}
                        placeholder="Ex: Preencha os dados abaixo para confirmar sua presença no evento..."
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-teal-700 focus:ring-1 focus:ring-teal-700 font-medium resize-none bg-slate-50 focus:bg-white transition"
                      />
                    </div>
                  </div>
                </div>
                
                {/* List of Configured Hotspots */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={14} className="text-teal-700" />
                      <span>Áreas Clicáveis Criadas ({hotspots.length})</span>
                    </h3>
                    <button
                      type="button"
                      onClick={handleAddHotspot}
                      className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1"
                    >
                      <Plus size={13} />
                      <span>Adicionar</span>
                    </button>
                  </div>

                  {hotspots.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      Nenhuma área criada ainda. Clique em "Adicionar Área Clicável" para começar.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {hotspots.map((spot, idx) => {
                        const isSelected = spot.id === selectedHotspotId;
                        return (
                          <div
                            key={spot.id}
                            onClick={() => setSelectedHotspotId(spot.id)}
                            className={`p-2.5 rounded-xl border transition flex items-center justify-between gap-2 cursor-pointer ${
                              isSelected
                                ? 'bg-teal-50/70 border-teal-400 ring-1 ring-teal-300'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-black flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <span className="text-xs font-bold text-slate-900 truncate">
                                  {spot.name || 'Área sem nome'}
                                </span>
                              </div>
                              <p className="text-[10px] font-mono text-slate-500 truncate mt-0.5 ml-6">
                                {spot.targetUrl || '#formulario'}
                              </p>
                            </div>

                            {/* Row Tools */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDuplicateHotspot(spot);
                                }}
                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition"
                                title="Duplicar área"
                              >
                                <Copy size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteHotspot(spot.id);
                                }}
                                className="p-1 text-rose-400 hover:text-rose-700 hover:bg-white rounded-lg transition"
                                title="Excluir área"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Selected Hotspot Form Settings */}
                {selectedHotspot ? (
                  <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-teal-700">
                          Configurar Área Selecionada
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">
                          {selectedHotspot.name || 'Área Clicável'}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleTestLink(selectedHotspot)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1"
                          title="Testar este link"
                        >
                          <ExternalLink size={12} />
                          <span>Testar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateHotspot(selectedHotspot)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                          title="Duplicar esta área"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteHotspot(selectedHotspot.id)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition"
                          title="Excluir esta área"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Quick Action Presets */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                        Atalhos Rápidos de Ação:
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => applyActionPreset('confirm_rsvp')}
                          className={`p-2 rounded-xl border text-left text-xs font-bold transition flex items-center gap-2 ${
                            selectedHotspot.actionType === 'confirm_rsvp'
                              ? 'bg-teal-50 border-teal-400 text-teal-900'
                              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                          }`}
                        >
                          <CheckSquare size={14} className="text-teal-700 shrink-0" />
                          <span className="truncate">Confirmar Presença</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => applyActionPreset('google_maps')}
                          className={`p-2 rounded-xl border text-left text-xs font-bold transition flex items-center gap-2 ${
                            selectedHotspot.actionType === 'google_maps'
                              ? 'bg-teal-50 border-teal-400 text-teal-900'
                              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                          }`}
                        >
                          <MapPin size={14} className="text-teal-700 shrink-0" />
                          <span className="truncate">Como Chegar (Maps)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => applyActionPreset('whatsapp')}
                          className={`p-2 rounded-xl border text-left text-xs font-bold transition flex items-center gap-2 ${
                            selectedHotspot.actionType === 'whatsapp'
                              ? 'bg-teal-50 border-teal-400 text-teal-900'
                              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                          }`}
                        >
                          <MessageCircle size={14} className="text-teal-700 shrink-0" />
                          <span className="truncate">WhatsApp Oficial</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => applyActionPreset('custom_url')}
                          className={`p-2 rounded-xl border text-left text-xs font-bold transition flex items-center gap-2 ${
                            selectedHotspot.actionType === 'custom_url'
                              ? 'bg-teal-50 border-teal-400 text-teal-900'
                              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                          }`}
                        >
                          <Globe size={14} className="text-teal-700 shrink-0" />
                          <span className="truncate">Site / Inscrição</span>
                        </button>
                      </div>
                    </div>

                    {/* Action Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Nome da Ação / Rótulo:
                      </label>
                      <input
                        type="text"
                        value={selectedHotspot.name}
                        onChange={(e) => updateSelectedHotspot({ name: e.target.value })}
                        placeholder="Ex: Clique aqui para confirmar presença"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-teal-600 focus:outline-none"
                      />
                    </div>

                    {/* Destination URL */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Link de Destino (URL):
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={selectedHotspot.targetUrl}
                          onChange={(e) => updateSelectedHotspot({ targetUrl: e.target.value })}
                          placeholder="https://... ou #formulario"
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-teal-600 focus:outline-none pr-8"
                        />
                        <LinkIcon size={14} className="absolute right-3 top-3 text-slate-400" />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Dica: Use <code>#formulario</code> para rolar suavemente até o formulário de confirmação.
                      </p>
                    </div>

                    {/* Target Option: Open in Same Page vs New Tab */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Como Abrir o Link:
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => updateSelectedHotspot({ openInNewTab: false })}
                          className={`p-2 rounded-xl border text-xs font-bold transition text-center ${
                            !selectedHotspot.openInNewTab
                              ? 'bg-teal-50 border-teal-400 text-teal-900'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Na mesma página (Rolagem)
                        </button>

                        <button
                          type="button"
                          onClick={() => updateSelectedHotspot({ openInNewTab: true })}
                          className={`p-2 rounded-xl border text-xs font-bold transition text-center ${
                            selectedHotspot.openInNewTab
                              ? 'bg-teal-50 border-teal-400 text-teal-900'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Em nova aba (_blank)
                        </button>
                      </div>
                    </div>

                    {/* Numeric Coords Fine Tuning (Optional) */}
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Dimensões Proporcionais (%):
                      </span>
                      <div className="grid grid-cols-4 gap-1.5 text-[11px] font-mono text-slate-600 text-center">
                        <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                          <span className="block text-[9px] text-slate-400">X (Esquerda)</span>
                          {selectedHotspot.x}%
                        </div>
                        <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                          <span className="block text-[9px] text-slate-400">Y (Topo)</span>
                          {selectedHotspot.y}%
                        </div>
                        <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                          <span className="block text-[9px] text-slate-400">Largura</span>
                          {selectedHotspot.width}%
                        </div>
                        <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                          <span className="block text-[9px] text-slate-400">Altura</span>
                          {selectedHotspot.height}%
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs text-center text-slate-400 text-xs">
                    Selecione uma área na imagem ou na lista para editar suas propriedades.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Change Image Artwork */}
          {editorTab === 'change_image' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  1. Fazer Upload de Imagem do seu Computador ou Celular
                </h3>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-teal-600 bg-slate-50 hover:bg-slate-100 rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3"
                >
                  <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-800 border border-teal-200 flex items-center justify-center">
                    <Upload size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 mb-1">
                      Clique para escolher a arte do convite
                    </p>
                    <p className="text-xs text-slate-500">
                      Suporta arquivos JPG, PNG ou WebP em alta resolução (máx. 8MB)
                    </p>
                  </div>
                  <button
                    type="button"
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
                  >
                    Procurar Arquivo...
                  </button>
                </div>
              </div>

              {/* Direct Web URL */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  2. Ou Inserir URL Direta da Imagem
                </h3>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    placeholder="https://exemplo.com/arte-convite.jpg"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-teal-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customUrlInput.trim()) {
                        setCurrentBannerUrl(customUrlInput.trim());
                        setEditorTab('editor');
                        showToast('Arte da capa atualizada com sucesso!');
                      }
                    }}
                    className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition shrink-0"
                  >
                    Aplicar
                  </button>
                </div>
              </div>

              {/* Curated Presets */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  3. Ou Escolher um Modelo Pré-configurado do Grupo Ativa
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {COVER_PRESETS.map((preset) => {
                    const isSelected = currentBannerUrl === preset.url;
                    return (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => {
                          setCurrentBannerUrl(preset.url);
                          setEditorTab('editor');
                          showToast(`Modelo selecionado: ${preset.name}`);
                        }}
                        className={`group relative aspect-video rounded-xl overflow-hidden border-2 text-left transition ${
                          isSelected ? 'border-teal-700 ring-2 ring-teal-400' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="w-full h-full object-cover transition group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2 flex flex-col justify-end">
                          <span className="text-white text-[11px] font-bold leading-tight truncate">
                            {preset.name}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Bar */}
        <div className="p-4 sm:px-6 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition"
            >
              Fechar
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* WhatsApp Share PDF with Preview */}
            <button
              type="button"
              onClick={handleSharePdfWhatsApp}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
              title="Envia o arquivo PDF diretamente para o WhatsApp com prévia da capa"
            >
              <Send size={14} />
              <span>Enviar PDF no WhatsApp</span>
            </button>

            {/* Interactive PDF Export */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
              title="Gera e baixa o PDF otimizado com a capa em miniatura e hiperlinks interativos"
            >
              <Download size={14} />
              <span>{isExportingPdf ? 'Gerando PDF...' : 'Baixar em PDF'}</span>
            </button>

            {/* Share Link on WhatsApp */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition shadow-2xs"
              title="Compartilhar Link do Convite no WhatsApp"
            >
              <MessageCircle size={14} className="text-emerald-600" />
              <span>Copiar / Enviar Link</span>
            </button>

            {/* Save to Cloud */}
            <button
              type="button"
              onClick={handleSaveInvite}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition shadow-md shadow-teal-700/20 disabled:opacity-50"
            >
              <Save size={14} />
              <span>{isSaving ? 'Salvando na Nuvem...' : 'Salvar Convite'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
