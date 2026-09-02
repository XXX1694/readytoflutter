import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Download, X, Share2 } from 'lucide-react';
// virtual:pwa-register/react is created at build time by vite-plugin-pwa.
// @ts-expect-error — virtual module, no static types.
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useLang } from '../i18n/LangContext';

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
 * **Update** — nothing to do here any more: the worker is registered with
 * `autoUpdate` (vite.config.js), so a new build installs, takes over and
 * reloads the page by itself. The hourly `r.update()` below is what makes a
 * long-open tab notice a deploy.
 */

// Not in lib.dom yet — Chromium-only, and the shape we actually consume.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}


const STORAGE = {
  installDismissed: 'rtf:pwa:install-dismissed',
  iosHintDismissed: 'rtf:pwa:ios-hint-dismissed',
  visitCount:       'rtf:pwa:visit-count',
};
const DISMISS_DAYS = 30;
const VISIT_GATE = 3;

const isStandalone = (): boolean =>
  typeof window !== 'undefined'
  && (window.matchMedia?.('(display-mode: standalone)').matches
      || (window.navigator as Navigator & { standalone?: boolean })?.standalone === true);

const isIOS = (): boolean =>
  typeof navigator !== 'undefined'
  && /iP(ad|hone|od)/.test(navigator.userAgent)
  && !(window as Window & { MSStream?: unknown }).MSStream;

const dismissedRecently = (key: string): boolean => {
  if (typeof localStorage === 'undefined') return false;
  const v = localStorage.getItem(key);
  if (!v) return false;
  const ts = Number(v);
  if (!Number.isFinite(ts)) return true;
  return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
};

const persistDismiss = (key: string): void => {
  try { localStorage.setItem(key, String(Date.now())); } catch { /* quota */ }
};

export default function PwaPrompts() {
  const { lang } = useLang();
  const isRu = lang === 'ru';
  const installEvent = useRef<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);

  // ── Service worker registration ────────────────────────────────────────
  useRegisterSW({
    onRegisteredSW(_swUrl: string, r: ServiceWorkerRegistration | undefined) {
      // Periodic background check — a tab left open for hours catches
      // updates without the user reloading manually.
      if (!r) return;
      setInterval(() => {
        try { r.update(); } catch { /* offline / aborted */ }
      }, 60 * 60 * 1000);
    },
    onRegisterError(err: unknown) {
      console.warn('[PWA] SW registration failed', err);
    },
  });

  // ── Visit counter ─────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    const n = Number(localStorage.getItem(STORAGE.visitCount) || '0') + 1;
    try { localStorage.setItem(STORAGE.visitCount, String(n)); } catch { /* quota */ }
  }, []);

  const visitsEnough = (): boolean => {
    if (typeof localStorage === 'undefined') return false;
    return Number(localStorage.getItem(STORAGE.visitCount) || '0') >= VISIT_GATE;
  };

  // ── Android / Chrome install prompt ────────────────────────────────────
  // Declared *before* the registration effect so the closure inside
  // `onPrompt` can call it without tripping the use-before-declare lint.
  const surfaceInstallToast = useCallback(() => {
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
  }, [isRu]);

  useEffect(() => {
    if (isStandalone()) return;
    if (dismissedRecently(STORAGE.installDismissed)) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      installEvent.current = e as BeforeInstallPromptEvent;
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
  }, [surfaceInstallToast]);

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
      className="fixed inset-x-0 z-40 px-3 sm:hidden"
      // Sit above the bottom nav rather than on top of it. Layout measures the
      // nav into --bottom-nav-h (0 on routes where it's hidden), and that
      // measurement already includes the nav's own safe-area padding — so
      // adding env(safe-area-inset-bottom) here again would double-count it.
      style={{ bottom: 'calc(var(--bottom-nav-h, 56px) + 8px)' }}
      aria-live="polite"
    >
      <div className="relative rounded-xl border border-rule/15 bg-paper-2 p-3 shadow-codex-lg">
        <button
          type="button"
          onClick={dismissIosHint}
          aria-label={isRu ? 'Закрыть' : 'Close'}
          className="touch-target absolute right-1 top-1 inline-flex items-center justify-center rounded text-muted active:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-start gap-3 pr-8">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand/8 text-brand">
            <Share2 className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="font-display text-[14px] font-semibold text-ink">
              {isRu ? 'Установи на главный экран' : 'Add to Home Screen'}
            </div>
            <p className="mt-0.5 text-[12px] leading-snug text-muted">
              {isRu
                ? 'Нажми кнопку «Поделиться», потом «На экран „Домой“» — приложение откроется как нативное.'
                : 'Tap Share, then "Add to Home Screen" — opens fullscreen, no browser chrome.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
