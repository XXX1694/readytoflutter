// Analytics scaffolding.
//
// We don't ship a provider yet — the bundle stays clean (no PostHog/Plausible
// SDK) until VITE_POSTHOG_KEY or VITE_PLAUSIBLE_DOMAIN is set. The trackers
// below give the rest of the app a stable API: when a provider is wired in,
// `track('study_session_start', {...})` already fires from the right places.
//
// In dev, all events log to the console so you can verify event names and
// payloads before any data leaves the browser.

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';
const PLAUSIBLE_DOMAIN = import.meta.env.VITE_PLAUSIBLE_DOMAIN;

let bootstrapped = false;

// One-shot loader — called from main.jsx after the React tree mounts.
// Lazy-injects the SDK script tag so users without a configured provider
// pay zero bytes for analytics. Safe to call more than once.
export function initAnalytics() {
  if (bootstrapped || typeof window === 'undefined') return;
  bootstrapped = true;

  if (POSTHOG_KEY) {
    // Minimal posthog-js loader. Full SDK is fetched async; calls made before
    // it finishes loading queue on `window.posthog._i` and replay once ready.
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    window.posthog.init(POSTHOG_KEY, { api_host: POSTHOG_HOST, capture_pageview: false });
  } else if (PLAUSIBLE_DOMAIN) {
    const s = document.createElement('script');
    s.defer = true;
    s.dataset.domain = PLAUSIBLE_DOMAIN;
    s.src = 'https://plausible.io/js/script.js';
    document.head.appendChild(s);
    // Surface a function-shaped trigger so manual calls work the same way as
    // the auto-injected one for SPAs.
    window.plausible = window.plausible || function () {
      (window.plausible.q = window.plausible.q || []).push(arguments);
    };
  }
}

function logDev(kind, ...rest) {
  if (import.meta.env.DEV) {
    console.debug(`[analytics] ${kind}`, ...rest);
  }
}

export function track(event, props = {}) {
  logDev('track', event, props);
  if (POSTHOG_KEY && typeof window !== 'undefined' && window.posthog) {
    window.posthog.capture(event, props);
  } else if (PLAUSIBLE_DOMAIN && typeof window !== 'undefined' && window.plausible) {
    window.plausible(event, { props });
  }
}

export function identify(userId, traits = {}) {
  logDev('identify', userId, traits);
  if (POSTHOG_KEY && typeof window !== 'undefined' && window.posthog) {
    window.posthog.identify(userId, traits);
  }
}

export function resetIdentity() {
  logDev('reset');
  if (POSTHOG_KEY && typeof window !== 'undefined' && window.posthog) {
    window.posthog.reset();
  }
}

export function pageview(path) {
  logDev('pageview', path);
  if (POSTHOG_KEY && typeof window !== 'undefined' && window.posthog) {
    window.posthog.capture('$pageview', { $current_url: window.location.origin + path });
  } else if (PLAUSIBLE_DOMAIN && typeof window !== 'undefined' && window.plausible) {
    window.plausible('pageview');
  }
}
