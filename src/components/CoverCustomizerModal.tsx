import React, { useState, useRef } from 'react';
import {
  X,
  Image as ImageIcon,
  Upload,
  Sparkles,
  Check,
  Globe,
  RefreshCw,
  Save,
  Building2,
  Sliders,
  Eye,
  Trash2
} from 'lucide-react';
import { CondoEvent } from '../types';
import { updateEvent } from '../lib/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  event: CondoEvent;
  onCoverUpdated: (updatedEvent: CondoEvent) => void;
}

interface CoverPreset {
  id: string;
  name: string;
  category: string;
  url: string;
  description: string;
}

const COVER_PRESETS: CoverPreset[] = [
  {
    id: 'preset-oficial',
    name: 'Convite Oficial (Padrão)',
    category: 'Oficial',
    url: '/covers/default-cover.png',
    description: 'Cartaz oficial de capa padrão do convite'
  },
  {
    id: 'preset-workshop',
    name: 'Workshop & Convenção',
    category: 'Eventos',
    url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
    description: 'Auditório moderno e iluminado para workshops e palestras'
  },
  {
    id: 'preset-luxury-condo',
    name: 'Edifício Residencial Moderno',
    category: 'Condomínios',
    url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
    description: 'Fachada contemporânea de condomínio de alto padrão'
  },
  {
    id: 'preset-night-facade',
    name: 'Condomínio Noturno Iluminado',
    category: 'Condomínios',
    url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
    description: 'Torres imponentes com iluminação arquitetônica'
  },
  {
    id: 'preset-meeting-room',
    name: 'Reunião Executiva & Síndicos',
    category: 'Gestão',
    url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
    description: 'Sala de conferência elegante e corporativa'
  },
  {
    id: 'preset-gala-cocktail',
    name: 'Coquetel & Networking',
    category: 'Confraternização',
    url: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1200&q=80',
    description: 'Luzes quentes e ambiente sofisticado para encontros sociais'
  },
  {
    id: 'preset-smart-city',
    name: 'Inovação & Smart Building',
    category: 'Tecnologia',
    url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=80',
    description: 'Conceito futurista de segurança e automação predial'
  },
  {
    id: 'preset-garden-lounge',
    name: 'Lounge & Área Gourmet',
    category: 'Confraternização',
    url: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80',
    description: 'Espaço aberto moderno com paisagismo'
  },
  {
    id: 'preset-keynote-stage',
    name: 'Palco Principal & Painel',
    category: 'Eventos',
    url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1200&q=80',
    description: 'Palestrantes e apresentação de impacto'
  }
];

