import { useEffect, useRef, useState } from 'react';

/**
 * Pull-to-refresh on a scroll container. Returns:
 *  - `pull`   — current pull distance in px (use this to drive the spinner)
 *  - `state`  — 'idle' | 'pulling' | 'ready' | 'refreshing'
 *
 * Activates only when the container is at scrollTop=0 AND the user starts a
 * downward gesture. Once they pass `threshold`, releasing fires `onRefresh`
 * (which should return a promise — we hold 'refreshing' until it settles).
 *
 * Skipped on desktop (no touch). Use the `enabled` flag to disable per-route.
 */
export function usePullToRefresh(getTarget, { threshold = 64, max = 96, onRefresh, enabled = true } = {}) {
  const [pull, setPull] = useState(0);
  const [state, setState] = useState('idle');
  const startRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;
    const target = typeof getTarget === 'function' ? getTarget() : getTarget;
    if (!target) return;

    // Only attach on coarse pointers (touch). Mouse-drag pull-to-refresh is
    // a confusing affordance.
    const coarse = window.matchMedia?.('(pointer: coarse)').matches;
    if (!coarse) return;

    const onTouchStart = (e) => {
      if (target.scrollTop > 0) return;
      const t = e.touches[0];
      startRef.current = { y: t.clientY, captured: false };
    };

    const onTouchMove = (e) => {
      const s = startRef.current;
      if (!s) return;
      if (target.scrollTop > 0) {
        startRef.current = null;
        setPull(0);
        setState('idle');
        return;
      }
      const t = e.touches[0];
      const dy = t.clientY - s.y;
      if (dy <= 0) return;
      // Capture the gesture once we're sure it's a downward pull from the top.
      if (!s.captured && dy > 6) s.captured = true;
      if (!s.captured) return;
      // Resistance curve so the bar feels rubbery instead of linear.
      const resisted = Math.min(max, dy * 0.55);
      setPull(resisted);
      setState(resisted >= threshold ? 'ready' : 'pulling');
    };

    const onTouchEnd = async () => {
      const s = startRef.current;
      startRef.current = null;
      if (!s?.captured) {
        setPull(0);
        setState('idle');
        return;
      }
      if (state === 'ready' && onRefresh) {
        setState('refreshing');
        setPull(threshold);
        try { await onRefresh(); } finally {
          setPull(0);
          setState('idle');
        }
      } else {
        setPull(0);
        setState('idle');
      }
    };

    target.addEventListener('touchstart', onTouchStart, { passive: true });
    target.addEventListener('touchmove', onTouchMove, { passive: true });
    target.addEventListener('touchend', onTouchEnd);
    target.addEventListener('touchcancel', onTouchEnd);
    return () => {
      target.removeEventListener('touchstart', onTouchStart);
      target.removeEventListener('touchmove', onTouchMove);
      target.removeEventListener('touchend', onTouchEnd);
      target.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [getTarget, threshold, max, onRefresh, enabled, state]);

  return { pull, state };
}
