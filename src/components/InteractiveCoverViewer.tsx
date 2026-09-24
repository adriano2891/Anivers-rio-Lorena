import React, { useRef, useState, useEffect } from 'react';
import { CoverHotspot } from '../types';
import { ExternalLink, Sparkles, CheckCircle2, MapPin } from 'lucide-react';

interface Props {
  imageUrl: string;
  altText?: string;
  hotspots?: CoverHotspot[];
  /** When true, highlights hotspots with visible borders, badges, and selection outline for editing */
  showHotspotBorders?: boolean;
  selectedHotspotId?: string | null;
  onSelectHotspot?: (hotspot: CoverHotspot) => void;
  onActionTrigger?: (hotspot: CoverHotspot) => void;
  /** When true, allows clicking on hotspots to trigger links or actions */
  interactive?: boolean;
  className?: string;
  onImageLoad?: (dimensions: { naturalWidth: number; naturalHeight: number }) => void;
}

export const InteractiveCoverViewer: React.FC<Props> = ({
  imageUrl,
  altText = 'Capa Interativa do Convite',
  hotspots = [],
  showHotspotBorders = false,
  selectedHotspotId = null,
  onSelectHotspot,
  onActionTrigger,
  interactive = true,
  className = '',
  onImageLoad
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeFeedbackId, setActiveFeedbackId] = useState<string | null>(null);
  const [currentSrc, setCurrentSrc] = useState<string>(imageUrl || '/covers/default-cover.png');
  const [hasError, setHasError] = useState<boolean>(false);
  const [aspectRatio, setAspectRatio] = useState<number>(1054 / 1492);

  useEffect(() => {
    setCurrentSrc(imageUrl || '/covers/default-cover.png');
    setHasError(false);
  }, [imageUrl]);

  const handleImageError = () => {
    // If the custom image failed, automatically fall back to the project default cover
    if (currentSrc !== '/covers/default-cover.png') {
      console.warn(`[Cover] Failed to load ${currentSrc}, falling back to /covers/default-cover.png`);
      setCurrentSrc('/covers/default-cover.png');
    } else {
      console.warn('[Cover] Default cover also failed to load, switching to interactive fallback UI');
      setHasError(true);
    }
  };

  const handleHotspotClick = (e: React.MouseEvent, spot: CoverHotspot) => {
    // If in admin editing mode, select the hotspot for editing
    if (showHotspotBorders && onSelectHotspot) {
      e.preventDefault();
      e.stopPropagation();
      onSelectHotspot(spot);
      return;
    }

    if (!interactive) return;

    // Show quick subtle click ripple feedback
    setActiveFeedbackId(spot.id);
    setTimeout(() => setActiveFeedbackId(null), 400);

    // If custom action handler is provided, delegate completely to it (e.g. open fullscreen RSVP modal)
    if (onActionTrigger) {
      e.preventDefault();
      onActionTrigger(spot);
      return;
    }

    // Determine target execution
    const isFormAction =
      spot.actionType === 'confirm_rsvp' ||
      spot.actionType === 'open_form' ||
      spot.targetUrl?.startsWith('#');

    if (isFormAction) {
      e.preventDefault();
      const formEl = document.getElementById('rsvp-form') || document.getElementById('rsvp-response-card');
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Focus first input after scroll
        setTimeout(() => {
          const firstInput = formEl.querySelector<HTMLInputElement>('input, textarea');
          firstInput?.focus();
        }, 500);
      }
      return;
    }

    let url = spot.targetUrl?.trim();
    if (!url) return;

    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('mailto:') && !url.startsWith('tel:')) {
      url = `https://${url}`;
    }

    if (spot.openInNewTab) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = url;
    }
  };

  if (hasError) {
    return (
      <div className={`w-full min-h-[420px] p-8 flex flex-col items-center justify-center text-center bg-gradient-to-br from-[#005B58] via-[#007A78] to-[#009688] text-white ${className}`}>
        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 shadow-lg border border-white/30">
          <Sparkles className="w-7 h-7 text-teal-100" />
        </div>
        <span className="px-3.5 py-1 rounded-full bg-white/20 text-teal-100 text-xs font-bold uppercase tracking-wider mb-2 border border-white/30">
          Convite Oficial • Grupo Ativa
        </span>
        <h2 className="text-2xl sm:text-3xl font-black mb-3 tracking-tight text-white max-w-md">
          {altText}
        </h2>
        <p className="text-teal-100 text-xs sm:text-sm max-w-sm mb-6 leading-relaxed">
          Clique nos botões abaixo para confirmar sua presença ou conferir a localização do evento.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          {hotspots.map((spot) => (
            <button
              key={spot.id}
              type="button"
              onClick={(e) => handleHotspotClick(e, spot)}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm shadow-md transition transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${
                spot.actionType === 'confirm_rsvp'
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : 'bg-white/90 hover:bg-white text-teal-900'
              }`}
            >
              {spot.actionType === 'confirm_rsvp' ? <CheckCircle2 size={16} /> : <MapPin size={16} />}
              <span>{spot.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full h-full max-h-[100dvh] flex items-center justify-center overflow-hidden select-none ${className}`}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Ambient backdrop that fills 100% of height and width on mobile screens to eliminate black borders */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none sm:hidden">
        <img
          src={currentSrc}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover blur-2xl opacity-40 scale-125"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-transparent to-white/80" />
      </div>

      {/* Sized container that matches the exact rendered image dimensions for pixel-perfect hotspot alignment */}
      <div
        ref={containerRef}
        className="relative select-none max-w-full max-h-[100dvh] w-full flex items-center justify-center"
        style={{
          aspectRatio: `${aspectRatio}`,
          maxHeight: '100dvh',
          maxWidth: '100vw'
        }}
      >
        {/* Main sharp cover image */}
        <img
          src={currentSrc}
          alt={altText}
          referrerPolicy="no-referrer"
          onError={handleImageError}
          onLoad={(e) => {
            const target = e.currentTarget;
            if (target.naturalWidth && target.naturalHeight) {
              setAspectRatio(target.naturalWidth / target.naturalHeight);
            }
            if (onImageLoad) {
              onImageLoad({
                naturalWidth: target.naturalWidth,
                naturalHeight: target.naturalHeight
              });
            }
          }}
          className="w-full h-full max-h-[100dvh] max-w-[100vw] block object-contain pointer-events-none"
        />

        {/* Hotspots Overlay Layer */}
        {hotspots.map((spot) => {
          const isSelected = selectedHotspotId === spot.id;
          const isFeedback = activeFeedbackId === spot.id;

          // In Guest Mode (showHotspotBorders = false): 100% invisible!
          // No border, no background, no shadow. Instant 1-tap/1-click touch response.
          if (!showHotspotBorders) {
            return (
              <button
                key={spot.id}
                type="button"
                id={`hotspot-btn-${spot.id}`}
                onClick={(e) => handleHotspotClick(e, spot)}
                title={spot.name || 'Clique para interagir'}
                aria-label={spot.name || 'Área interativa'}
                style={{
                  left: `${spot.x}%`,
                  top: `${spot.y}%`,
                  width: `${spot.width}%`,
                  height: `${spot.height}%`,
                  touchAction: 'manipulation'
                }}
                className={`absolute cursor-pointer border-0 outline-none p-0 m-0 z-20 transition-opacity focus:outline-none ${
                  isFeedback ? 'bg-teal-500/20' : 'bg-transparent'
                }`}
              />
            );
          }

          // In Admin Edit Mode (showHotspotBorders = true): Highlighted outline & badge
          return (
            <div
              key={spot.id}
              onClick={(e) => handleHotspotClick(e, spot)}
              style={{
                left: `${spot.x}%`,
                top: `${spot.y}%`,
                width: `${spot.width}%`,
                height: `${spot.height}%`
              }}
              className={`absolute cursor-pointer transition-all duration-150 rounded-md flex flex-col justify-between p-1 z-10 ${
                isSelected
                  ? 'border-2 border-teal-500 bg-teal-500/25 shadow-lg ring-2 ring-teal-400/50'
                  : 'border-2 border-dashed border-sky-400 bg-sky-500/15 hover:bg-sky-500/25 hover:border-sky-300'
              }`}
            >
              {/* Top Action Badge */}
              <div className="flex items-center justify-between gap-1 overflow-hidden">
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-900/90 text-white shadow-xs truncate max-w-full">
                  <Sparkles size={10} className="text-teal-400 shrink-0" />
                  <span className="truncate">{spot.name || 'Área Clicável'}</span>
                </span>

                {spot.openInNewTab && (
                  <span className="p-0.5 rounded bg-slate-900/80 text-white shrink-0" title="Abre em nova aba">
                    <ExternalLink size={9} />
                  </span>
                )}
              </div>

              {/* Bottom URL preview */}
              <div className="text-[9px] font-mono text-white bg-slate-950/80 px-1 py-0.2 rounded truncate max-w-full">
                {spot.targetUrl || '#formulario'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
