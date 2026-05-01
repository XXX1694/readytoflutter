import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Download, X, Share2, RefreshCw } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useLang } from '../i18n/LangContext.jsx';
import { Button } from '../ui/index.js';

/**
 * PWA install + update prompts.
 *
 * **Install** — Android Chrome / Edge / Samsung Internet fire the
 * `beforeinstallprompt` event roughly 30 seconds after a useful visit
 * (engagement heuristic). We capture it, sit on it until the user has had
 * a chance to look around (3 page views), then surface a non-blocking
 * sonner toast offering to install. Dismissals stick for 30 days.
 *
 * iOS Safari has no programmatic install — instead, on the third visit we
 * show a one-time bottom card explaining "Tap Share → Add to Home Screen".
 *
 * **Update** — when the service worker has a new build ready, we show a
 * sonner toast with a "Reload" action. Clicking it calls
 * `updateServiceWorker(true)` which skipsWaiting + clientsClaim + reloads.
 */

const STORAGE = {
  installDismissed: 'rtf:pwa:install-dismissed',
  iosHintDismissed: 'rtf:pwa:ios-hint-dismissed',
  visitCount:       'rtf:pwa:visit-count',
};
const DISMISS_DAYS = 30;
const VISIT_GATE = 3;

const isStandalone = () =>
  typeof window !== 'undefined'
  && (window.matchMedia?.('(display-mode: standalone)').matches
      || window.navigator?.standalone === true);

const isIOS = () =>
  typeof navigator !== 'undefined'
  && /iP(ad|hone|od)/.test(navigator.userAgent)
  && !window.MSStream;

const dismissedRecently = (key) => {
  if (typeof localStorage === 'undefined') return false;
  const v = localStorage.getItem(key);
  if (!v) return false;
  const ts = Number(v);
  if (!Number.isFinite(ts)) return true;
  return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
};

const persistDismiss = (key) => {
  try { localStorage.setItem(key, String(Date.now())); } catch { /* quota */ }
};

export default function PwaPrompts() {
  const { lang } = useLang();
  const isRu = lang === 'ru';
  const installEvent = useRef(null);
  const [showIosHint, setShowIosHint] = useState(false);

  // ── Service worker update handler ──────────────────────────────────────
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      // Periodic background check — a tab left open for hours catches
      // updates without the user reloading manually.
      if (!r) return;
      setInterval(() => {
        try { r.update(); } catch { /* offline / aborted */ }
      }, 60 * 60 * 1000);
    },
    onRegisterError(err) {
      // eslint-disable-next-line no-console
      console.warn('[PWA] SW registration failed', err);
    },
  });

  useEffect(() => {
    if (!needRefresh) return;
    toast.info(isRu ? 'Доступно обновление' : 'Update available', {
      description: isRu
        ? 'Обновите страницу, чтобы загрузить новую версию.'
        : 'Reload the page to load the new build.',
      duration: Infinity,
      action: {
        label: (
          <span className="inline-flex items-center gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            {isRu ? 'Обновить' : 'Reload'}
          </span>
        ),
        onClick: () => {
          updateServiceWorker(true);
        },
      },
      onDismiss: () => setNeedRefresh(false),
    });
  }, [needRefresh, isRu, updateServiceWorker, setNeedRefresh]);

  // ── Visit counter ─────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    const n = Number(localStorage.getItem(STORAGE.visitCount) || '0') + 1;
    try { localStorage.setItem(STORAGE.visitCount, String(n)); } catch { /* quota */ }
  }, []);

  const visitsEnough = () => {
    if (typeof localStorage === 'undefined') return false;
    return Number(localStorage.getItem(STORAGE.visitCount) || '0') >= VISIT_GATE;
  };

  // ── Android / Chrome install prompt ────────────────────────────────────
  useEffect(() => {
    if (isStandalone()) return;
    if (dismissedRecently(STORAGE.installDismissed)) return;

    const onPrompt = (e) => {
      e.preventDefault();
      installEvent.current = e;
      // Hold the prompt back until the user has shown some intent —
      // bombarding first-time visitors hurts conversion.
      if (!visitsEnough()) return;
      surfaceInstallToast();
    };
    const onInstalled = () => {
      installEvent.current = null;
      persistDismiss(STORAGE.installDismissed);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRu]);

  const surfaceInstallToast = () => {
    if (!installEvent.current) return;
    toast.info(isRu ? 'Установить приложение' : 'Install the app', {
      description: isRu
        ? 'Открывается с домашнего экрана как нативное.'
        : 'Launches from the home screen like a native app.',
      duration: 12000,
      action: {
        label: (
          <span className="inline-flex items-center gap-1.5">
            <Download className="h-3.5 w-3.5" />
            {isRu ? 'Установить' : 'Install'}
          </span>
        ),
        onClick: async () => {
          const ev = installEvent.current;
          if (!ev) return;
          installEvent.current = null;
          ev.prompt();
          const choice = await ev.userChoice;
          if (choice?.outcome === 'dismissed') {
            persistDismiss(STORAGE.installDismissed);
          }
        },
      },
      onDismiss: () => persistDismiss(STORAGE.installDismissed),
    });
  };

  // ── iOS Safari install hint ────────────────────────────────────────────
  useEffect(() => {
    if (isStandalone()) return;
    if (!isIOS()) return;
    if (dismissedRecently(STORAGE.iosHintDismissed)) return;
    if (!visitsEnough()) return;
    // Defer 1.5s so we don't compete with first paint.
    const id = setTimeout(() => setShowIosHint(true), 1500);
    return () => clearTimeout(id);
  }, []);

  if (!showIosHint) return null;

  const dismissIosHint = () => {
    persistDismiss(STORAGE.iosHintDismissed);
    setShowIosHint(false);
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-2 sm:hidden"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}
      aria-live="polite"
    >
      <div className="relative rounded-2xl border border-rule/15 bg-paper-2/95 p-3 shadow-[0_8px_24px_-6px_rgb(var(--shadow)/0.20)] backdrop-blur-md">
        <button
          type="button"
          onClick={dismissIosHint}
          aria-label={isRu ? 'Закрыть' : 'Close'}
          className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted active:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-start gap-3 pr-8">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-sky text-white">
            <Share2 className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="font-display text-[14px] font-semibold text-ink">
              {isRu ? 'Установи на главный экран' : 'Add to Home Screen'}
            </div>
            <p className="mt-0.5 text-[12px] leading-snug text-muted">
              {isRu
                ? 'Нажми кнопку Поделиться, потом «На экран „Домой"» — приложение откроется как нативное.'
                : 'Tap Share, then "Add to Home Screen" — opens fullscreen, no browser chrome.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
