/**
 * Lightweight haptic feedback wrapper.
 *
 * iOS Safari ignores `navigator.vibrate` (Apple has never shipped it).
 * Android Chrome / Samsung Internet honour it. We still call it on every
 * platform — the no-op cost on iOS is zero, and the moment Apple opts in
 * (or the user runs the PWA on a desktop with a haptic engine via the
 * Vibration API spec), the calls light up automatically.
 *
 * Patterns are kept short — over ~30ms feels like a buzz, not a tap.
 */
const supported = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

const safe = (ms) => {
  if (!supported) return;
  try { navigator.vibrate(ms); } catch { /* no-op */ }
};

// Selection-style — used for nav switches, toggle taps, segmented controls.
export const tapLight = () => safe(8);
// Confirmation — used for committed actions like rating a card.
export const tapMedium = () => safe(14);
// Negative — used for error states / undo.
export const tapError = () => safe([12, 40, 12]);
// Success — used for goal completions / streak ticks.
export const tapSuccess = () => safe([10, 30, 18]);
