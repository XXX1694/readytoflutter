import { Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import CommandPalette from './CommandPalette.jsx';
import CommandHint from './CommandHint.jsx';
import ShortcutsOverlay from './ShortcutsOverlay.jsx';
import WelcomeDialog from './WelcomeDialog.jsx';
import BottomNav from './BottomNav.jsx';
import RouteTransition from './RouteTransition.jsx';
import { usePrefs } from '../store/prefs.js';

export default function Layout() {
  const theme = usePrefs((s) => s.theme);

  return (
    // Use dynamic viewport units (`100dvh`) so the iOS browser chrome /
    // virtual keyboard correctly shrink the visible area. `h-screen` bakes in
    // the larger `100vh` (max chrome) which clips the bottom of inputs when
    // the keyboard pops up. `min-h-dvh` lets layout grow if a child is huge
    // while still resizing with the keyboard.
    <div className="flex min-h-dvh h-dvh overflow-hidden bg-page text-ink">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto overscroll-contain">
          <RouteTransition>
            <Outlet />
          </RouteTransition>
        </main>
        <BottomNav />
      </div>

      <CommandPalette />
      <CommandHint />
      <ShortcutsOverlay />
      <WelcomeDialog />
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
