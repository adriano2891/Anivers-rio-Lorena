import React, { useState, useEffect, useRef } from 'react';
import {
  Share2,
  Image as ImageIcon,
  Upload,
  Sparkles,
  Check,
  Copy,
  ExternalLink,
  Save,
  MessageSquare,
  Globe,
  RefreshCw,
  Eye,
  Sliders,
  AlertCircle,
  HelpCircle,
  Smartphone,
  Layers,
  CheckCircle2,
  Building2,
  Trash2,
  FileText,
  Download,
  Send
} from 'lucide-react';
import { CondoEvent, Invitation } from '../types';
import { updateEvent } from '../lib/api';
import { formatDateBR, buildInvitationUrl, getWhatsAppMessage } from '../lib/utils';
import { getPdfFileName, generateInteractivePdf } from '../lib/interactivePdf';

interface Props {
  event: CondoEvent;
  invitations: Invitation[];
  onEventUpdated: (updatedEvent: CondoEvent) => void;
}

const PRESET_COVERS = [
  {
    id: 'intelbras-training',
    name: 'Treinamento Intelbras & Ativa',
    url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
    category: 'Tecnologia'
  },
  {
    id: 'executive-auditorium',
    name: 'Auditório Corporativo VIP',
    url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
    category: 'Gestão'
  },
  {
    id: 'modern-condo',
    name: 'Condomínio Residencial Moderno',
    url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
    category: 'Condomínios'
  },
  {
    id: 'night-building',
    name: 'Fachada Noturna Iluminada',
    url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
    category: 'Condomínios'
  },
  {
    id: 'cocktail-networking',
    name: 'Coquetel & Networking',
    url: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1200&q=80',
    category: 'Eventos'
  },
  {
    id: 'smart-tech',
    name: 'Segurança Eletrônica & Tech',
    url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=80',
    category: 'Inovação'
  }
];

