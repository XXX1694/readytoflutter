import { useMemo } from 'react';
import { useTopics } from './queries';
import { usePrefs } from '../store/prefs';
import { useLang } from '../i18n/LangContext';
import { useT, type UICopy } from '../i18n/ui';
import { PLATFORMS, filterTopicsByPlatform } from './platform';
import { track } from './analytics';

import type { PlatformKey } from '../types/domain';

// `PLATFORMS` stores its i18n keys as plain strings — resolve them against the
// copy table without widening the table to `any`.
const copy = (t: UICopy, key: string): string => {
  const value = t[key as keyof UICopy];
  return typeof value === 'string' ? value : '';
};

export interface StackOption {
  key: PlatformKey;
  label: string;
  desc: string;
  /** Topics in this stack. */
  count: number;
}

/** Every stack with its name, one-line description and topic count. */
export function useStackOptions(): StackOption[] {
  const { lang } = useLang();
  const t = useT(lang);
  const { data: topics = [] } = useTopics();
  return useMemo(
    () => PLATFORMS.map((p) => ({
      key: p.key,
      label: copy(t, p.labelKey),
      desc: copy(t, p.descKey),
      count: p.key === 'all' ? topics.length : filterTopicsByPlatform(topics, p.key).length,
    })),
    [t, topics],
  );
}

/** The current stack's option, for anything that names it. */
export function useCurrentStack(): StackOption {
  const platform = usePrefs((s) => s.platform);
  const options = useStackOptions();
  return options.find((o) => o.key === platform) ?? options[0];
}

/**
 * The one way to change the stack. `source` names the control for analytics
 * — re-picking the active stack is a no-op and sends nothing.
 */
export function useChooseStack(source: string): (key: PlatformKey) => void {
  const platform = usePrefs((s) => s.platform);
  const setPlatform = usePrefs((s) => s.setPlatform);
  return (key) => {
    if (key !== platform) track('stack_selected', { stack: key, source });
    setPlatform(key);
  };
}
