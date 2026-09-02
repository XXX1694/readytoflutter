import type { NavigateFunction } from 'react-router-dom';

/**
 * Back to the previous in-app page, or to Today when there is none. A session
 * opened from a PWA shortcut, a push notification, a bookmark or a fresh tab
 * has no in-app history: `navigate(-1)` there leaves the app (or lands on
 * `about:blank`). react-router numbers its own entries in `history.state.idx`,
 * so 0 means "this tab started here". `history.length` cannot tell: it also
 * counts whatever site the tab was on before.
 */
export const goBack = (navigate: NavigateFunction): void => {
  const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
  if (idx > 0) navigate(-1);
  else navigate('/', { replace: true });
};
