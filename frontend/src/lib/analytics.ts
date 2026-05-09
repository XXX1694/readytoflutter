// Analytics scaffolding.
//
// We don't ship a provider yet — the bundle stays clean (no PostHog/Plausible
// SDK) until VITE_POSTHOG_KEY or VITE_PLAUSIBLE_DOMAIN is set. The trackers
// below give the rest of the app a stable API: when a provider is wired in,
// `track('study_session_start', {...})` already fires from the right places.
//
// In dev, all events log to the console so you can verify event names and
// payloads before any data leaves the browser.

interface PosthogClient {
  init: (key: string, options: Record<string, unknown>) => void;
  capture: (event: string, props?: Record<string, unknown>) => void;
  identify: (id: string, traits?: Record<string, unknown>) => void;
  reset: () => void;
}

interface PlausibleClient {
  (event: string, options?: { props?: Record<string, unknown> }): void;
  q?: unknown[];
}

declare global {
  interface Window {
    posthog?: PosthogClient & { _i?: unknown[]; __SV?: number };
    plausible?: PlausibleClient;
  }
}

export type AnalyticsProps = Record<string, unknown>;

const POSTHOG_KEY: string | undefined = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST: string = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';
const PLAUSIBLE_DOMAIN: string | undefined = import.meta.env.VITE_PLAUSIBLE_DOMAIN;

let bootstrapped = false;

// One-shot loader — called from main.jsx after the React tree mounts.
// Lazy-injects the SDK script tag so users without a configured provider
// pay zero bytes for analytics. Safe to call more than once.
export function initAnalytics(): void {
  if (bootstrapped || typeof window === 'undefined') return;
  bootstrapped = true;

  if (POSTHOG_KEY) {
    // Minimal posthog-js loader. Full SDK is fetched async; calls made before
    // it finishes loading queue on `window.posthog._i` and replay once ready.
    // The vendored snippet uses dynamic typing on purpose — typing it strictly
    // would mean reproducing PostHog's internal API surface. We trust the
    // upstream snippet and fence it off with @ts-expect-error.
    /* eslint-disable */
    // @ts-expect-error — vendored PostHog bootstrap snippet
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    /* eslint-enable */
    window.posthog?.init(POSTHOG_KEY, { api_host: POSTHOG_HOST, capture_pageview: false });
  } else if (PLAUSIBLE_DOMAIN) {
    const s = document.createElement('script');
    s.defer = true;
    s.dataset.domain = PLAUSIBLE_DOMAIN;
    s.src = 'https://plausible.io/js/script.js';
    document.head.appendChild(s);
    // Surface a function-shaped trigger so manual calls work the same way as
    // the auto-injected one for SPAs.
    if (!window.plausible) {
      const queued: PlausibleClient = function (event: string, options?: { props?: Record<string, unknown> }) {
        (queued.q = queued.q || []).push([event, options]);
      } as PlausibleClient;
      window.plausible = queued;
    }
  }
}

function logDev(kind: string, ...rest: unknown[]): void {
  if (import.meta.env.DEV) {
    console.debug(`[analytics] ${kind}`, ...rest);
  }
}

export function track(event: string, props: AnalyticsProps = {}): void {
  logDev('track', event, props);
  if (POSTHOG_KEY && typeof window !== 'undefined' && window.posthog) {
    window.posthog.capture(event, props);
  } else if (PLAUSIBLE_DOMAIN && typeof window !== 'undefined' && window.plausible) {
    window.plausible(event, { props });
  }
}

export function identify(userId: string, traits: AnalyticsProps = {}): void {
  logDev('identify', userId, traits);
  if (POSTHOG_KEY && typeof window !== 'undefined' && window.posthog) {
    window.posthog.identify(userId, traits);
  }
}

export function resetIdentity(): void {
  logDev('reset');
  if (POSTHOG_KEY && typeof window !== 'undefined' && window.posthog) {
    window.posthog.reset();
  }
}

export function pageview(path: string): void {
  logDev('pageview', path);
  if (POSTHOG_KEY && typeof window !== 'undefined' && window.posthog) {
    window.posthog.capture('$pageview', { $current_url: window.location.origin + path });
  } else if (PLAUSIBLE_DOMAIN && typeof window !== 'undefined' && window.plausible) {
    window.plausible('pageview');
  }
}
