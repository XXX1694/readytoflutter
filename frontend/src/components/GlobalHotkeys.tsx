import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import { usePrefs } from '../store/prefs';

/**
 * Global keyboard shortcuts that need to fire even before the heavy
 * `CommandPalette` chunk has been downloaded. Used to live inside the
 * palette component itself, but mounting the palette eagerly cost ~80kb
 * of cmdk + Radix Dialog in the main bundle. This file is tiny so it
 * stays in the entry chunk and lights up the shortcuts immediately.
 */
export default function GlobalHotkeys() {
  const navigate = useNavigate();
  const open = usePrefs((s: any) => s.commandOpen);
  const setOpen = usePrefs((s: any) => s.setCommandOpen);
  const toggleTheme = usePrefs((s: any) => s.toggleTheme);
  const toggleRecallMode = usePrefs((s: any) => s.toggleRecallMode);

  useHotkeys('mod+k', (e: any) => { e.preventDefault(); setOpen(!open); }, { enableOnFormTags: true });
  useHotkeys('mod+/', (e: any) => { e.preventDefault(); setOpen(!open); }, { enableOnFormTags: true });
  useHotkeys('mod+s', (e: any) => { e.preventDefault(); navigate('/study'); }, { enableOnFormTags: true });
  useHotkeys('mod+m', (e: any) => { e.preventDefault(); navigate('/mock'); }, { enableOnFormTags: true });
  useHotkeys('mod+b', (e: any) => { e.preventDefault(); navigate('/bookmarks'); }, { enableOnFormTags: true });
  // ⌘E → /admin is dev-only (the editor itself is gated in App.jsx).
  // Registered unconditionally so the hook order stays stable across builds;
  // the handler is the no-op gate.
  useHotkeys('mod+e', (e: any) => {
    if (!import.meta.env.DEV) return;
    e.preventDefault();
    navigate('/admin');
  }, { enableOnFormTags: true });
  useHotkeys('mod+,', (e: any) => { e.preventDefault(); navigate('/settings'); }, { enableOnFormTags: true });

  // Vim-style "go" prefix: press `g` then a letter within ~1.2s for navigation.
  // Skipped while typing or when the palette is open. Matches GitHub/Linear.
  const goPending = useRef(0);
  const isTyping = (e: any) => {
    const tag = (e.target?.tagName || '').toLowerCase();
    return ['input', 'textarea', 'select'].includes(tag) || e.target?.isContentEditable;
  };
  const armGo = (e: any) => {
    if (isTyping(e) || open) return;
    e.preventDefault();
    goPending.current = Date.now();
  };
  const consumeGo = (e: any, to: any) => {
    if (isTyping(e) || open) return false;
    if (Date.now() - goPending.current >= 1200) return false;
    e.preventDefault();
    goPending.current = 0;
    navigate(to);
    return true;
  };
  useHotkeys('g', armGo, { preventDefault: false });
  useHotkeys('h', (e: any) => consumeGo(e, '/'));
  useHotkeys('s', (e: any) => { if (!consumeGo(e, '/search')) { /* fallthrough */ } });
  useHotkeys('y', (e: any) => consumeGo(e, '/study'));
  useHotkeys('m', (e: any) => consumeGo(e, '/mock'));
  useHotkeys('k', (e: any) => consumeGo(e, '/knowledge'));
  useHotkeys('b', (e: any) => consumeGo(e, '/bookmarks'));
  useHotkeys('t', (e: any) => {
    if (consumeGo(e, '/stats')) return;
    if (isTyping(e) || open) return;
    e.preventDefault();
    toggleTheme();
  });
  useHotkeys('a', (e: any) => consumeGo(e, '/settings'));
  useHotkeys('r', (e: any) => {
    if (isTyping(e) || open) return;
    e.preventDefault();
    toggleRecallMode();
  });

  return null;
}
