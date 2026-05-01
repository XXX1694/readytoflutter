import { useRef } from 'react';

/**
 * Pointer-based swipe detector. No external dep — uses native PointerEvents
 * which unify mouse / touch / pen.
 *
 * Returns ref-callbacks the caller can spread onto the target element via
 * `bind = useSwipe({...}); <div {...bind}>`.
 *
 * `onSwipeLeft` / `onSwipeRight` / `onSwipeUp` / `onSwipeDown` fire once per
 * gesture when the displacement crosses `minDistance` AND the dominant axis
 * matches. `velocity` matters too — quick flicks register even if short.
 */
export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  minDistance = 48,
  maxOffAxis = 64,
  edge = null, // 'left' | 'right' — only register if the gesture started near that edge
  edgeWidth = 24,
} = {}) {
  const startRef = useRef(null);

  const onPointerDown = (e) => {
    // Only primary buttons / first touches. Ignore right-click drags.
    if (e.button !== undefined && e.button !== 0) return;
    if (edge === 'left' && e.clientX > edgeWidth) return;
    if (edge === 'right') {
      const w = window.innerWidth;
      if (e.clientX < w - edgeWidth) return;
    }
    startRef.current = {
      x: e.clientX,
      y: e.clientY,
      t: Date.now(),
      pointerId: e.pointerId,
    };
  };

  const onPointerUp = (e) => {
    const start = startRef.current;
    if (!start || start.pointerId !== e.pointerId) return;
    startRef.current = null;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const dt = Math.max(1, Date.now() - start.t);
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    // Velocity in px/ms — anything > 0.5 is a flick even on short distance.
    const flick = Math.max(ax, ay) / dt > 0.5;
    const passed = (axis) => axis >= minDistance || flick;

    if (ax > ay && ay <= maxOffAxis && passed(ax)) {
      if (dx < 0) onSwipeLeft?.(e);
      else onSwipeRight?.(e);
    } else if (ay > ax && ax <= maxOffAxis && passed(ay)) {
      if (dy < 0) onSwipeUp?.(e);
      else onSwipeDown?.(e);
    }
  };

  const onPointerCancel = () => {
    startRef.current = null;
  };

  return {
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    onPointerLeave: onPointerCancel,
  };
}

/**
 * Variant that returns active-drag state (`{ x, dragging }`) so the consumer
 * can render a follow-finger transform during the gesture (drawer drag).
 *
 * `axis` = 'x' | 'y'. On commit, fires `onCommit(direction)` if the drag
 * passed `commitAt` (px). Otherwise springs back via `onCancel`.
 */
export function useDragGesture({
  axis = 'x',
  commitAt = 80,
  onCommit,
  onCancel,
  onMove,
} = {}) {
  const stateRef = useRef({ active: false, startX: 0, startY: 0, pointerId: null });

  const handlePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    stateRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      pointerId: e.pointerId,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e) => {
    const s = stateRef.current;
    if (!s.active || s.pointerId !== e.pointerId) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    onMove?.(axis === 'x' ? dx : dy, { dx, dy });
  };

  const handlePointerUp = (e) => {
    const s = stateRef.current;
    if (!s.active || s.pointerId !== e.pointerId) return;
    stateRef.current = { active: false, startX: 0, startY: 0, pointerId: null };
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    const v = axis === 'x' ? dx : dy;
    if (Math.abs(v) >= commitAt) onCommit?.(v < 0 ? -1 : 1, { dx, dy });
    else onCancel?.({ dx, dy });
  };

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerUp,
  };
}
