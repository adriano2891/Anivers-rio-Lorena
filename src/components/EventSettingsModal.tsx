import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Settings,
  Calendar,
  Clock,
  MapPin,
  Image as ImageIcon,
  Users,
  MessageSquare,
  Lock,
  Plus,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Save,
  HelpCircle,
  Upload,
  Sparkles,
  Eye
} from 'lucide-react';
import { CondoEvent } from '../types';
import { updateEvent, createEvent, deleteEvent, changeAdminPassword, uploadImage } from '../lib/api';

const QUICK_COVER_PRESETS = [
  {
    name: 'Convite Oficial da Lorena (Principal)',
    url: 'https://i.ibb.co/ksBFdWSv/eeese.png'
  },
  {
    name: 'Arte Lorena 99x210mm',
    url: 'https://i.ibb.co/G4hJY92f/convite-lorena-99x210mm-4k.png'
  },
  {
    name: 'Capa Padrão Local',
    url: '/covers/default-cover.png'
  }
];

export const DEFAULT_EVENT_ADDRESS = 'Rua Cachoeira, nº 34, Jardim Rosa de França, Guarulhos';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentEvent: CondoEvent;
  allEvents: CondoEvent[];
  onSelectEvent: (event: CondoEvent) => void;
  onEventsUpdated: (events: CondoEvent[], activeEvent?: CondoEvent) => void;
}

