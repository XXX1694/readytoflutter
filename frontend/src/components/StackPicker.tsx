import { useTopics } from '../lib/queries';
import { usePrefs } from '../store/prefs';
import { useLang } from '../i18n/LangContext';
import { useT, type UICopy } from '../i18n/ui';
import { useHomeCopy } from '../i18n/homePage';
import { List, ListRow } from '../ui/index';
import { filterTopicsByPlatform, PLATFORMS } from '../lib/platform';
import { track } from '../lib/analytics';

import type { PlatformKey } from '../types/domain';

// One-time onboarding gate. Kept byte-identical to the key the removed
// StackPickerDialog wrote, so a user who already chose a stack in the modal
// is never asked again.
export const STACK_PICKER_KEY = 'rtf:stackpicker:v1';

// The three stacks that carry a roadmap. KMP and the mobile-wide topics are
// reachable through "Browse everything" and the header's stack menu; putting
// six targets here would make the first screen a settings panel.
const CHOICES: PlatformKey[] = ['flutter', 'ios', 'android'];

const copy = (t: UICopy, key: string): string => {
  const value = t[key as keyof UICopy];
  return typeof value === 'string' ? value : '';
};

export interface StackPickerProps {
  /** Called after a choice so Today can drop the picker without a reload. */
  onPicked: () => void;
}

/**
 * The first question the app asks, asked in place. It used to be a modal over
 * the dashboard 500ms after first paint; it is three ruled rows at the top of
 * Today now — one promise, three targets, one way out.
 */
export default function StackPicker({ onPicked }: StackPickerProps) {
  const { lang } = useLang();
  const t = useT(lang);
  const c = useHomeCopy(lang);
  const setPlatform = usePrefs((s) => s.setPlatform);
  const { data: topics = [] } = useTopics();

  const choose = (key: PlatformKey): void => {
    // The one event that says which half of the catalogue matters to this
    // person — nothing else reports the mix.
    track('stack_selected', { stack: key, source: 'onboarding' });
    setPlatform(key);
    try {
      localStorage.setItem(STACK_PICKER_KEY, '1');
    } catch {
      /* private mode / quota — the picker just comes back next visit */
    }
    onPicked();
  };

  return (
    <section className="mb-10 sm:mb-14" aria-label={c.pickStack}>
      <p className="max-w-xl text-[17px] leading-relaxed text-ink-2">{c.promise}</p>

      <List className="mt-6">
        {CHOICES.map((key) => {
          const meta = PLATFORMS.find((p) => p.key === key);
          const count = filterTopicsByPlatform(topics, key).length;
          return (
            <ListRow
              key={key}
              className="min-h-[60px]"
              onClick={() => choose(key)}
              title={<span className="text-[17px]">{meta ? copy(t, meta.labelKey) : key}</span>}
              trailing={count > 0 ? t.topicCount(count) : undefined}
            />
          );
        })}
      </List>

      <button
        type="button"
        onClick={() => choose('all')}
        className="mt-4 rounded-sm text-[13px] text-brand hover:underline"
      >
        {c.browseEverything}
      </button>
    </section>
  );
}
