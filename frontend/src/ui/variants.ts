import { cva, type VariantProps } from 'class-variance-authority';

import type { Level, Difficulty, ProgressStatus } from '../types/domain';

/**
 * Class definitions for Button and Pill, kept out of the component files so
 * those export components only and Fast Refresh keeps working.
 */

/**
 * Button — the primary action is a flat fill in the active stack's colour
 * (`--brand`), so "Start session" is Flutter blue for a Flutter reader and
 * Swift orange for an iOS one. No gradient, no glow; elevation is the 1px
 * `shadow-codex-sm` contact line.
 *
 * Focus is deliberately not styled here: the global `:focus-visible` rule in
 * index.css draws the ring on every control, and a local override would give
 * buttons a different focus state from the rest of the UI.
 */

/** The one filled treatment. Shared so `codex` and `brand` can't drift apart. */
const solid = ['bg-brand text-on-brand rounded-md shadow-codex-sm', 'hover:bg-brand/90 active:bg-brand/80'];

export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 select-none whitespace-nowrap',
    'font-medium leading-none',
    'transition-colors duration-150 ease-out',
    'disabled:opacity-50 disabled:pointer-events-none',
  ],
  {
    variants: {
      variant: {
        codex: solid,
        // `brand` used to be a petrol gradient fill. A petrol button and an ink
        // button on the same page are two near-blacks competing for the same
        // job, so the primary action is ink and the name is kept as its alias.
        brand: solid,
        // On a brand-filled surface (the Today card): the fill and the text
        // swap places.
        inverse: ['bg-on-brand text-brand rounded-md shadow-codex', 'hover:bg-on-brand/90 active:bg-on-brand/80'],
        outline: [
          'bg-paper-2 text-ink rounded-md border border-rule/12 shadow-codex-sm',
          'hover:border-rule/22',
        ],
        ghost: ['bg-transparent text-ink-2 rounded-md', 'hover:bg-rule/8 hover:text-ink'],
        link: ['bg-transparent text-brand underline-offset-4 hover:underline rounded-sm p-0'],
      },
      size: {
        xs: 'h-7 px-2.5 text-xs',
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-[15px]',
        icon: 'h-9 w-9 p-0',
        'icon-sm': 'h-7 w-7 p-0',
      },
    },
    defaultVariants: {
      variant: 'codex',
      size: 'md',
    },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;

/**
 * Pill — a tinted chip: background wash plus matching text, no border. Set in
 * the grotesk at sentence case; the mono small-caps treatment it used to carry
 * is the house tell DESIGN.md rule 2 exists to remove.
 *
 * Alphas mirror the `.level-badge-*` / `.diff-*` classes in index.css so a
 * chip rendered by this component and one rendered by those utilities match.
 */
export const pillVariants = cva(
  [
    'inline-flex items-center gap-1 font-medium',
    'whitespace-nowrap select-none',
    'transition-colors duration-150',
  ],
  {
    variants: {
      tone: {
        neutral: 'bg-rule/8 text-ink-2',
        brand:   'bg-brand/8 text-brand',
        mint:    'bg-mint/10 text-mint',
        amber:   'bg-amber/12 text-[rgb(var(--amber))]',
        coral:   'bg-coral/10 text-coral',
        plum:    'bg-plum/10 text-plum',
        // The one solid chip, for a count or flag that has to carry weight.
        ink:     'bg-ink text-paper',
        // Solid in the stack colour — a "current" marker.
        solid:   'bg-brand text-on-brand',
        ghost:   'bg-transparent text-muted',
      },
      size: {
        xs: 'h-5 px-1.5 text-[11px]',
        sm: 'h-6 px-2 text-[12px]',
        md: 'h-7 px-2.5 text-[13px]',
      },
      shape: {
        square: 'rounded',
        rounded: 'rounded-full',
        full: 'rounded-full',
      },
    },
    defaultVariants: {
      tone: 'neutral',
      size: 'sm',
      shape: 'rounded',
    },
  },
);

export type PillVariantProps = VariantProps<typeof pillVariants>;
export type PillTone = NonNullable<PillVariantProps['tone']>;

// Convenience helpers — semantic mapping for level + difficulty
export const levelTone: Record<Level, PillTone> = {
  junior: 'brand',
  mid: 'plum',
  // Senior was a solid ink chip; a level is not an alert, so it reads as the
  // same neutral wash `.level-badge-senior` uses.
  senior: 'neutral',
};

export const difficultyTone: Record<Difficulty, PillTone> = {
  easy: 'mint',
  medium: 'amber',
  hard: 'coral',
};

export const statusTone: Record<ProgressStatus, PillTone> = {
  not_started: 'ghost',
  in_progress: 'amber',
  completed: 'mint',
};
