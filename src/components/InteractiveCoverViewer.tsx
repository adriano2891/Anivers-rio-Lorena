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
  const [aspectRatio, setAspectRatio] = useState<number>(9 / 16);

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
      ref={containerRef}
      className={`relative select-none w-full h-full flex items-center justify-center overflow-hidden ${className}`}
      style={{
        aspectRatio: `${aspectRatio}`,
        touchAction: 'pan-y'
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
        className="w-full h-full block object-contain pointer-events-none select-none"
      />

      {/* Hotspots Overlay Layer */}
        {hotspots.map((spot) => {
          const isSelected = selectedHotspotId === spot.id;
          const isFeedback = activeFeedbackId === spot.id;

          // In Guest Mode (showHotspotBorders = false):
          // Interactive button with pointer hand cursor, hover glow effect, animated badge and touch feedback
          if (!showHotspotBorders) {
            const isRsvp =
              spot.actionType === 'confirm_rsvp' ||
              spot.actionType === 'open_form' ||
              spot.targetUrl === '#formulario' ||
              (spot.name && spot.name.toLowerCase().includes('confirm'));

            return (
              <button
                key={spot.id}
                type="button"
                id={`hotspot-btn-${spot.id}`}
                onClick={(e) => handleHotspotClick(e, spot)}
                title={spot.name || (isRsvp ? 'Confirmar Presença' : 'Saiba como chegar')}
                aria-label={spot.name || (isRsvp ? 'Confirmar Presença' : 'Saiba como chegar')}
                style={{
                  left: `${spot.x}%`,
                  top: `${spot.y}%`,
                  width: `${spot.width}%`,
                  height: `${spot.height}%`,
                  touchAction: 'manipulation'
                }}
                className={`group absolute cursor-pointer rounded-2xl sm:rounded-full border border-transparent transition-all duration-200 outline-none p-0 m-0 z-20 focus:outline-none ${
                  isFeedback
                    ? 'bg-pink-500/30 ring-4 ring-pink-400 scale-[0.98]'
                    : 'hover:bg-white/25 hover:border-pink-300/80 hover:ring-2 sm:hover:ring-4 hover:ring-pink-400/80 hover:shadow-[0_0_20px_rgba(244,114,182,0.65)] active:scale-95 active:bg-pink-500/30 active:ring-2 active:ring-pink-400'
                }`}
              >
                {/* Visual indicator badge when hovering on desktop */}
                <span className="opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-[10px] sm:text-xs font-bold py-1 px-2.5 rounded-lg whitespace-nowrap shadow-lg flex items-center gap-1.5 z-30 transform group-hover:-translate-y-0.5">
                  <span className="inline-block animate-bounce text-xs">👆</span>
                  <span>{spot.name || (isRsvp ? 'Clique para Confirmar Presença' : 'Clique para Saber Como Chegar')}</span>
                </span>
                {/* Subtle shimmer highlight on hover */}
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute inset-0 rounded-2xl sm:rounded-full pointer-events-none bg-gradient-to-r from-pink-400/15 via-white/20 to-pink-400/15 animate-pulse" />
              </button>
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
  );
};
