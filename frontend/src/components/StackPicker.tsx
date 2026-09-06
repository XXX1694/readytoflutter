import { ArrowRight } from 'lucide-react';
import { useLang } from '../i18n/LangContext';
import { useT } from '../i18n/ui';
import { useHomeCopy } from '../i18n/homePage';
import { Section } from '../ui/Section';
import { StackTile } from '../lib/stackIcons';
import { useChooseStack, useStackOptions } from '../lib/useStack';

import type { PlatformKey } from '../types/domain';

// One-time onboarding gate. Kept byte-identical to the key the removed
// StackPickerDialog wrote, so a user who already chose a stack in the modal
// is never asked again.
export const STACK_PICKER_KEY = 'rtf:stackpicker:v1';

// The three stacks that carry a roadmap. KMP and the mobile-wide topics are
// reachable through "Browse everything" and the stack list; putting six
// targets here would make the first screen a settings panel.
const CHOICES: PlatformKey[] = ['flutter', 'ios', 'android'];

export interface StackPickerProps {
  /** Called after a choice so Today can drop the picker without a reload. */
  onPicked: () => void;
}

/**
 * The first question the app asks, asked in place: three cards, each the
 * stack's mark on its own colour, its name, what it covers and how many
 * topics that is. Choosing one paints the app in that colour.
 */
export default function StackPicker({ onPicked }: StackPickerProps) {
  const { lang } = useLang();
  const t = useT(lang);
  const c = useHomeCopy(lang);
  const options = useStackOptions();
  const chooseStack = useChooseStack('onboarding');

  const choose = (key: PlatformKey): void => {
    chooseStack(key);
    try {
      localStorage.setItem(STACK_PICKER_KEY, '1');
    } catch {
      /* private mode / quota — the picker just comes back next visit */
    }
    onPicked();
  };

  return (
    // The heading is the page's second one — the hero above it already made
    // the promise, so this block only has to ask the question.
    <Section title={c.pickStack} subtitle={c.stackDesc} className="mb-8 sm:mb-12">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {CHOICES.map((key) => {
          const o = options.find((x) => x.key === key);
          if (!o) return null;
          return (
            <button
              key={key}
              type="button"
              onClick={() => choose(key)}
              className="codex-card pressable pressable-lg group flex items-start gap-4 p-4 text-left hover:border-brand/40 sm:flex-col sm:gap-5 sm:p-5"
            >
              <StackTile stack={key} size="xl" />
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[18px] font-bold leading-tight text-ink">{o.label}</span>
                <span className="mt-1 block text-[13px] leading-snug text-muted">{o.desc}</span>
                <span className="mt-2.5 inline-flex items-center gap-1 text-[12.5px] font-medium text-muted-2 transition-colors group-hover:text-brand">
                  {o.count > 0 && t.stackPickerCount(o.count)}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => choose('all')}
        className="mt-4 rounded-sm text-[13px] font-medium text-brand hover:underline"
      >
        {c.browseEverything}
      </button>
    </Section>
  );
}