export const SocialPreviewSection: React.FC<Props> = ({
  event,
  invitations,
  onEventUpdated
}) => {
  const [shareTitle, setShareTitle] = useState(
    event.shareTitle || event.title || 'Aniversário da Lorena'
  );
  const [shareDescription, setShareDescription] = useState(
    event.shareDescription || 'Convite Especial - Aniversário da Lorena. Confirme sua presença.'
  );
  const [coverSourceType, setCoverSourceType] = useState<'svg_dynamic' | 'custom_image' | 'event_banner'>(
    event.shareImageUrl
      ? event.shareImageUrl === event.bannerUrl
        ? 'event_banner'
        : 'custom_image'
      : 'svg_dynamic'
  );
  const [customImageUrl, setCustomImageUrl] = useState(event.shareImageUrl || '');
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [previewPlatform, setPreviewPlatform] = useState<'whatsapp' | 'whatsapp_doc' | 'facebook'>('whatsapp');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  
  // Test guest simulation selector
  const [selectedGuestId, setSelectedGuestId] = useState<string>(
    invitations.length > 0 ? invitations[0].id : 'geral'
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadSamplePdf = async () => {
    setIsExportingPdf(true);
    setExportFeedback('Gerando arquivo PDF...');
    try {
      const selectedGuest = invitations.find((i) => i.id === selectedGuestId);
      const res = await generateInteractivePdf({
        event,
        hotspots: event.coverHotspots || [],
        invitationCode: selectedGuest?.code || 'geral',
        autoDownload: true
      });
      setExportFeedback(`✓ Baixado: ${res.fileName}`);
      setTimeout(() => setExportFeedback(null), 4000);
    } catch (err: any) {
      console.error(err);
      setExportFeedback('Erro ao gerar PDF: ' + (err.message || 'Erro'));
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Synchronize when active event changes
  useEffect(() => {
    setShareTitle(event.shareTitle || event.title || 'Aniversário da Lorena');
    setShareDescription(
      event.shareDescription || 'Convite Especial - Aniversário da Lorena. Confirme sua presença.'
    );
    if (event.shareImageUrl) {
      if (event.shareImageUrl === event.bannerUrl) {
        setCoverSourceType('event_banner');
      } else {
        setCoverSourceType('custom_image');
      }
      setCustomImageUrl(event.shareImageUrl);
    } else {
      setCoverSourceType('svg_dynamic');
      setCustomImageUrl('');
    }
  }, [event.id]);

  const selectedGuest = invitations.find((i) => i.id === selectedGuestId) || null;
  const simulatedCode = selectedGuest ? selectedGuest.code : 'geral';
  const simulatedUrl = typeof window !== 'undefined' ? buildInvitationUrl(simulatedCode) : `https://seusite.com/convite/${simulatedCode}`;
  const originDomain = typeof window !== 'undefined' ? window.location.host : 'convite.grupoativa.com.br';

  // Computed preview image URL for live simulator
  const activePreviewImage =
    coverSourceType === 'custom_image' && customImageUrl
      ? customImageUrl
      : coverSourceType === 'event_banner' && event.bannerUrl
      ? event.bannerUrl
      : `/api/og-image/preview?title=${encodeURIComponent(shareTitle)}&desc=${encodeURIComponent(
          shareDescription
        )}&date=${encodeURIComponent(event.date)}&time=${encodeURIComponent(
          event.time
        )}&location=${encodeURIComponent(event.location)}${
          selectedGuest ? `&condo=${encodeURIComponent(selectedGuest.condoName)}&manager=${encodeURIComponent(selectedGuest.managerName)}` : ''
        }`;

  // Computed personalized title & description
  const computedTitle = selectedGuest
    ? `${selectedGuest.condoName} | Convite Especial - ${shareTitle}`
    : `${shareTitle} | Convite Especial`;

  const computedDescription = selectedGuest
    ? `Convite especial para Síndicos e Zeladores do ${selectedGuest.condoName}. Confirme sua presença. 📅 ${formatDateBR(event.date)} às ${event.time}.`
    : `${shareDescription} 📅 ${formatDateBR(event.date)} às ${event.time} - ${event.location}`;

  const sampleWhatsAppText = selectedGuest
    ? getWhatsAppMessage('notViewed', selectedGuest, event)
    : `Olá! Temos um convite especial para você.\n\nConfira os detalhes e confirme sua presença pelo link abaixo:\n\n${simulatedUrl}`;

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (JPG, PNG ou WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem é muito grande. O tamanho máximo permitido é 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (eventReader) => {
      const base64 = eventReader.target?.result as string;
      setCustomImageUrl(base64);
      setCoverSourceType('custom_image');
      setSelectedPreset('');
    };
    reader.readAsDataURL(file);
  };

  // Preset Selection Handler
  const handleSelectPreset = (url: string, id: string) => {
    setCustomImageUrl(url);
    setCoverSourceType('custom_image');
    setSelectedPreset(id);
  };

  // Save changes to backend
  const handleSave = async () => {
    try {
      setSaving(true);
      let finalShareImageUrl = '';
      if (coverSourceType === 'custom_image') {
        finalShareImageUrl = customImageUrl;
      } else if (coverSourceType === 'event_banner') {
        finalShareImageUrl = event.bannerUrl || '';
      } else {
        finalShareImageUrl = ''; // Will use auto dynamic SVG
      }

      const updated = await updateEvent(event.id, {
        shareTitle: shareTitle.trim(),
        shareDescription: shareDescription.trim(),
        shareImageUrl: finalShareImageUrl
      });

      onEventUpdated(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert('Erro ao salvar as configurações de preview.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(simulatedUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(sampleWhatsAppText);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2500);
  };

  const handleTestLink = () => {
    window.open(simulatedUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 flex items-center justify-center">
              <Share2 size={18} />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Preview de Compartilhamento (Redes Sociais &amp; WhatsApp)
            </h2>
          </div>
          <p className="text-slate-600 text-xs sm:text-sm max-w-3xl leading-relaxed">
            Configure a imagem de capa, título e descrição das metatags sociais (Open Graph). Ao compartilhar
            o link individual do convite pelo WhatsApp, Facebook ou LinkedIn, o aplicativo exibirá automaticamente este
            card profissional com a identidade da <strong>Ativa</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleTestLink}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs"
          >
            <ExternalLink size={14} />
            <span>Testar Link</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-teal-700/20 disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : saveSuccess ? (
              <Check size={14} className="text-white" />
            ) : (
              <Save size={14} />
            )}
            <span>{saving ? 'Salvando...' : saveSuccess ? 'Salvo com Sucesso!' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Settings Form & Interactive Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Cover Image Selection Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <ImageIcon size={18} className="text-teal-700" />
                <h3 className="text-sm font-bold text-slate-900">1. Imagem de Capa do Compartilhamento</h3>
              </div>
              <span className="text-[11px] font-medium text-slate-500">Recomendado: 1200 × 630 px</span>
            </div>

            {/* Source Type Options */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setCoverSourceType('svg_dynamic')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  coverSourceType === 'svg_dynamic'
                    ? 'bg-teal-50 border-teal-500 text-slate-900'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <Sparkles size={16} className={coverSourceType === 'svg_dynamic' ? 'text-teal-700' : 'text-slate-400'} />
                  {coverSourceType === 'svg_dynamic' && <Check size={14} className="text-teal-700" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Gerador Ativa VIP</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Card vetorial dinâmico 1200x630 com logo e dados</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCoverSourceType('event_banner')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  coverSourceType === 'event_banner'
                    ? 'bg-teal-50 border-teal-500 text-slate-900'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <Layers size={16} className={coverSourceType === 'event_banner' ? 'text-teal-700' : 'text-slate-400'} />
                  {coverSourceType === 'event_banner' && <Check size={14} className="text-teal-700" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Mesma Capa do Evento</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Utiliza a foto principal do evento</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCoverSourceType('custom_image')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  coverSourceType === 'custom_image'
                    ? 'bg-teal-50 border-teal-500 text-slate-900'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <Upload size={16} className={coverSourceType === 'custom_image' ? 'text-teal-700' : 'text-slate-400'} />
                  {coverSourceType === 'custom_image' && <Check size={14} className="text-teal-700" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Upload / URL Própria</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Definir imagem personalizada</div>
                </div>
              </button>
            </div>

            {/* Custom Image Upload & URL input (when custom_image is selected) */}
            {coverSourceType === 'custom_image' && (
              <div className="space-y-3 pt-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs shrink-0"
                  >
                    <Upload size={15} />
                    <span>Fazer Upload do Computador</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <span className="text-[11px] text-slate-500 text-center sm:text-left">
                    Formatos: PNG, JPG ou WebP (máx. 5MB)
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Ou cole uma URL pública de imagem:</label>
                  <input
                    type="url"
                    value={customImageUrl.startsWith('data:image') ? 'Imagem carregada via upload local' : customImageUrl}
                    disabled={customImageUrl.startsWith('data:image')}
                    onChange={(e) => {
                      setCustomImageUrl(e.target.value);
                      setSelectedPreset('');
                    }}
                    placeholder="https://exemplo.com/imagem-1200x630.jpg"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                  />
                </div>

                {/* Preset Gallery */}
                <div className="space-y-1.5 pt-2">
                  <div className="text-[11px] font-bold text-slate-700">Ou escolha da Galeria de Capas Ativa:</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PRESET_COVERS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset.url, preset.id)}
                        className={`relative rounded-lg overflow-hidden border text-left group transition ${
                          selectedPreset === preset.id || customImageUrl === preset.url
                            ? 'border-teal-600 ring-2 ring-teal-600/30'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="w-full h-16 object-cover group-hover:scale-105 transition duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent p-1.5 flex flex-col justify-end">
                          <span className="text-[10px] font-bold text-white truncate leading-tight">
                            {preset.name}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Title & Description Texts Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <Sliders size={18} className="text-teal-700" />
              <h3 className="text-sm font-bold text-slate-900">2. Textos do Preview Social (Open Graph)</h3>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  Título Curto do Preview <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-500 font-medium">{shareTitle.length}/60 caracteres</span>
              </div>
              <input
                type="text"
                value={shareTitle}
                maxLength={80}
                onChange={(e) => setShareTitle(e.target.value)}
                placeholder="Ex: Aniversário da Lorena"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 font-medium"
              />
              <p className="text-[11px] text-slate-500">
                Aparece em destaque com tipografia em negrito no balão do WhatsApp e nas redes sociais.
              </p>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  Descrição Curta do Convite <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-500 font-medium">{shareDescription.length}/120 caracteres</span>
              </div>
              <textarea
                rows={3}
                value={shareDescription}
                maxLength={160}
                onChange={(e) => setShareDescription(e.target.value)}
                placeholder="Ex: Convite especial para Síndicos e Zeladores. Confirme sua presença."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 resize-none font-normal"
              />
              <p className="text-[11px] text-slate-500">
                Texto descritivo institucional que acompanha o link.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Live Interactive Social Simulator (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs sticky top-20">
            {/* Header & Simulator Selector */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div className="flex items-center gap-1.5">
                <Eye size={16} className="text-teal-700" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Prévia em Tempo Real
                </span>
              </div>

              {/* Platform Switcher */}
              <div className="flex flex-wrap items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setPreviewPlatform('whatsapp')}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                    previewPlatform === 'whatsapp'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  WhatsApp (Link)
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPlatform('whatsapp_doc')}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                    previewPlatform === 'whatsapp_doc'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-900 font-semibold'
                  }`}
                >
                  WhatsApp (PDF com Capa)
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPlatform('facebook')}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                    previewPlatform === 'facebook'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Facebook / LinkedIn
                </button>
              </div>
            </div>

            {/* Test Guest Selector */}
            <div className="mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Simular link com convidado da lista:
              </label>
              <select
                value={selectedGuestId}
                onChange={(e) => setSelectedGuestId(e.target.value)}
                className="w-full bg-white text-xs text-slate-800 border border-slate-300 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-teal-600 cursor-pointer shadow-2xs font-medium"
              >
                {invitations.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.condoName} ({inv.managerName}) • Cód: {inv.code}
                  </option>
                ))}
                <option value="geral">🔗 Formulário Geral / Aberto (Sem código)</option>
              </select>
            </div>

            {/* Simulator Views */}
            {previewPlatform === 'whatsapp' ? (
              <div className="bg-[#e5ddd5] rounded-2xl p-4 border border-slate-300 shadow-inner space-y-3 font-sans">
                {/* Chat Message Bubble */}
                <div className="bg-[#dcf8c6] text-slate-900 rounded-xl p-3 shadow-xs text-xs leading-relaxed space-y-2 border border-[#c4e3a8]">
                  <p className="whitespace-pre-line text-slate-800 font-sans">
                    {sampleWhatsAppText}
                  </p>

                  {/* Rich Link Preview Card (Open Graph inside WhatsApp) */}
                  <div className="bg-white rounded-xl overflow-hidden border border-slate-300 mt-2 group shadow-xs">
                    {/* 1200x630 Large Card Image */}
                    <div className="relative aspect-[1.91/1] w-full bg-slate-100 overflow-hidden">
                      <img
                        src={activePreviewImage}
                        alt="Preview Social"
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-900/80 backdrop-blur-xs border border-teal-400/40 text-[9px] font-extrabold text-teal-300">
                        GRUPO ATIVA
                      </div>
                    </div>

                    {/* Metadata Card Footer */}
                    <div className="p-2.5 bg-slate-50 space-y-1">
                      <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider truncate">
                        {originDomain}
                      </div>
                      <div className="text-xs font-bold text-slate-900 line-clamp-1 leading-tight">
                        {computedTitle}
                      </div>
                      <div className="text-[11px] text-slate-600 line-clamp-2 leading-tight">
                        {computedDescription}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-600 text-center font-medium">
                  Prévia fiel do balão de mensagem e miniatura gerada ao enviar o Link no WhatsApp
                </div>
              </div>
            ) : previewPlatform === 'whatsapp_doc' ? (
              /* WhatsApp Document PDF Preview View - matching user's Image 2 */
              <div className="bg-[#0b141a] rounded-2xl p-4 border border-slate-800 shadow-2xl space-y-3 font-sans">
                <div className="bg-[#202c33] rounded-xl overflow-hidden border border-slate-700/70 shadow-lg text-white">
                  {/* Image Cover Thumbnail */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-950">
                    <img
                      src={activePreviewImage}
                      alt="Capa do Convite no WhatsApp"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/75 backdrop-blur-xs text-[9px] font-extrabold text-emerald-400 uppercase tracking-wide">
                      Miniatura da Capa (/Thumb)
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
                        {getPdfFileName(event.title)}
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

                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-[11px] text-emerald-300 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-emerald-200">
                    <CheckCircle2 size={13} className="text-emerald-400" />
                    Envio como Documento com Miniatura
                  </p>
                  <p className="text-slate-300 text-[10px] leading-relaxed">
                    O PDF gerado tem metadados de miniatura e tamanho ultraleve (~144 KB). Ao ser compartilhado como documento no WhatsApp, exibe a capa com miniatura nítida no topo e mantém todos os botões clicáveis.
                  </p>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadSamplePdf}
                    disabled={isExportingPdf}
                    className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Download size={13} />
                    <span>{isExportingPdf ? 'Gerando...' : 'Baixar PDF Teste com Miniatura'}</span>
                  </button>
                  {exportFeedback && (
                    <p className="text-[11px] text-emerald-400 font-semibold text-center mt-1.5">
                      {exportFeedback}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              /* Facebook / LinkedIn Simulator View */
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 shadow-inner space-y-3 font-sans">
                <div className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-xs">
                  <div className="relative aspect-[1.91/1] w-full bg-slate-100 overflow-hidden">
                    <img
                      src={activePreviewImage}
                      alt="Preview Social"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3 bg-white border-t border-slate-100 space-y-1">
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      {originDomain}
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1">
                      {computedTitle}
                    </div>
                    <div className="text-xs text-slate-600 line-clamp-2">
                      {computedDescription}
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 text-center font-medium">
                  Visualização do card nos feeds do Facebook, LinkedIn e Twitter
                </div>
              </div>
            )}

            {/* Quick Action Buttons for the simulated link */}
            <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-2xs"
              >
                {copiedLink ? <Check size={14} className="text-teal-700" /> : <Copy size={14} />}
                <span>{copiedLink ? 'Link do Convite Copiado!' : 'Copiar Link do Convite'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyMessage}
                className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
              >
                {copiedMsg ? <Check size={14} className="text-emerald-700" /> : <MessageSquare size={14} />}
                <span>{copiedMsg ? 'Mensagem Copiada com Sucesso!' : 'Copiar Texto + Link WhatsApp'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
