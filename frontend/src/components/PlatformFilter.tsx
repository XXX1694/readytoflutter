import { useLang } from '../i18n/LangContext';
import { useT, type UICopy } from '../i18n/ui';
import { usePrefs } from '../store/prefs';
import { PLATFORMS } from '../lib/platform';
import { Eyebrow } from '../ui/index';
import { cn } from '../lib/cn';

export interface PlatformFilterProps {
  className?: string;
  hideLabel?: boolean;
}

// PLATFORMS declares its copy keys as plain strings; every one of them
// resolves to a string entry of the copy table.
const platformCopy = (t: UICopy, key: string): string => t[key as keyof UICopy] as string;

export default function PlatformFilter({ className, hideLabel = false }: PlatformFilterProps) {
  const { lang } = useLang();
  const t = useT(lang);
  const platform = usePrefs((s) => s.platform);
  const setPlatform = usePrefs((s) => s.setPlatform);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {!hideLabel && <Eyebrow>{t.platformLabel}</Eyebrow>}
      {/* Horizontal scroll on narrow screens so every stack stays reachable
          without forcing a wrap. These are filter toggles, not tabs — no
          tabpanel exists to own, so they announce as pressed buttons. */}
      <div
        role="group"
        aria-label={t.platformLabel}
        className="-mx-1 flex flex-wrap gap-1 overflow-x-auto px-1 sm:flex-nowrap"
      >
        {PLATFORMS.map((p) => {
          const active = platform === p.key;
          return (
            <button
              key={p.key}
              type="button"
              aria-pressed={active}
              onClick={() => setPlatform(p.key)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-[13px] font-medium transition-colors',
                active
                  ? 'border-ink bg-ink text-paper'
                  : 'border-rule/12 bg-paper-2 text-ink-2 hover:border-rule/25 hover:text-ink',
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', p.dot)} aria-hidden />
              {platformCopy(t, p.labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
