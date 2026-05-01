import { useLang } from '../i18n/LangContext.jsx';
import { useT } from '../i18n/ui.js';
import { usePrefs } from '../store/prefs.js';
import { PLATFORMS } from '../lib/platform.js';
import { Eyebrow } from '../ui/index.js';
import { cn } from '../lib/cn.js';

export default function PlatformFilter({ className, hideLabel = false }) {
  const { lang } = useLang();
  const t = useT(lang);
  const platform = usePrefs((s) => s.platform);
  const setPlatform = usePrefs((s) => s.setPlatform);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {!hideLabel && <Eyebrow>{t.platformLabel}</Eyebrow>}
      {/* Horizontal scroll on narrow screens — keeps every option reachable
          without forcing a wrap. Same brutalist outline + brand-tinted active
          state pattern used by QuestionCard's status segmented control. */}
      <div
        role="tablist"
        aria-label={t.platformLabel}
        className="-mx-1 flex flex-wrap gap-1 overflow-x-auto px-1 sm:flex-nowrap"
      >
        {PLATFORMS.map((p) => {
          const active = platform === p.key;
          return (
            <button
              key={p.key}
              role="tab"
              type="button"
              aria-pressed={active}
              onClick={() => setPlatform(p.key)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
                active
                  ? 'border-ink/70 bg-ink text-paper shadow-codex-sm'
                  : 'border-rule/25 bg-paper-2 text-ink-2 hover:border-rule/45 hover:text-ink',
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', p.dot)} aria-hidden />
              {t[p.labelKey]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
