import React from 'react';

/**
 * Isotipo "Nexo" (conexión) en estilo flat-premium para integrarse con los gradients `primary-*`.
 * No depende de appBrand: solo usa los colores del theme (primary/secondary) embebidos.
 */
export function NexoIcon({
  className,
  ariaLabel,
}: {
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      role={ariaLabel ? 'img' : 'presentation'}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      <defs>
        <linearGradient id="nexo-primary-grad" x1="0" y1="0" x2="1" y2="1">
          {/* En fondos oscuros (tu UI usa primary-700/600), el logo debe contrastar */}
          <stop offset="0%" stopColor="#F0F5F0" />
          <stop offset="100%" stopColor="#D4E8D1" />
        </linearGradient>
      </defs>

      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Conexión */}
        <path
          d="M175 265 L270 235 L335 310"
          stroke="#0060AC"
          strokeWidth="26"
        />

        {/* Nodos (primary gradient) */}
        <circle cx="175" cy="265" r="72" fill="url(#nexo-primary-grad)" stroke="#F7FAF9" strokeWidth="10" />
        <circle cx="270" cy="235" r="60" fill="url(#nexo-primary-grad)" stroke="#F7FAF9" strokeWidth="10" />
        <circle cx="335" cy="310" r="72" fill="url(#nexo-primary-grad)" stroke="#F7FAF9" strokeWidth="10" />

        {/* Highlights suaves (look consistente con tu UI “glass/soft”) */}
        <circle cx="200" cy="240" r="18" fill="#FFFFFF" opacity="0.18" />
        <circle cx="295" cy="210" r="14" fill="#FFFFFF" opacity="0.16" />
        <circle cx="360" cy="285" r="18" fill="#FFFFFF" opacity="0.16" />
      </g>
    </svg>
  );
}

