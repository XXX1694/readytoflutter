import { Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import CommandPalette from './CommandPalette.jsx';
import WelcomeDialog from './WelcomeDialog.jsx';
import { usePrefs } from '../store/prefs.js';

export default function Layout() {
  const theme = usePrefs((s) => s.theme);

  return (
    <div className="flex h-screen overflow-hidden bg-page text-ink">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <CommandPalette />
      <WelcomeDialog />
      <Toaster
        theme={theme}
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast:
              '!font-sans !text-sm !rounded-md !border-1.5 !border-ink !shadow-codex !bg-paper-2 !text-ink',
            description: '!text-ink-3',
          },
        }}
      />
    </div>
  );
}