export const EventSettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentEvent,
  allEvents,
  onSelectEvent,
  onEventsUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'whatsapp' | 'security' | 'events'>('details');

  // Event form
  const [title, setTitle] = useState(currentEvent?.title || '');
  const [date, setDate] = useState(currentEvent?.date || '');
  const [time, setTime] = useState(currentEvent?.time || '');
  const [location, setLocation] = useState(currentEvent?.location || '');
  const [address, setAddress] = useState(currentEvent?.address || DEFAULT_EVENT_ADDRESS);
  const [bannerUrl, setBannerUrl] = useState(currentEvent?.bannerUrl || '');
  const [logoUrl, setLogoUrl] = useState(currentEvent?.logoUrl || '');
  const [presentationText, setPresentationText] = useState(currentEvent?.presentationText || '');
  const [requireJanitor, setRequireJanitor] = useState(currentEvent?.requireJanitor || false);
  const [maxParticipants, setMaxParticipants] = useState(currentEvent?.maxParticipants || 50);
  const [confirmationDeadline, setConfirmationDeadline] = useState(currentEvent?.confirmationDeadline || '');
  const [waitingListEnabled, setWaitingListEnabled] = useState(currentEvent?.waitingListEnabled ?? true);

  // WhatsApp templates
  const [templates, setTemplates] = useState({ ...(currentEvent?.whatsappTemplates || {}) });

  // Security / PIN
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinSuccess, setPinSuccess] = useState(false);

  // New Event form
  const [isCreatingNewEvent, setIsCreatingNewEvent] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('19:00');

  const [saving, setSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      setSaveErrorMessage('A imagem deve ter no máximo 25MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setBannerUrl(result);
        try {
          const res = await uploadImage(file);
          if (res?.url) {
            setBannerUrl(res.url);
          }
        } catch (uploadErr) {
          console.warn('Storage upload fallback:', uploadErr);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (currentEvent && isOpen) {
      setTitle(currentEvent.title || '');
      setDate(currentEvent.date || '');
      setTime(currentEvent.time || '');
      setLocation(currentEvent.location || '');
      setAddress(currentEvent.address || DEFAULT_EVENT_ADDRESS);
      setBannerUrl(currentEvent.bannerUrl || '');
      setLogoUrl(currentEvent.logoUrl || '');
      setPresentationText(currentEvent.presentationText || '');
      setRequireJanitor(currentEvent.requireJanitor || false);
      setMaxParticipants(currentEvent.maxParticipants || 50);
      setConfirmationDeadline(currentEvent.confirmationDeadline || '');
      setWaitingListEnabled(currentEvent.waitingListEnabled ?? true);
      setTemplates({ ...(currentEvent.whatsappTemplates || {}) });
    }
  }, [currentEvent, isOpen]);

  if (!isOpen || !currentEvent) return null;

  const handleSaveDetails = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaveSuccessMessage(null);
    setSaveErrorMessage(null);
    try {
      setSaving(true);
      let finalBannerUrl = bannerUrl;
      if (finalBannerUrl && finalBannerUrl.startsWith('data:image')) {
        try {
          const res = await uploadImage(finalBannerUrl, 'cover');
          if (res?.url) {
            finalBannerUrl = res.url;
            setBannerUrl(res.url);
          }
        } catch {}
      }

      const updated = await updateEvent(currentEvent.id, {
        title: title.trim() || currentEvent.title,
        date,
        time,
        location,
        address,
        bannerUrl: finalBannerUrl,
        logoUrl,
        presentationText,
        requireJanitor,
        maxParticipants: Number(maxParticipants),
        confirmationDeadline,
        waitingListEnabled,
        whatsappTemplates: templates,
        coverHotspots: currentEvent.coverHotspots || []
      });

      const updatedList = allEvents.map((ev) => (ev.id === updated.id ? updated : ev));
      onEventsUpdated(updatedList, updated);
      setSaveSuccessMessage('Alterações salvas com sucesso');
      setTimeout(() => {
        setSaveSuccessMessage(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      setSaveErrorMessage(err.message || 'Não foi possível salvar as alterações no banco de dados. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await changeAdminPassword(currentPin, newPin);
      setPinSuccess(true);
      setCurrentPin('');
      setNewPin('');
      setTimeout(() => setPinSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar senha do admin');
    }
  };

  const handleCreateNewEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDate) {
      alert('Preencha o título e data do novo evento.');
      return;
    }

    try {
      const created = await createEvent({
        title: newTitle,
        date: newDate,
        time: newTime,
        location: 'Auditório Principal',
        address: DEFAULT_EVENT_ADDRESS,
        maxParticipants: 50
      });

      const updatedList = [created, ...allEvents];
      onEventsUpdated(updatedList, created);
      setIsCreatingNewEvent(false);
      setNewTitle('');
      setNewDate('');
      alert(`Evento "${created.title}" criado com sucesso!`);
    } catch (err: any) {
      alert(err.message || 'Erro ao criar evento');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (allEvents.length <= 1) {
      alert('Você não pode excluir o único evento existente.');
      return;
    }
    const confirmDel = window.confirm(
      'Tem certeza de que deseja excluir este evento e todos os seus convites cadastrados?'
    );
    if (!confirmDel) return;

    try {
      await deleteEvent(eventId);
      const remaining = allEvents.filter((e) => e.id !== eventId);
      const nextActive = remaining[0];
      onEventsUpdated(remaining, nextActive);
    } catch (err) {
      alert('Erro ao excluir evento');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative text-slate-800 flex flex-col max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center">
            <Settings size={20} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Configurações do Aniversário da Lorena</h2>
        </div>
        <p className="text-slate-500 text-xs mb-4">
          Personalize informações do convite, local, capacidade da festa, modelos de WhatsApp e segurança.
        </p>

        {/* Visual Database Save Feedback */}
        {saveSuccessMessage && (
          <div className="mb-4 bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <span>{saveSuccessMessage}</span>
            </div>
            <button onClick={() => setSaveSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900 font-bold ml-2">✕</button>
          </div>
        )}

        {saveErrorMessage && (
          <div className="mb-4 bg-rose-50 border border-rose-300 text-rose-900 px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} className="text-rose-600 shrink-0" />
              <span>{saveErrorMessage}</span>
            </div>
            <button
              onClick={() => handleSaveDetails()}
              className="px-3 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold transition shrink-0 ml-2"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Tab Header */}
        <div className="flex border-b border-slate-200 gap-2 mb-4 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-2.5 px-3 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'details'
                ? 'border-pink-600 text-pink-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Dados da Festa & Vagas
          </button>
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`pb-2.5 px-3 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'whatsapp'
                ? 'border-pink-600 text-pink-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Modelos de WhatsApp
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`pb-2.5 px-3 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'events'
                ? 'border-pink-600 text-pink-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Gerenciar Eventos ({allEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`pb-2.5 px-3 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'security'
                ? 'border-pink-600 text-pink-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Segurança & Senha
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto pr-1">
          {activeTab === 'details' && (
            <form onSubmit={handleSaveDetails} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Nome / Título do Evento
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Data do Evento
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Horário
                  </label>
                  <input
                    type="text"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="Ex: 14h às 16h ou 14:00"
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Local do Evento
                  </label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Endereço Completo
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={DEFAULT_EVENT_ADDRESS}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Texto de Apresentação do Convite
                </label>
                <textarea
                  rows={3}
                  value={presentationText}
                  onChange={(e) => setPresentationText(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition"
                />
              </div>

              {/* Capa do Convite com Upload e Modelos */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <ImageIcon size={14} className="text-teal-700" />
                    <span>Capa / Imagem Principal do Convite</span>
                  </label>
                  <span className="text-[10px] text-slate-500">Exibida no topo do convite online</span>
                </div>

                {/* Banner Thumbnail Preview */}
                {bannerUrl && (
                  <div className="relative h-28 sm:h-32 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-inner group">
                    <img
                      src={bannerUrl}
                      alt="Capa do convite"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = QUICK_COVER_PRESETS[0].url;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />
                    <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px]">
                      <span className="text-white font-semibold truncate drop-shadow">
                        Capa Ativa
                      </span>
                      <button
                        type="button"
                        onClick={() => bannerFileInputRef.current?.click()}
                        className="px-2.5 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-[10px] font-bold shadow transition flex items-center gap-1"
                      >
                        <Upload size={12} />
                        <span>Substituir Imagem</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={bannerFileInputRef}
                  onChange={handleBannerUpload}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                />

                {/* Upload Trigger (sem exibir a URL técnica crua) */}
                <div>
                  <button
                    type="button"
                    onClick={() => bannerFileInputRef.current?.click()}
                    className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-teal-800 border border-slate-300 hover:border-teal-600 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
                  >
                    <Upload size={14} className="text-teal-700" />
                    <span>Upload de Nova Imagem / Capa</span>
                  </button>
                </div>

                {/* Quick Preset Selector */}
                <div>
                  <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Sparkles size={11} className="text-amber-500" />
                    <span>Sugestões Rápidas de Capa:</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {QUICK_COVER_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setBannerUrl(preset.url)}
                        className={`text-left p-1.5 rounded-lg border transition text-[10px] flex items-center gap-2 ${
                          bannerUrl === preset.url
                            ? 'bg-teal-50 border-teal-600 text-teal-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="w-7 h-7 rounded object-cover shrink-0"
                        />
                        <span className="truncate font-medium">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Vagas & Prazos */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Controle de Vagas e Prazos
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Limite Máximo de Vagas</label>
                    <input
                      type="number"
                      min={1}
                      value={maxParticipants}
                      onChange={(e) => setMaxParticipants(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Prazo Limite para Confirmar</label>
                    <input
                      type="date"
                      value={confirmationDeadline}
                      onChange={(e) => setConfirmationDeadline(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="requireJanitorCheck"
                    checked={requireJanitor}
                    onChange={(e) => setRequireJanitor(e.target.checked)}
                    className="w-4 h-4 rounded text-pink-600 bg-white border-slate-300 focus:ring-pink-500"
                  />
                  <label htmlFor="requireJanitorCheck" className="text-slate-700 cursor-pointer">
                    Tornar o campo <strong>Nome dos Convidados / Acompanhantes</strong> obrigatório no formulário
                  </label>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl transition flex items-center gap-1.5 shadow-md shadow-pink-600/20 cursor-pointer"
                >
                  <Save size={15} />
                  <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'whatsapp' && (
            <div className="space-y-4 text-xs">
              <div className="bg-pink-50 border border-pink-200 rounded-xl p-3 text-pink-900 text-[11px] leading-relaxed">
                Variáveis disponíveis para uso automático:{' '}
                <strong className="text-slate-900">
                  {'{Nome}'}, {'{Responsavel}'}, {'{Familia}'}, {'{Convidados}'}, {'{Evento}'}, {'{Data}'}, {'{Horario}'}, {'{Local}'}, {'{Endereco}'}, {'{Link}'}
                </strong>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Mensagem: Presença Confirmada (Agradecimento)
                </label>
                <textarea
                  rows={4}
                  value={templates.confirmed}
                  onChange={(e) => setTemplates({ ...templates, confirmed: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Mensagem: Visualizou, mas ainda não confirmou
                </label>
                <textarea
                  rows={4}
                  value={templates.viewedNotConfirmed}
                  onChange={(e) =>
                    setTemplates({ ...templates, viewedNotConfirmed: e.target.value })
                  }
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Mensagem: Ainda não visualizou o convite
                </label>
                <textarea
                  rows={4}
                  value={templates.notViewed}
                  onChange={(e) => setTemplates({ ...templates, notViewed: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Mensagem: Lembrete Próximo ao Evento
                </label>
                <textarea
                  rows={4}
                  value={templates.reminder}
                  onChange={(e) => setTemplates({ ...templates, reminder: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveDetails}
                  disabled={saving}
                  className="px-5 py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl transition flex items-center gap-1.5 shadow-md shadow-pink-600/20 cursor-pointer"
                >
                  <Save size={15} />
                  <span>Salvar Modelos de WhatsApp</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'events' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div className="font-bold text-slate-900">Eventos Cadastrados no Sistema</div>
                <button
                  type="button"
                  onClick={() => setIsCreatingNewEvent(!isCreatingNewEvent)}
                  className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs"
                >
                  <Plus size={14} />
                  <span>Novo Evento</span>
                </button>
              </div>

              {/* Create new event form */}
              {isCreatingNewEvent && (
                <form
                  onSubmit={handleCreateNewEvent}
                  className="bg-slate-50 p-4 rounded-xl border border-slate-300 space-y-3"
                >
                  <div className="font-bold text-slate-900 text-xs">Criar Novo Evento</div>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Título do Evento (Ex: Workshop Novembro)"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      required
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                    <input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewEvent(false)}
                      className="px-3 py-1 text-slate-500 hover:text-slate-800 text-xs font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-2xs"
                    >
                      Criar e Ativar
                    </button>
                  </div>
                </form>
              )}

              {/* Events List */}
              <div className="space-y-2">
                {allEvents.map((evt) => {
                  const isActive = evt.id === currentEvent.id;
                  return (
                    <div
                      key={evt.id}
                      className={`p-3.5 rounded-xl border flex items-center justify-between transition ${
                        isActive
                          ? 'bg-teal-50 border-teal-600 text-slate-900 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-sm flex items-center gap-2">
                          <span className="text-slate-900">{evt.title}</span>
                          {isActive && (
                            <span className="text-[10px] bg-teal-700 text-white px-2 py-0.5 rounded-full font-bold">
                              Ativo
                            </span>
                          )}
                        </div>
                        <div className="text-slate-500 text-xs mt-0.5">
                          📅 {evt.date} às {evt.time} • 📍 {evt.location}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isActive && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectEvent(evt);
                              onClose();
                            }}
                            className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs"
                          >
                            Selecionar
                          </button>
                        )}
                        {allEvents.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(evt.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                            title="Excluir Evento"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-1.5">
                  <Lock size={16} className="text-teal-700" />
                  <span>Alterar Senha / PIN de Acesso ao Painel Admin</span>
                </h3>
                <p className="text-slate-500 text-xs mb-4">
                  A senha padrão de fábrica é <code className="bg-slate-200 px-1.5 py-0.5 rounded text-teal-800 font-mono">admin123</code>.
                </p>

                {pinSuccess && (
                  <div className="mb-4 bg-emerald-50 border border-emerald-300 text-emerald-800 p-3 rounded-xl flex items-center gap-2 text-xs font-semibold">
                    <CheckCircle2 size={16} />
                    <span>Senha do Administrador alterada com sucesso!</span>
                  </div>
                )}

                <form onSubmit={handleChangePin} className="space-y-3 max-w-sm">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Senha Atual</label>
                    <input
                      type="password"
                      required
                      value={currentPin}
                      onChange={(e) => setCurrentPin(e.target.value)}
                      placeholder="Digite a senha atual"
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Nova Senha</label>
                    <input
                      type="password"
                      required
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      placeholder="Mínimo 4 caracteres"
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl transition mt-2 shadow-md shadow-teal-700/20"
                  >
                    Salvar Nova Senha
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
