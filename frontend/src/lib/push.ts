/**
 * Web Push — the browser half.
 *
 * Spaced repetition only pays off if the learner comes back on the day a card
 * is due, and until now nothing told them. `backend/push.js` owns the sending;
 * this module owns everything that can only happen in a browser: capability
 * detection, the permission prompt, creating and tearing down the
 * `PushSubscription`, and reporting what this browser has due.
 *
 * ── Three things shape the code ──────────────────────────────────────────────
 *
 * 1. **The server cannot compute what is due.** SM-2 state lives in this
 *    browser's localStorage (`lib/srs.ts`), so the client reports `dueCount`
 *    and `nextDueAt` and the server schedules off that snapshot. See
 *    `reportState()`.
 *
 * 2. **A report is a full snapshot, not a patch.** Omitting `nextDueAt` clears
 *    the stored one, so `currentStateReport()` always sends both fields, with
 *    an explicit `null` rather than an absent key.
 *
 * 3. **Permission is asked once, and only from a click.** Chrome's
 *    abusive-notification heuristics permanently block origins that prompt on
 *    load, and a `denied` result cannot be undone from the page — only from
 *    browser settings. So `enablePush()` is the only thing that calls
 *    `Notification.requestPermission()`, and it must be reached from a
 *    deliberate user action.
 *
 * The service worker that receives the pushes is `public/push-sw.js`, pulled
 * into the generated Workbox worker via `workbox.importScripts`.
 */

import {
  pushSubscribe,
  pushReportState,
  pushUnsubscribe,
  pushHealth,
  type PushHealth,
  type PushSubscriptionPayload,
  type PushStateReport,
} from '../api/api';
import { getDueSnapshot } from './srs';
import { useAuth } from '../store/auth';

// `navigator.serviceWorker.ready` never settles when nothing is registered,
// which is exactly the dev case (`devOptions.enabled: false` in vite.config).
// Racing it against a timeout turns a button that hangs forever into an
// honest "there is no service worker here" error.
const SW_READY_TIMEOUT_MS = 8000;

// The state report is cheap but the endpoint is rate limited (60 / 15 min) and
// the natural call sites — app open, end of a study session, tab refocus — can
// bunch up. Re-sending a byte-identical snapshot tells the server nothing new,
// so skip it. The window is bounded rather than permanent because the server
// also uses the report's timestamp for staleness: a device that stops
// reporting for `staleDays` stops being reminded, so an unchanged snapshot
// still has to check in.
const REPORT_DEDUPE_MS = 30 * 60 * 1000;

let lastReport: { body: string; at: number } | null = null;

// ── Capability detection ────────────────────────────────────────────────────

