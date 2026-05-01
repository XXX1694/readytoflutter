import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Smartphone, X } from 'lucide-react';
import { useLang } from '../i18n/LangContext.jsx';
import { useT } from '../i18n/ui.js';
import { useTopics } from '../lib/queries.js';
import { usePrefs } from '../store/prefs.js';
import { PLATFORMS, topicPlatform } from '../lib/platform.js';
import { Button, Eyebrow } from '../ui/index.js';
import { cn } from '../lib/cn.js';

// One-time onboarding gate. Independent from the welcome tour gate so that
// existing users (who already saw the tour) still see this picker once.
const STORAGE_KEY = 'rtf:stackpicker:v1';

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

  const choose = (key) => {
    setPlatform(key);
    persist();
    setOpen(false);
  };

  const skip = () => {
    persist();
    setOpen(false);
  };

  // Per-platform topic counts so each row shows its own size.
  const countsByPlatform = topics.reduce((acc, topic) => {
    const p = topicPlatform(topic);
    acc[p] = (acc[p] || 0) + 1;
    acc.all = (acc.all || 0) + 1;
    return acc;
  }, {});

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) skip(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 outline-none data-[state=open]:animate-slide-up">
          <div className="overflow-hidden rounded-2xl border border-rule/12 glass shadow-[0_8px_16px_-4px_rgb(var(--shadow)/0.15),0_24px_64px_-12px_rgb(var(--shadow)/0.30)]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-rule/15 px-5 py-3">
              <Eyebrow accent="brand" className="m-0">
                <Smartphone className="mr-1 inline h-3 w-3" />
                {t.stackPickerEyebrow}
              </Eyebrow>
              <Dialog.Title className="sr-only">{t.stackPickerTitle}</Dialog.Title>
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
              <h2 className="font-display text-2xl font-medium leading-tight tracking-tight text-ink sm:text-3xl">
                {t.stackPickerTitle}
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-2">
                {t.stackPickerSubtitle}
              </p>

              <ul className="mt-5 space-y-2">
                {PLATFORMS.map((p) => {
                  const count = countsByPlatform[p.key] || 0;
                  return (
                    <li key={p.key}>
                      <button
                        type="button"
                        onClick={() => choose(p.key)}
                        className={cn(
                          'group flex w-full items-start gap-3 rounded-xl border border-rule/15 bg-paper-2/60 p-3 text-left transition-all duration-200',
                          'hover:-translate-y-px hover:border-rule/40 hover:shadow-codex-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn('mt-1 inline-block h-2 w-2 shrink-0 rounded-full', p.dot)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="font-display text-base font-medium text-ink">
                              {t[p.labelKey]}
                            </span>
                            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-2">
                              {t.stackPickerCount(count)}
                            </span>
                          </span>
                          <span className="mt-0.5 block text-[13px] leading-relaxed text-ink-2">
                            {t[p.descKey]}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end border-t border-rule/15 px-5 py-3">
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
