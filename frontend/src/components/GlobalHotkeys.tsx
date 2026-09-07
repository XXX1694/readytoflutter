import { useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import { usePrefs } from '../store/prefs';

/**
 * NOTE ON HOTKEY STRINGS: react-hotkeys-hook v5 matches against
 * `event.code` (normalised), not the printed character, so punctuation must
 * be spelled by its code name — `mod+slash`, not `mod+/`. Written the other
 * way the binding silently never fires.
 *
 * Global keyboard shortcuts. This file is tiny so it stays in the entry
 * chunk and lights up the shortcuts immediately.
 */
export default function GlobalHotkeys() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const toggleTheme = usePrefs((s) => s.toggleTheme);
  const toggleRecallMode = usePrefs((s) => s.toggleRecallMode);

  // ⌘K, ⌘/ and a bare `/` all open search — the page, not a palette. On a
  // bank of six hundred questions the thing people reach for is a question,
  // and every command the palette used to carry (stack, theme, language,
  // account, reset) has a visible control of its own.
  const openSearch = (): void => {
    if (pathname === '/search') document.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
    else navigate('/search');
  };
  useHotkeys('mod+k', (e: KeyboardEvent) => { e.preventDefault(); openSearch(); }, { enableOnFormTags: true });
  useHotkeys('mod+slash', (e: KeyboardEvent) => { e.preventDefault(); openSearch(); }, { enableOnFormTags: true });
  // Skipped while typing so a slash still types a slash.
  useHotkeys('slash', (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    const tag = (target?.tagName || '').toLowerCase();
    if (['input', 'textarea', 'select'].includes(tag) || target?.isContentEditable) return;
    e.preventDefault();
    openSearch();
  });
  useHotkeys('mod+s', (e: KeyboardEvent) => { e.preventDefault(); navigate('/study'); }, { enableOnFormTags: true });
  useHotkeys('mod+m', (e: KeyboardEvent) => { e.preventDefault(); navigate('/mock'); }, { enableOnFormTags: true });
  useHotkeys('mod+b', (e: KeyboardEvent) => { e.preventDefault(); navigate('/bookmarks'); }, { enableOnFormTags: true });
  // ⌘E → /admin is dev-only (the editor itself is gated in App.tsx).
  // Registered unconditionally so the hook order stays stable across builds;
  // the handler is the no-op gate.
  useHotkeys('mod+e', (e: KeyboardEvent) => {
    if (!import.meta.env.DEV) return;
    e.preventDefault();
    navigate('/admin');
  }, { enableOnFormTags: true });
  useHotkeys('mod+comma', (e: KeyboardEvent) => { e.preventDefault(); navigate('/settings'); }, { enableOnFormTags: true });

  // Vim-style "go" prefix: press `g` then a letter within ~1.2s for navigation.
  // Skipped while typing. Matches GitHub/Linear.
  const goPending = useRef(0);
  const isTyping = (e: KeyboardEvent): boolean => {
    const target = e.target as HTMLElement | null;
    const tag = (target?.tagName || '').toLowerCase();
    return ['input', 'textarea', 'select'].includes(tag) || !!target?.isContentEditable;
  };
  const armGo = (e: KeyboardEvent): void => {
    if (isTyping(e)) return;
    e.preventDefault();
    goPending.current = Date.now();
  };
  const consumeGo = (e: KeyboardEvent, to: string): boolean => {
    if (isTyping(e)) return false;
    if (Date.now() - goPending.current >= 1200) return false;
    e.preventDefault();
    goPending.current = 0;
    navigate(to);
    return true;
  };
  useHotkeys('g', armGo, { preventDefault: false });
  useHotkeys('h', (e: KeyboardEvent) => consumeGo(e, '/'));
  useHotkeys('s', (e: KeyboardEvent) => { if (!consumeGo(e, '/search')) { /* fallthrough */ } });
  useHotkeys('y', (e: KeyboardEvent) => consumeGo(e, '/study'));
  useHotkeys('m', (e: KeyboardEvent) => consumeGo(e, '/mock'));
  useHotkeys('k', (e: KeyboardEvent) => consumeGo(e, '/knowledge'));
  useHotkeys('b', (e: KeyboardEvent) => consumeGo(e, '/bookmarks'));
  useHotkeys('t', (e: KeyboardEvent) => {
    if (consumeGo(e, '/topics')) return;
    if (isTyping(e)) return;
    e.preventDefault();
    toggleTheme();
  });
  useHotkeys('p', (e: KeyboardEvent) => consumeGo(e, '/stats'));
  useHotkeys('a', (e: KeyboardEvent) => consumeGo(e, '/settings'));
  useHotkeys('r', (e: KeyboardEvent) => {
    if (consumeGo(e, '/roadmap')) return;
    if (isTyping(e)) return;
    e.preventDefault();
    toggleRecallMode();
  });

  return null;
}
