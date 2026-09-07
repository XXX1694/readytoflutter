import { useLang } from '../i18n/LangContext';
import { useT } from '../i18n/ui';
import { useHomeCopy } from '../i18n/homePage';
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
 * The first question the app asks, asked in the plan card's place: three
 * ruled rows, each the stack's mark on its own colour, its name, what it
 * covers and how many topics that is. A list, not three cards (DESIGN.md
 * rule 11) — the only colour in the row is the tile, and choosing one paints
 * the card that takes this spot.
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
    <div>
      <h2 className="font-display text-[17px] font-semibold leading-tight text-ink">{c.pickStack}</h2>
      <p className="mt-1 text-[13px] text-muted">{c.stackDesc}</p>
      <ul aria-label={c.pickStack} className="mt-3 divide-y divide-rule/10 border-y border-rule/12">
        {CHOICES.map((key) => {
          const o = options.find((x) => x.key === key);
          if (!o) return null;
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => choose(key)}
                className="pressable pressable-lg flex min-h-[72px] w-full items-center gap-4 rounded-lg px-2 py-3 text-left hover:bg-brand/[0.05] active:bg-brand/[0.08]"
              >
                <StackTile stack={key} size="lg" />
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-[17px] font-semibold leading-tight text-ink">{o.label}</span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-muted">{o.desc}</span>
                </span>
                {o.count > 0 && (
                  <span className="num shrink-0 text-[13px] font-normal text-muted-2">{t.stackPickerCount(o.count)}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => choose('all')}
        className="mt-3 inline-flex min-h-[44px] items-center rounded-sm text-[13px] font-medium text-brand hover:underline"
      >
        {c.browseEverything}
      </button>
    </div>
  );
}
