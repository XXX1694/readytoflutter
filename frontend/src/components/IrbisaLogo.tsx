import React from 'react';

interface IrbisaLogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  className?: string;
  size?: number;
}

/**
 * Irbisa Logo — High-definition Snow Leopard emblem.
 * Features the obsidian & neon ice-blue mascot.
 */
export function IrbisaLogo({ className = 'h-6 w-6', size, alt = 'Irbisa', ...props }: IrbisaLogoProps) {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const src = `${base}/irbisa-logo.png`;

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-[7px] object-cover select-none shadow-sm ${className}`}
      loading="eager"
      decoding="async"
      {...props}
    />
  );
}