export const CoverCustomizerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  event,
  onCoverUpdated
}) => {
  const [selectedUrl, setSelectedUrl] = useState(event.bannerUrl || COVER_PRESETS[0].url);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [activeTab, setActiveTab] = useState<'presets' | 'upload' | 'url'>('presets');
  const [isSaving, setIsSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with current event banner
  React.useEffect(() => {
    if (isOpen) {
      setSelectedUrl(event.bannerUrl || COVER_PRESETS[0].url);
      setCustomUrlInput('');
      setUploadError(null);
    }
  }, [isOpen, event.bannerUrl]);

  if (!isOpen) return null;

  const categories = ['Todos', 'Condomínios', 'Eventos', 'Gestão', 'Confraternização', 'Tecnologia'];

  const filteredPresets = selectedCategory === 'Todos'
    ? COVER_PRESETS
    : COVER_PRESETS.filter((p) => p.category === selectedCategory);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('A imagem selecionada é maior que 5MB. Por favor, escolha uma imagem menor.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setUploadError('Por favor, selecione um arquivo de imagem válido (JPEG, PNG, WebP).');
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setSelectedUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrlInput.trim()) return;
    setSelectedUrl(customUrlInput.trim());
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const updated = await updateEvent(event.id, {
        bannerUrl: selectedUrl
      });
      onCoverUpdated(updated);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar a nova capa');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 flex items-center justify-center">
              <ImageIcon size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Personalizar Capa do Convite</h2>
              <p className="text-xs text-slate-500">
                Altere a imagem de destaque que os convidados visualizam no convite online
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Live Preview Card */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Eye size={14} className="text-teal-700" />
                <span>Pré-visualização em Tempo Real</span>
              </span>
              <span className="text-[11px] text-slate-500">
                Como os convidados verão a capa no convite público
              </span>
            </div>

            <div className="relative rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 shadow-inner group flex items-center justify-center p-2">
              <img
                src={selectedUrl}
                alt="Capa do convite"
                referrerPolicy="no-referrer"
                className="w-full h-auto object-contain max-h-[420px] mx-auto block rounded-xl transition duration-300"
                onError={(e) => {
                  // Fallback if URL is broken
                  (e.target as HTMLImageElement).src = COVER_PRESETS[0].url;
                }}
              />
            </div>
          </div>

          {/* Selector Tabs */}
          <div>
            <div className="flex border-b border-slate-200 gap-2 mb-4 text-xs font-bold">
              <button
                onClick={() => setActiveTab('presets')}
                className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 ${
                  activeTab === 'presets'
                    ? 'border-teal-700 text-teal-900 bg-teal-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Sparkles size={14} />
                <span>Galeria de Modelos Prontos</span>
              </button>

              <button
                onClick={() => setActiveTab('upload')}
                className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 ${
                  activeTab === 'upload'
                    ? 'border-teal-700 text-teal-900 bg-teal-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Upload size={14} />
                <span>Enviar Imagem do Seu Dispositivo</span>
              </button>

              <button
                onClick={() => setActiveTab('url')}
                className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 ${
                  activeTab === 'url'
                    ? 'border-teal-700 text-teal-900 bg-teal-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Globe size={14} />
                <span>Link / URL Personalizado</span>
              </button>
            </div>

            {/* TAB 1: Presets Gallery */}
            {activeTab === 'presets' && (
              <div className="space-y-4">
                {/* Category Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        selectedCategory === cat
                          ? 'bg-teal-700 text-white shadow-2xs'
                          : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-64 overflow-y-auto pr-1">
                  {filteredPresets.map((preset) => {
                    const isSelected = selectedUrl === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedUrl(preset.url)}
                        className={`group relative rounded-xl overflow-hidden border text-left transition-all aspect-4/3 flex flex-col justify-end p-2 bg-slate-100 ${
                          isSelected
                            ? 'border-teal-700 ring-2 ring-teal-600/50 shadow-md'
                            : 'border-slate-200 hover:border-slate-300 opacity-90 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="absolute inset-0 w-full h-full object-cover transition duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-teal-700 text-white flex items-center justify-center shadow">
                            <Check size={14} />
                          </div>
                        )}

                        <div className="relative z-10">
                          <span className="text-[10px] font-bold text-white truncate block leading-tight">
                            {preset.name}
                          </span>
                          <span className="text-[9px] text-slate-200 truncate block">
                            {preset.category}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: Upload File */}
            {activeTab === 'upload' && (
              <div className="space-y-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/png, image/jpeg, image/webp, image/gif"
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-teal-600 bg-slate-50/70 hover:bg-slate-50 rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3"
                >
                  <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-800 border border-teal-200 flex items-center justify-center">
                    <Upload size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 mb-1">
                      Clique para escolher uma imagem do seu computador ou celular
                    </p>
                    <p className="text-xs text-slate-500">
                      Suporta JPG, PNG ou WebP de alta resolução (máx. 5MB)
                    </p>
                  </div>

                  <button
                    type="button"
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition shadow-2xs"
                  >
                    Procurar Arquivo...
                  </button>
                </div>

                {uploadError && (
                  <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-xl font-medium">
                    {uploadError}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Custom URL */}
            {activeTab === 'url' && (
              <form onSubmit={handleApplyCustomUrl} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    URL Direta da Imagem (Web)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={customUrlInput}
                      onChange={(e) => setCustomUrlInput(e.target.value)}
                      placeholder="https://exemplo.com/sua-imagem-banner.jpg"
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 font-mono focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition whitespace-nowrap shadow-2xs"
                    >
                      Aplicar
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Você pode utilizar fotos do Unsplash, Pexels, Google Drive público ou o link do site da sua administradora.
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md shadow-teal-700/20 disabled:opacity-50"
          >
            <Save size={15} />
            <span>{isSaving ? 'Salvando Capa...' : 'Salvar e Aplicar no Convite'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
