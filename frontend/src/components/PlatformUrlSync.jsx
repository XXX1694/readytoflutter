import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePrefs } from '../store/prefs.js';
import { PLATFORM_KEYS } from '../lib/platform.js';

// Bidirectional sync: ?stack=ios <-> prefs.platform.
//
// Deep link (`/?stack=android`) on first load → adopt the URL into prefs.
// After that prefs is the source of truth and we mirror it back. We do NOT
// react to subsequent URL changes — those would race with our own writes.
// 'all' stays out of the URL so bare links remain clean.

export default function PlatformUrlSync() {
  const platform = usePrefs((s) => s.platform);
  const [searchParams, setSearchParams] = useSearchParams();
  const urlStack = searchParams.get('stack');
  const hydrated = useRef(false);

  // Synchronous one-shot URL → prefs hydration. Done in render (not effect)
  // so the prefs→URL effect below sees the freshly-applied platform via
  // getState() — otherwise the stale closure would write the old platform
  // back to the URL on first paint.
  if (!hydrated.current) {
    hydrated.current = true;
    if (urlStack && PLATFORM_KEYS.includes(urlStack) && urlStack !== platform) {
      usePrefs.setState({ platform: urlStack });
    }
  }

  // prefs → URL.
  useEffect(() => {
    const fresh = usePrefs.getState().platform;
    const desired = fresh === 'all' ? null : fresh;
    if (urlStack === desired) return;
    const next = new URLSearchParams(searchParams);
    if (desired) next.set('stack', desired);
    else next.delete('stack');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform]);

  return null;
}
