import { useEffect, useState } from 'react';

/**
 * Watches scroll direction on a target element and returns 'up' | 'down' | null.
 * Used by the mobile header to auto-hide on scroll-down and re-appear on
 * scroll-up — same pattern Twitter / Instagram use.
 *
 * `getTarget` runs lazily so callers can pass a selector that resolves *after*
 * mount (e.g. `() => document.querySelector('main')`).
 *
 * `threshold` is the minimum delta in px before we change direction; small
 * jitter (rubber-banding on iOS, 1-2px scroll wheel ticks) shouldn't toggle.
 *
 * `topGuard` keeps the bar visible whenever the user is near the top — feels
 * jarring otherwise.
 */
export function useScrollDirection(getTarget, { threshold = 8, topGuard = 32 } = {}) {
  const [direction, setDirection] = useState(null);
  const [atTop, setAtTop] = useState(true);

  useEffect(() => {
    const target = typeof getTarget === 'function' ? getTarget() : getTarget;
    if (!target) return;
    let last = target.scrollTop;
    let ticking = false;

    const update = () => {
      const y = target.scrollTop;
      const delta = y - last;
      const passedTop = y > topGuard;
      if (Math.abs(delta) >= threshold) {
        setDirection(delta > 0 ? 'down' : 'up');
        last = y;
      }
      setAtTop(!passedTop);
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    target.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => target.removeEventListener('scroll', onScroll);
  }, [getTarget, threshold, topGuard]);

  return { direction, atTop };
}