function isPushSupported(): boolean {
  return typeof window !== 'undefined'
    && typeof navigator !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

const isIos = (): boolean =>
  typeof navigator !== 'undefined'
  && (/iP(hone|ad|od)/.test(navigator.userAgent)
    // iPadOS 13+ reports itself as a Mac; the touch points give it away.
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

const isStandalone = (): boolean =>
  typeof window !== 'undefined'
  && (window.matchMedia?.('(display-mode: standalone)').matches === true
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true);

/**
 * iOS and iPadOS expose Web Push only to an installed (home-screen) PWA —
 * `PushManager` is present in a plain Safari tab but subscribing fails there.
 * Without this check the user gets an opaque failure instead of the one
 * instruction that would fix it.
 */
function needsInstallForPush(): boolean {
  return isPushSupported() && isIos() && !isStandalone();
}

/** `Notification.permission`, or `'default'` where the API doesn't exist. */
function getPermission(): NotificationPermission {
  if (!isPushSupported()) return 'default';
  return Notification.permission;
}

// ── Service worker plumbing ─────────────────────────────────────────────────

async function swReady(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  let timer = 0;
  const timeout = new Promise<null>((resolve) => {
    timer = window.setTimeout(() => resolve(null), SW_READY_TIMEOUT_MS);
  });
  try {
    return await Promise.race([navigator.serviceWorker.ready, timeout]);
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * The subscription this browser currently holds, if any. Uses
 * `getRegistration()` rather than `ready` so it resolves immediately instead
 * of blocking on an activating worker — callers here only ever read.
 */
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return null;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

// ── VAPID key ───────────────────────────────────────────────────────────────

/**
 * `applicationServerKey` wants raw bytes; the server hands out the standard
 * base64url form. Without the key the browser cannot subscribe at all, which
 * is why `pushHealth().publicKey` gates the whole flow.
 *
 * The `<ArrayBuffer>` argument is not decoration: `BufferSource` excludes
 * views backed by a `SharedArrayBuffer`, so a bare `Uint8Array` (which widens
 * to `ArrayBufferLike`) will not satisfy `applicationServerKey`.
 */
function urlBase64ToUint8Array(base64url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/**
 * A subscription created against a different VAPID key silently stops being
 * deliverable once the server rotates its keys — the push service accepts the
 * subscribe but rejects every send. Cheaper to detect here than to debug from
 * "my reminders quietly stopped".
 */
function matchesKey(sub: PushSubscription, expected: Uint8Array): boolean {
  const current = sub.options?.applicationServerKey;
  if (!current) return false;
  const bytes = new Uint8Array(current);
  if (bytes.length !== expected.length) return false;
  return bytes.every((b, i) => b === expected[i]);
}

function toPayload(sub: PushSubscription): PushSubscriptionPayload | null {
  const json = sub.toJSON();
  const endpoint = json.endpoint || sub.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!endpoint || !p256dh || !auth) return null;
  return { endpoint, keys: { p256dh, auth } };
}

// ── The state report ────────────────────────────────────────────────────────

/**
 * This browser's due snapshot, in the shape the server stores. `nextDueAt` is
 * ISO 8601 here and epoch milliseconds in the SRS store, and it is sent as an
 * explicit `null` rather than omitted — the endpoint treats a missing key as
 * "nothing is scheduled" and clears whatever it had.
 *
 * `tzOffsetMinutes` is what makes "09:00" mean 09:00 where the user is: the
 * browser is the only party that knows its own offset.
 */
function currentStateReport(): PushStateReport {
  const { dueCount, nextDueAt } = getDueSnapshot();
  return {
    dueCount,
    nextDueAt: nextDueAt === null ? null : new Date(nextDueAt).toISOString(),
    tzOffsetMinutes: new Date().getTimezoneOffset(),
  };
}

/**
 * Push the current snapshot to the server. Safe to call from anywhere and at
 * any time: it is a no-op when signed out, when permission was never granted,
 * or when this browser holds no subscription, and it never throws or surfaces
 * an error — the user did not ask for this, so a failed sync is not their
 * problem. The next call catches up.
 *
 * @returns whether a report was actually sent.
 */
export async function reportState(): Promise<boolean> {
  if (!isPushSupported()) return false;
  // The endpoint is authenticated. Calling it signed-out would 401, and the
  // api interceptor treats a 401 as "session expired" and tears the session
  // down — a background sync must never be able to sign the user out.
  if (!useAuth.getState().token) return false;
  if (Notification.permission !== 'granted') return false;

  // `ready` rather than `getRegistration()`: the natural call sites (app boot,
  // end of a study session) can run before vite-plugin-pwa has finished
  // registering, and `getRegistration()` would return undefined and silently
  // drop the report. Nothing awaits this function, so waiting costs nobody
  // anything, and the timeout inside swReady() bounds the no-worker case.
  const reg = await swReady();
  const sub = reg ? await reg.pushManager.getSubscription().catch(() => null) : null;
  if (!sub) return false;

  const state = currentStateReport();
  const body = `${sub.endpoint}|${JSON.stringify(state)}`;
  if (lastReport && lastReport.body === body && Date.now() - lastReport.at < REPORT_DEDUPE_MS) {
    return false;
  }

  try {
    await pushReportState(sub.endpoint, state);
    lastReport = { body, at: Date.now() };
    return true;
  } catch {
    // 404 not_subscribed, 503 push_disabled, offline — all recoverable on the
    // next call, none of them worth a toast.
    return false;
  }
}

// ── Enable / disable ────────────────────────────────────────────────────────

export type EnableFailure =
  /** No serviceWorker / PushManager / Notification in this browser. */
  | 'unsupported'
  /** iOS or iPadOS, not installed to the home screen. */
  | 'needs_install'
  /** The server has no VAPID keys, so there is nothing to subscribe against. */
  | 'disabled'
  /** Permission is `denied`. The page cannot undo this — only browser settings can. */
  | 'denied'
  /** The permission prompt was dismissed without a decision. */
  | 'dismissed'
  /** No service worker is registered (dev builds ship without one). */
  | 'no_service_worker'
  /** The push service or our own API refused. */
  | 'failed';

export type EnableResult =
  | { ok: true; endpoint: string }
  | { ok: false; reason: EnableFailure };

/**
 * Turn reminders on for this browser.
 *
 * **Must be called from a user gesture.** `Notification.requestPermission()`
 * is only meaningful in response to a deliberate action, and prompting on load
 * is the fastest way to get an origin permanently blocked.
 *
 * The subscribe carries the first state report with it, so a device is useful
 * to the daily job from the moment it registers — a device that has never
 * reported state is never sent a reminder.
 */
export async function enablePush(publicKey: string | null): Promise<EnableResult> {
  if (!isPushSupported()) return { ok: false, reason: 'unsupported' };
  if (needsInstallForPush()) return { ok: false, reason: 'needs_install' };
  if (!publicKey) return { ok: false, reason: 'disabled' };

  let permission: NotificationPermission;
  try {
    permission = await Notification.requestPermission();
  } catch {
    return { ok: false, reason: 'failed' };
  }
  if (permission === 'denied') return { ok: false, reason: 'denied' };
  if (permission !== 'granted') return { ok: false, reason: 'dismissed' };

  const reg = await swReady();
  if (!reg) return { ok: false, reason: 'no_service_worker' };

  const key = urlBase64ToUint8Array(publicKey);
  let sub: PushSubscription | null;
  try {
    sub = await reg.pushManager.getSubscription();
    // Reuse only a subscription made against the key the server is signing
    // with today; anything else would accept the subscribe and then never
    // deliver.
    if (sub && !matchesKey(sub, key)) {
      await sub.unsubscribe();
      sub = null;
    }
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key,
      });
    }
  } catch {
    return { ok: false, reason: 'failed' };
  }

  const payload = toPayload(sub);
  if (!payload) return { ok: false, reason: 'failed' };

  try {
    await pushSubscribe(payload, currentStateReport());
  } catch {
    // The browser now holds a subscription the server does not know about.
    // Drop it rather than leaving a device that looks subscribed locally and
    // will never be sent anything.
    try { await sub.unsubscribe(); } catch { /* already gone */ }
    return { ok: false, reason: 'failed' };
  }

  lastReport = null;
  return { ok: true, endpoint: payload.endpoint };
}

/**
 * Turn reminders off for this browser. The local unsubscribe happens first and
 * unconditionally: a user who says stop must stop, even if the server call
 * fails. An orphaned row on the server is self-cleaning — the first send to a
 * dead endpoint returns 410 and the row is deleted.
 */
export async function disablePush(): Promise<void> {
  const sub = await getCurrentSubscription();
  const endpoint = sub?.endpoint ?? null;

  if (sub) {
    try { await sub.unsubscribe(); } catch { /* already gone */ }
  }
  if (endpoint && useAuth.getState().token) {
    try { await pushUnsubscribe(endpoint); } catch { /* orphan, see above */ }
  }
  lastReport = null;
}

// ── Status, for the UI ──────────────────────────────────────────────────────

export interface PushStatus {
  supported: boolean;
  /** iOS/iPadOS in a browser tab rather than an installed PWA. */
  needsInstall: boolean;
  /** Never rejects — `pushHealth()` degrades to `{ enabled: false }`. */
  health: PushHealth;
  permission: NotificationPermission;
  /** The endpoint this browser holds, or `null` when it holds none. */
  endpoint: string | null;
}

/** One read of everything the reminder UI needs to decide what to render. */
export async function readPushStatus(): Promise<PushStatus> {
  const [health, sub] = await Promise.all([pushHealth(), getCurrentSubscription()]);
  return {
    supported: isPushSupported(),
    needsInstall: needsInstallForPush(),
    health,
    permission: getPermission(),
    endpoint: sub?.endpoint ?? null,
  };
}
