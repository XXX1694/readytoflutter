import { useCallback, useEffect, useState } from 'react';
import { pushSendTest } from '../api/api';
import { useAuth } from '../store/auth';
import {
  enablePush,
  disablePush,
  readPushStatus,
  type PushStatus,
  type EnableFailure,
} from '../lib/push';
import { Button } from '../ui/index';
import type { Lang } from '../i18n/LangContext';

/**
 * Study reminders — the settings section for Web Push.
 *
 * Self-contained: drop it into a settings page and it decides for itself
 * whether it has anything to say. It renders **nothing at all** when the
 * browser cannot do push, when the server has no VAPID keys, or when nobody is
 * signed in — a control for a feature that cannot work is worse than no
 * control.
 *
 * The one hard rule in here: `Notification.requestPermission()` is reached
 * only from the button's click handler. Asking on mount would be hostile, and
 * Chrome permanently blocks origins that do it.
 */

// ── Copy ────────────────────────────────────────────────────────────────────
// TODO: move to src/i18n/ui.ts. Kept local for now because that file is being
// edited elsewhere; the shape below maps one-to-one onto a `ui.push.*` block.

interface Copy {
  title: string;
  subtitle: string;
  offBody: string;
  onBody: (hour: string) => string;
  enable: string;
  enabling: string;
  disable: string;
  disabling: string;
  test: string;
  testing: string;
  denied: string;
  needsInstall: string;
  errors: Record<EnableFailure, string>;
  testSent: string;
  testErrors: Record<string, string>;
}

const EN: Copy = {
  title: 'Study reminders',
  subtitle: 'A daily notification when cards come due, so a review day does not slip past unnoticed.',
  offBody: 'Reminders are off. Turning them on asks this browser for permission to show notifications.',
  onBody: (hour) => `Reminders are on for this browser. One a day, after ${hour} in this device's time zone, and only when something is actually due.`,
  enable: 'Turn on reminders',
  enabling: 'Asking permission',
  disable: 'Turn off',
  disabling: 'Turning off',
  test: 'Send a test',
  testing: 'Sending',
  denied: 'This browser is blocking notifications for Onsite, and the page cannot undo that. Allow notifications for this site in your browser settings, then come back.',
  needsInstall: 'On iPhone and iPad, notifications only work once Onsite is on the Home Screen. Tap Share, then "Add to Home Screen", and open it from there.',
  errors: {
    unsupported: 'This browser does not support notifications.',
    needs_install: 'Add Onsite to your Home Screen first.',
    disabled: 'Reminders are not configured on this server.',
    denied: 'Notifications are blocked. Change it in your browser settings for this site.',
    dismissed: 'The permission prompt closed without an answer. Try again when you are ready.',
    no_service_worker: 'No service worker is running, so there is nothing to deliver to. Reminders need a production build.',
    failed: 'Could not turn reminders on. Check your connection and try again.',
  },
  testSent: 'Test notification sent. It should arrive in a moment.',
  testErrors: {
    not_subscribed: 'This browser is not subscribed. Turn reminders on first.',
    rate_limited: 'Too many test notifications. Try again later.',
    delivery_failed: 'The push service would not take it. Turn reminders off and on again.',
    unknown: 'Could not send the test.',
  },
};

const RU: Copy = {
  title: 'Напоминания о повторении',
  subtitle: 'Одно уведомление в день, когда подходит срок карточек — чтобы день повторения не прошёл незаметно.',
  offBody: 'Напоминания выключены. При включении браузер спросит разрешение на уведомления.',
  onBody: (hour) => `Напоминания включены для этого браузера. Раз в день, после ${hour} по времени устройства, и только когда действительно есть что повторить.`,
  enable: 'Включить напоминания',
  enabling: 'Запрашиваем разрешение',
  disable: 'Выключить',
  disabling: 'Выключаем',
  test: 'Отправить тест',
  testing: 'Отправляем',
  denied: 'Браузер блокирует уведомления для Onsite, и страница не может это отменить. Разрешите уведомления для этого сайта в настройках браузера и вернитесь сюда.',
  needsInstall: 'На iPhone и iPad уведомления работают только после добавления Onsite на экран «Домой». Нажмите «Поделиться», затем «На экран „Домой“», и откройте оттуда.',
  errors: {
    unsupported: 'Этот браузер не поддерживает уведомления.',
    needs_install: 'Сначала добавьте Onsite на экран «Домой».',
    disabled: 'Напоминания не настроены на сервере.',
    denied: 'Уведомления заблокированы. Измените это в настройках браузера для этого сайта.',
    dismissed: 'Запрос разрешения закрыт без ответа. Попробуйте снова, когда будете готовы.',
    no_service_worker: 'Service worker не запущен, доставлять некуда. Напоминаниям нужна продакшен-сборка.',
    failed: 'Не удалось включить напоминания. Проверьте соединение и попробуйте снова.',
  },
  testSent: 'Тестовое уведомление отправлено. Должно прийти через мгновение.',
  testErrors: {
    not_subscribed: 'Этот браузер не подписан. Сначала включите напоминания.',
    rate_limited: 'Слишком много тестовых уведомлений. Попробуйте позже.',
    delivery_failed: 'Служба доставки отклонила запрос. Выключите и снова включите напоминания.',
    unknown: 'Не удалось отправить тест.',
  },
};

