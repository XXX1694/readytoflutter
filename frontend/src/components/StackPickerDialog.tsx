import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useLang } from '../i18n/LangContext';
import { useT, type UICopy } from '../i18n/ui';
import { useTopics } from '../lib/queries';
import { usePrefs } from '../store/prefs';
import { PLATFORMS, topicPlatform } from '../lib/platform';
import { Button, Eyebrow } from '../ui/index';
import { track } from '../lib/analytics';
import type { PlatformKey } from '../types/domain';

// One-time onboarding gate. Independent from the welcome tour gate so that
// existing users (who already saw the tour) still see this picker once.
const STORAGE_KEY = 'rtf:stackpicker:v1';

// PLATFORMS declares its copy keys as plain strings; every one of them
// resolves to a string entry of the copy table.
const platformCopy = (t: UICopy, key: string): string => t[key as keyof UICopy] as string;

export default function StackPickerDialog() {
  const { lang } = useLang();
  const t = useT(lang);
  const platform = usePrefs((s) => s.platform);
  const setPlatform = usePrefs((s) => s.setPlatform);
  const { data: topics = [] } = useTopics();
  const [open, setOpen] = useState(false);

  // Decide whether to show the dialog. Skip if the user has already chosen a
  // specific stack (we treat that as "they know about the feature") or has
  // dismissed the picker before.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    if (platform && platform !== 'all') {
      try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* quota */ }
      return;
    }
    // Slight delay so the dialog doesn't compete with the first paint.
    const id = setTimeout(() => setOpen(true), 500);
    return () => clearTimeout(id);
  }, [platform]);

  const persist = () => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* quota */ }
  };

  const choose = (key: PlatformKey) => {
    // The first question the app asks, and the one that decides which half of
    // the catalogue matters to this person. Nothing else reports the mix.
    track('stack_selected', { stack: key, source: 'onboarding' });
    setPlatform(key);
    persist();
    setOpen(false);
  };

  const skip = () => {
    persist();
    setOpen(false);
  };

  // Per-platform topic counts so each row shows its own size.
  const countsByPlatform = topics.reduce<Partial<Record<PlatformKey, number>>>((acc, topic) => {
    const key = topicPlatform(topic);
    acc[key] = (acc[key] || 0) + 1;
    acc.all = (acc.all || 0) + 1;
    return acc;
  }, {});

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) skip(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 outline-none data-[state=open]:animate-slide-up">
          <div className="overflow-hidden rounded-xl border border-rule/12 bg-paper-2 shadow-codex-lg">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-rule/12 px-5 py-3">
              <Eyebrow>{t.stackPickerEyebrow}</Eyebrow>
              <button
                type="button"
                onClick={skip}
                aria-label={t.stackPickerLater}
                className="text-muted hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-5 sm:px-6 sm:py-6">
              <Dialog.Title asChild>
                <h2 className="font-display text-2xl font-medium leading-tight text-ink sm:text-3xl">
                  {t.stackPickerTitle}
                </h2>
              </Dialog.Title>
              <Dialog.Description asChild>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-2">
                  {t.stackPickerSubtitle}
                </p>
              </Dialog.Description>

              <ul className="mt-5 space-y-2">
                {PLATFORMS.map((p) => (
                  <li key={p.key}>
                    <button
                      type="button"
                      onClick={() => choose(p.key)}
                      className="block w-full rounded-lg border border-rule/12 bg-paper p-3 text-left transition-colors hover:border-rule/30"
                    >
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="font-display text-base font-medium text-ink">
                          {platformCopy(t, p.labelKey)}
                        </span>
                        <span className="shrink-0 text-[12px] text-muted">
                          {t.stackPickerCount(countsByPlatform[p.key] || 0)}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-[13px] leading-relaxed text-ink-2">
                        {platformCopy(t, p.descKey)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end border-t border-rule/12 px-5 py-3">
              <Button variant="ghost" size="sm" onClick={skip}>
                {t.stackPickerLater}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
