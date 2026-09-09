import type { SVGProps } from 'react';

export interface IrbisaLogoProps extends SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
  variant?: 'mark' | 'badge';
  theme?: 'auto' | 'light' | 'dark';
}

/**
 * Irbisa Logo — Precision geometric Snow Leopard emblem.
 *
 * Supports:
 * - 'auto': Dynamically tracks light/dark theme via text-ink (dark ink on paper in light mode, crisp white in dark mode).
 * - 'light': Forces dark ink mark for light surfaces.
 * - 'dark': Forces crisp white mark for dark surfaces.
 * - 'mark': Transparent vector icon (default).
 * - 'badge': Enclosed in an Apple-style squircle tile.
 */
export function IrbisaLogo({
  className = 'h-6 w-6',
  size,
  variant = 'mark',
  theme = 'auto',
  ...props
}: IrbisaLogoProps) {
  const themeClass =
    theme === 'light'
      ? 'text-[#181714]'
      : theme === 'dark'
        ? 'text-[#F2F1EA]'
        : 'text-ink';

  const badgeBgClass =
    theme === 'light'
      ? 'fill-[#FFFFFF] stroke-[#181714]/12'
      : theme === 'dark'
        ? 'fill-[#0E0E0D] stroke-[#F2F1EA]/12'
        : 'fill-paper-2 stroke-rule/12';

  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={`shrink-0 select-none ${themeClass} ${className}`}
      aria-label="Irbisa"
      role="img"
      {...props}
    >
      {variant === 'badge' && (
        <>
          <rect x="1" y="1" width="38" height="38" rx="9.5" className={badgeBgClass} />
          <rect x="1" y="1" width="38" height="38" rx="9.5" fill="none" className={badgeBgClass} strokeWidth="1" />
        </>
      )}

      {/* Left & Right Ears (wide feline posture with beveled curve) */}
      <path d="M 9 6 C 8 7 7 10 7.5 13 L 13.5 10 Z" fill="currentColor" opacity="0.92" />
      <path d="M 31 6 C 32 7 33 10 32.5 13 L 26.5 10 Z" fill="currentColor" opacity="0.92" />

      {/* Inner ear facets (colored with brand accent) */}
      <polygon points="9.5,8.5 13,10.2 9,12" fill="rgb(var(--brand))" opacity="0.9" />
      <polygon points="30.5,8.5 27,10.2 31,12" fill="rgb(var(--brand))" opacity="0.9" />

      {/* Forehead Crown */}
      <polygon points="20,8 16,12.5 20,16.5 24,12.5" fill="currentColor" />

      {/* Forehead side facets */}
      <polygon points="15.5,10 8.5,13.5 14,15.5 19.5,13" fill="currentColor" opacity="0.8" />
      <polygon points="24.5,10 31.5,13.5 26,15.5 20.5,13" fill="currentColor" opacity="0.8" />

      {/* Cheeks: Broad feline cheekbones */}
      <polygon points="7,14 13.5,16 9,21.5 5,16" fill="currentColor" opacity="0.86" />
      <polygon points="33,14 26.5,16 31,21.5 35,16" fill="currentColor" opacity="0.86" />
      <polygon points="9,22 14,19 12,25.5 8,24" fill="currentColor" opacity="0.76" />
      <polygon points="31,22 26,19 28,25.5 32,24" fill="currentColor" opacity="0.76" />

      {/* Eyes: Piercing feline almond gems */}
      <polygon points="12.5,16.8 17.5,18 14.5,19.6" fill="rgb(var(--brand))" />
      <polygon points="27.5,16.8 22.5,18 25.5,19.6" fill="rgb(var(--brand))" />

      {/* Nose Bridge / Central Face */}
      <polygon points="20,17 16.5,20 17.5,24.5 20,25.2 22.5,24.5 23.5,20" fill="currentColor" opacity="0.96" />

      {/* Whisker Pads / Snout (Broad feline muzzle) */}
      <polygon points="17,25 12.5,22 13,26.5 16.5,28.5" fill="currentColor" opacity="0.86" />
      <polygon points="23,25 27.5,22 27,26.5 23.5,28.5" fill="currentColor" opacity="0.86" />

      {/* Nose Leather */}
      <polygon points="18,24.8 22,24.8 20,27" fill="currentColor" />

      {/* Chin */}
      <polygon points="17.5,29.2 22.5,29.2 20,33.5" fill="currentColor" />
    </svg>
  );
}