// The api layer rejects with an axios error. Reading `response.code` through a
// narrow shape keeps this component free of an axios import for two fields.
function errorCode(err: unknown): string {
  if (typeof err !== 'object' || err === null || !('response' in err)) return 'unknown';
  const response = (err as { response?: { status?: number; data?: { code?: unknown } } }).response;
  const code = response?.data?.code;
  if (typeof code === 'string') return code;
  return response?.status === 429 ? 'rate_limited' : 'unknown';
}

type Busy = 'enable' | 'disable' | 'test' | null;
type Note = { tone: 'error' | 'ok'; text: string } | null;

export default function PushReminders({ lang }: { lang: Lang }) {
  const T = lang === 'ru' ? RU : EN;
  const token = useAuth((s) => s.token);

  const [status, setStatus] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [note, setNote] = useState<Note>(null);

  const refresh = useCallback(() => {
    let cancelled = false;
    readPushStatus().then((next) => {
      if (!cancelled) setStatus(next);
    });
    return () => { cancelled = true; };
  }, []);

  // Reading the status is passive — capability checks, an unauthenticated
  // health probe and a registration lookup. Nothing here prompts.
  useEffect(() => {
    if (!token) return;
    return refresh();
  }, [token, refresh]);

  const handleEnable = async () => {
    setBusy('enable');
    setNote(null);
    const result = await enablePush(status?.health.publicKey ?? null);
    if (!result.ok) setNote({ tone: 'error', text: T.errors[result.reason] });
    setBusy(null);
    refresh();
  };

  const handleDisable = async () => {
    setBusy('disable');
    setNote(null);
    await disablePush();
    setBusy(null);
    refresh();
  };

  const handleTest = async () => {
    setBusy('test');
    setNote(null);
    try {
      await pushSendTest();
      setNote({ tone: 'ok', text: T.testSent });
    } catch (err) {
      const code = errorCode(err);
      setNote({ tone: 'error', text: T.testErrors[code] ?? T.testErrors.unknown });
    }
    setBusy(null);
  };

  // ── Everything below decides whether to render at all ────────────────────
  // Signed out, still probing, no push in this browser, or no VAPID keys on
  // the server: the section does not exist.
  if (!token) return null;
  if (!status) return null;
  if (!status.supported) return null;
  if (!status.health.enabled) return null;

  const subscribed = status.permission === 'granted' && status.endpoint !== null;
  const hour = `${String(status.health.sendHourLocal).padStart(2, '0')}:00`;

  return (
    <section className="rounded-lg border border-rule/12 bg-paper-2 p-5 shadow-codex-sm sm:p-6">
      <div className="mb-5 border-b border-rule/12 pb-3">
        <h2 className="font-display text-lg font-semibold text-ink">{T.title}</h2>
        <p className="mt-1 text-[13px] text-muted">{T.subtitle}</p>
      </div>

      {status.needsInstall ? (
        <p className="text-[13px] leading-relaxed text-muted">{T.needsInstall}</p>
      ) : status.permission === 'denied' ? (
        <p className="text-[13px] leading-relaxed text-muted">{T.denied}</p>
      ) : (
        <div className="space-y-4">
          <p className="text-[13px] leading-relaxed text-muted">
            {subscribed ? T.onBody(hour) : T.offBody}
          </p>

          <div className="flex flex-wrap gap-2">
            {subscribed ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTest}
                  disabled={busy !== null}
                >
                  {busy === 'test' ? T.testing : T.test}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDisable}
                  disabled={busy !== null}
                >
                  {busy === 'disable' ? T.disabling : T.disable}
                </Button>
              </>
            ) : (
              <Button type="button" size="sm" onClick={handleEnable} disabled={busy !== null}>
                {busy === 'enable' ? T.enabling : T.enable}
              </Button>
            )}
          </div>
        </div>
      )}

      {note && (
        <p
          role={note.tone === 'error' ? 'alert' : 'status'}
          className={
            note.tone === 'error'
              ? 'mt-4 rounded-md border border-coral/30 bg-coral/8 px-3 py-2 text-[13px] text-coral'
              : 'mt-4 text-[13px] text-ink-2'
          }
        >
          {note.text}
        </p>
      )}
    </section>
  );
}
