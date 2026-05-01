import { useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import MobileHeader from './MobileHeader.jsx';
import GlobalHotkeys from './GlobalHotkeys.jsx';
import LazyOverlays from './LazyOverlays.jsx';
import PlatformUrlSync from './PlatformUrlSync.jsx';
import BottomNav from './BottomNav.jsx';
import RouteTransition from './RouteTransition.jsx';
import { usePrefs } from '../store/prefs.js';

export default function Layout() {
  const theme = usePrefs((s) => s.theme);
  const bottomNavRef = useRef(null);

  // Publish the BottomNav's actual rendered height as a CSS custom property
  // so sticky/CTA panels on individual pages can dock right above it without
  // hard-coding a magic 56/64 value. ResizeObserver keeps it in sync if the
  // user adds a tab on rotation, etc.
  useEffect(() => {
    const set = (h) => {
      document.documentElement.style.setProperty('--bottom-nav-h', `${Math.round(h)}px`);
    };
    const el = bottomNavRef.current;
    if (!el) { set(0); return; }
    const update = () => {
      const r = el.getBoundingClientRect();
      // When the nav is hidden by a flow route, height collapses to 0 — that
      // is the right value to publish so sticky CTAs sit at the safe-area
      // edge instead of leaving a 56px hole.
      set(r.height);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  });

  return (
    // Use dynamic viewport units (`100dvh`) so the iOS browser chrome /
    // virtual keyboard correctly shrink the visible area. `h-screen` bakes in
    // the larger `100vh` (max chrome) which clips the bottom of inputs when
    // the keyboard pops up. `min-h-dvh` lets layout grow if a child is huge
    // while still resizing with the keyboard.
    <div className="flex min-h-dvh h-dvh overflow-hidden bg-page text-ink">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Desktop header — sticky in flow at lg+ */}
        <Header />
        {/* Mobile header — fixed overlay under lg, hides on scroll-down */}
        <MobileHeader />
        <main className="mobile-header-spacer flex-1 overflow-y-auto overscroll-contain">
          <RouteTransition>
            <Outlet />
          </RouteTransition>
        </main>
        <div ref={bottomNavRef}>
          <BottomNav />
        </div>
      </div>

      <PlatformUrlSync />
      {/* Global keyboard shortcuts (mod+K, vim go-prefix, etc.) live in a
          tiny eager file so they fire even before the lazy palette chunk
          downloads. The actual UI overlays are gated and lazy. */}
      <GlobalHotkeys />
      <LazyOverlays />
      <Toaster
        theme={theme === 'dark' ? 'dark' : 'light'}
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast:
              '!font-sans !text-sm !rounded-2xl !border !border-rule/12 !bg-paper-2/90 !backdrop-blur-xl !text-ink !shadow-[0_4px_8px_-2px_rgb(var(--shadow)/0.10),0_16px_40px_-8px_rgb(var(--shadow)/0.18)]',
            description: '!text-ink-2',
          },
        }}
      />
    </div>
  );
}
