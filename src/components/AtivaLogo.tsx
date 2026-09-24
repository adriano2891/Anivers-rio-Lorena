import React from 'react';

interface Props {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
}

export const AtivaLogo: React.FC<Props> = ({
  className = '',
  size = 'md',
  showSubtitle = true
}) => {
  const sizeMap = {
    sm: { symbol: 26, text: 'text-sm', sub: 'text-[9px]' },
    md: { symbol: 34, text: 'text-base', sub: 'text-[10px]' },
    lg: { symbol: 46, text: 'text-xl', sub: 'text-[11px]' },
    xl: { symbol: 58, text: 'text-2xl', sub: 'text-xs' }
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Delicate Birthday Crown & Star Emblem */}
      <div
        className="shrink-0 flex items-center justify-center rounded-2xl bg-gradient-to-br from-pink-400 via-rose-400 to-sky-300 text-white shadow-xs"
        style={{ width: currentSize.symbol, height: currentSize.symbol }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-3/5 h-3/5 drop-shadow-xs text-white"
        >
          {/* Princess Crown Icon */}
          <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5ZM5 18C5 18.5523 5.44772 19 6 19H18C18.5523 19 19 18.5523 19 18V17H5V18Z" />
        </svg>
      </div>

      {/* Typographic Brandmark */}
      <div className="flex flex-col justify-center leading-none">
        <span
          className={`font-black tracking-wide bg-gradient-to-r from-pink-600 via-rose-500 to-sky-600 bg-clip-text text-transparent font-serif ${currentSize.text}`}
          style={{ letterSpacing: '0.04em' }}
        >
          Lorena
        </span>
        {showSubtitle && (
          <span
            className={`font-bold tracking-widest text-pink-400 uppercase mt-0.5 ${currentSize.sub}`}
            style={{ letterSpacing: '0.18em' }}
          >
            1º Aniversário
          </span>
        )}
      </div>
    </div>
  );
};

