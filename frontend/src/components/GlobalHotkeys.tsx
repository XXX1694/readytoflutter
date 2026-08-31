import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import { usePrefs } from '../store/prefs';

/**
 * NOTE ON HOTKEY STRINGS: react-hotkeys-hook v5 matches against
 * `event.code` (normalised), not the printed character, so punctuation must
 * be spelled by its code name — `mod+slash`, not `mod+/`. Written the other
 * way the binding silently never fires.
 *
 * Global keyboard shortcuts that need to fire even before the heavy
 * `CommandPalette` chunk has been downloaded. Used to live inside the
 * palette component itself, but mounting the palette eagerly cost ~80kb
 * of cmdk + Radix Dialog in the main bundle. This file is tiny so it
 * stays in the entry chunk and lights up the shortcuts immediately.
 */
export default function GlobalHotkeys() {
  const navigate = useNavigate();
  const open = usePrefs((s) => s.commandOpen);
  const setOpen = usePrefs((s) => s.setCommandOpen);
  const toggleTheme = usePrefs((s) => s.toggleTheme);
  const toggleRecallMode = usePrefs((s) => s.toggleRecallMode);

  useHotkeys('mod+k', (e: KeyboardEvent) => { e.preventDefault(); setOpen(!open); }, { enableOnFormTags: true });
  useHotkeys('mod+slash', (e: KeyboardEvent) => { e.preventDefault(); setOpen(!open); }, { enableOnFormTags: true });
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
  // Skipped while typing or when the palette is open. Matches GitHub/Linear.
  const goPending = useRef(0);
  const isTyping = (e: KeyboardEvent): boolean => {
    const target = e.target as HTMLElement | null;
    const tag = (target?.tagName || '').toLowerCase();
    return ['input', 'textarea', 'select'].includes(tag) || !!target?.isContentEditable;
  };
  const armGo = (e: KeyboardEvent): void => {
    if (isTyping(e) || open) return;
    e.preventDefault();
    goPending.current = Date.now();
  };
  const consumeGo = (e: KeyboardEvent, to: string): boolean => {
    if (isTyping(e) || open) return false;
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
    if (consumeGo(e, '/stats')) return;
    if (isTyping(e) || open) return;
    e.preventDefault();
    toggleTheme();
  });
  useHotkeys('a', (e: KeyboardEvent) => consumeGo(e, '/settings'));
  useHotkeys('r', (e: KeyboardEvent) => {
    if (isTyping(e) || open) return;
    e.preventDefault();
    toggleRecallMode();
  });

  return null;
}
