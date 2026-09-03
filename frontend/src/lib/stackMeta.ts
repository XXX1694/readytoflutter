import type { CSSProperties } from 'react';
import type { PlatformKey } from '../types/domain';

/**
 * The stack colours as classes and styles, kept out of stackIcons.tsx so that
 * file exports components only and Fast Refresh keeps working (the same split
 * as ui/variants.ts). The colours themselves are the `--stack-*` tokens in
 * index.css.
 */

/** The stack's own colour, as a Tailwind text class (for a mark set in it). */
export const STACK_TEXT: Record<PlatformKey, string> = {
  flutter: 'text-stack-flutter',
  ios: 'text-stack-ios',
  android: 'text-stack-android',
  cross: 'text-stack-cross',
  mobile: 'text-stack-mobile',
  all: 'text-stack-all',
};

/** The stack's colour as the custom property the `.stack-tile` class reads. */
export const stackTileStyle = (key: PlatformKey): CSSProperties =>
  ({ '--tile': `var(--stack-${key})` } as CSSProperties);
