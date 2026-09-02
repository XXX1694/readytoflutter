/*
 * Web Push handlers for Onsite.
 *
 * This file is NOT the service worker. vite-plugin-pwa runs in `generateSW`
 * mode, so Workbox writes `sw.js` for us and the only way to add behaviour to
 * it is `workbox.importScripts`. This file is copied verbatim out of `public/`
 * to the build root, lands next to `sw.js`, and is pulled in by:
 *
 *     workbox: { importScripts: ['push-sw.js'] }
 *
 * Consequences of that, which the code below has to live with:
 *   - No bundler, no imports, no TypeScript. Plain script in a worker.
 *   - No access to the app's i18n bundle, and no localStorage in a worker, so
 *     the language comes from `navigator.language` (see `isRu`).
 *   - The path is relative to `sw.js`, so it resolves under any base path
 *     (`/` locally, `/readytoflutter/` on GitHub Pages). Every URL built here
 *     is resolved against `self.registration.scope` for the same reason.
 *
 * The payload `backend/push.js` sends is:
 *   { kind: 'daily' | 'test', title, body, tag, url, dueCount }
 * `title` and `body` are English fallbacks. We prefer rendering from `kind` +
 * `dueCount` so the notification is in the reader's language, and `tag` is
 * constant per kind so a second reminder replaces the first rather than
 * stacking a pile of them in the shade.
 */

/* global self */

// ── Copy ────────────────────────────────────────────────────────────────────
// TODO: extract to src/i18n/ui.ts once that file is free. A service worker
// cannot import the bundle, so these will have to be inlined at build time or
// posted in from the app; for now they are duplicated here deliberately.

// The worker has no way to read the app's language toggle — no localStorage,
// no DOM. `navigator.language` is the browser's own UI language, which is the
// closest honest proxy available offline.
function isRu() {
  var lang = (self.navigator && self.navigator.language) || 'en';
  return lang.toLowerCase().indexOf('ru') === 0;
}

// 1 карточка · 2-4 карточки · 5-20 карточек, and the teens are all -ек.
function ruCards(n) {
  var mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'карточек';
  var mod10 = n % 10;
  if (mod10 === 1) return 'карточка';
  if (mod10 >= 2 && mod10 <= 4) return 'карточки';
  return 'карточек';
}

function copyFor(kind, dueCount, fallback) {
  var ru = isRu();

  if (kind === 'test') {
    return ru
      ? { title: 'Тестовое уведомление', body: 'Уведомления работают на этом устройстве.' }
      : { title: 'Test notification', body: 'Notifications are working on this device.' };
  }

  if (kind === 'daily') {
    if (typeof dueCount === 'number' && dueCount > 0) {
      return ru
        ? {
          title: dueCount + ' ' + ruCards(dueCount) + ' к повторению',
          body: 'Откройте очередь повторения.',
        }
        : {
          title: dueCount === 1 ? '1 card is due' : dueCount + ' cards are due',
          body: 'Open your study queue.',
        };
    }
    // A push that lost its count still has to say something true.
    return ru
      ? { title: 'Пора повторить', body: 'Очередь интервального повторения ждёт.' }
      : { title: 'Time to review', body: 'Your spaced-repetition queue is waiting.' };
  }

  // Unknown kind — a newer server talking to an older worker. Fall back to the
  // English strings it sent rather than inventing copy for something we do not
  // understand.
  return {
    title: (fallback && fallback.title) || 'Onsite',
    body: (fallback && fallback.body) || '',
  };
}

// ── Payload ─────────────────────────────────────────────────────────────────

// `event.data` is null for a payload-less push (some services send those as a
// wake-up), and `.json()` throws on anything that is not JSON. Neither may be
// allowed to skip `showNotification` — a push that shows nothing gets the
// subscription revoked under `userVisibleOnly`. Both degrade to `{}`, which
// `copyFor` turns into the generic reminder.
function readPayload(event) {
  if (!event.data) return {};
  try {
    var parsed = event.data.json();
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (err) {
    return {};
  }
}

// Resolve an app path from the payload against the worker's own scope, so
// `/study` becomes `/readytoflutter/study` on a sub-path deploy. Anything that
// resolves off-origin is dropped — a notification must not be a redirector.
function resolveUrl(path) {
  var scope = self.registration.scope;
  try {
    var url = new URL(String(path || './').replace(/^\/+/, ''), scope);
    if (url.origin !== new URL(scope).origin) return scope;
    return url.href;
  } catch (err) {
    return scope;
  }
}

// ── push ────────────────────────────────────────────────────────────────────

self.addEventListener('push', function (event) {
  var payload = readPayload(event);
  // An ABSENT kind is the payload-less wake-up, which is a daily reminder by
  // every other signal. An UNKNOWN kind is a newer server talking to an older
  // worker, and gets `copyFor`'s fallback — dressing it up as a due-cards
  // reminder would be inventing a message the server never sent.
  var kind = payload.kind || 'daily';
  var text = copyFor(kind, payload.dueCount, payload);
  var url = resolveUrl(payload.url || (kind === 'test' ? '/settings' : '/study'));

  event.waitUntil(
    self.registration.showNotification(text.title, {
      body: text.body,
      // One tag per kind: a second reminder replaces the first instead of
      // stacking. No `renotify` — silently replacing is the point.
      tag: payload.tag || (kind === 'test' ? 'onsite-test' : 'onsite-daily'),
      icon: resolveUrl('pwa/icon-192.png'),
      // No `badge`: Android renders it as an alpha silhouette and every icon
      // we ship is a filled square, which would come out as a white block.
      data: { url: url, kind: kind },
      lang: isRu() ? 'ru' : 'en',
    }),
  );
});

// ── notificationclick ───────────────────────────────────────────────────────

// Focus a window that is already open rather than opening a duplicate. A
// reminder that leaves the user with three copies of the app is worse than no
// reminder.
async function openTarget(url) {
  var scope = self.registration.scope;
  var windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

  // Already looking at the right page — just bring it forward.
  for (var i = 0; i < windows.length; i += 1) {
    if (windows[i].url === url) return windows[i].focus();
  }

  // Otherwise steer the first app window we have. `navigate()` only works on
  // clients this worker controls, so a failure falls through to a plain focus
  // instead of losing the click.
  for (var j = 0; j < windows.length; j += 1) {
    var client = windows[j];
    if (client.url.indexOf(scope) !== 0) continue;
    if (typeof client.navigate === 'function') {
      try {
        var navigated = await client.navigate(url);
        return (navigated || client).focus();
      } catch (err) {
        /* uncontrolled client — fall through */
      }
    }
    return client.focus();
  }

  return self.clients.openWindow(url);
}

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var data = event.notification.data || {};
  event.waitUntil(openTarget(resolveUrl(data.url || './')));
});
