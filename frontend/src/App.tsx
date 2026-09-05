import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import { LangProvider } from './i18n/LangContext';
import { queryClient } from './lib/queryClient';
// Direct file imports in the app shell, not the `ui/index` barrel: an edge
// to the barrel makes the entry chunk depend on every primitive and drags
// the shared `ui` chunk (and once, Radix) onto the critical path.
import { FullPageLoader } from './ui/Spinner';
import { useAuth } from './store/auth';
import { apiBaseUrl, flushLocalProgress, noBackend } from './api/api';
import { prefetchIdle } from './lib/prefetch';
import { reportState } from './lib/push';
import { syncSrs } from './lib/srsSync';
import { initAnalytics, pageview, identify } from './lib/analytics';
import { LANDINGS } from './i18n/landings';
import './store/prefs'; // side-effect: hydrate theme before paint

// Pageview tracker — sits inside the Router so useLocation works. Fires once
// per pathname change. No-op when no analytics provider is configured.
function PageviewTracker() {
  const location = useLocation();
  useEffect(() => {
    pageview(location.pathname + location.search);
  }, [location.pathname, location.search]);
  return null;
}

// Code splitting: lazy load pages
const HomePage = lazy(() => import('./pages/HomePage'));
const TopicPage = lazy(() => import('./pages/TopicPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const StudyPage = lazy(() => import('./pages/StudyPage'));
const MockPage = lazy(() => import('./pages/MockPage'));
const LivePage = lazy(() => import('./pages/LivePage'));
const BookmarksPage = lazy(() => import('./pages/BookmarksPage'));
// Production admin dashboard — server-data driven (users, contact inbox,
// stats). Always mounted; the page itself gates on `user.is_admin`, so
// non-admin visitors hitting /admin via deep-link see a 'not authorized'
// screen instead of the dashboard.
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
// Authoring is the dev-only in-browser question editor (localStorage diff
// + JSON export). Kept separate at /admin/authoring so production builds
// don't ship the 600+ LOC editor in the main bundle.
const AdminAuthoringPage = import.meta.env.DEV
  ? lazy(() => import('./pages/AdminPage'))
  : null;
const StatsPage = lazy(() => import('./pages/StatsPage'));
const PrintTopicPage = lazy(() => import('./pages/PrintTopicPage'));
const CheatsheetPage = lazy(() => import('./pages/CheatsheetPage'));
const RoundPage = lazy(() => import('./pages/RoundPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const KnowledgePage = lazy(() => import('./pages/KnowledgePage'));
const RoadmapPage = lazy(() => import('./pages/RoadmapPage'));
const TopicsPage = lazy(() => import('./pages/TopicsPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

export default function App() {
  // Probe the backend exactly once on app boot so the auth UI knows whether
  // to render before the user clicks anything. Doing it lazily on first
  // AccountMenu interaction caused a flicker race where backendAvailable
  // was still null at first paint.
  useEffect(() => {
    // A Pages build with no backend wired up: don't spend a request (and a
    // slot on a 3G connection's queue) asking GitHub for /api/auth/health.
    if (noBackend) useAuth.setState({ backendAvailable: false });
    else useAuth.getState().probeBackend(apiBaseUrl);
    // Warm the tab-root chunks once the first screen has its data, so the
    // first tap on a tab doesn't wait on a network round-trip — and started
    // no earlier, or the chunks queue ahead of the seed bundle that screen
    // is waiting on.
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== 'updated' || event.action.type !== 'success') return;
      unsubscribe();
      prefetchIdle();
    });
    // Bring up the analytics SDK if a provider is configured. Lazy: no
    // network bytes if neither VITE_POSTHOG_KEY nor VITE_PLAUSIBLE_DOMAIN
    // is set at build time.
    initAnalytics();
    // Re-identify the persisted user on boot so retention cohorts survive
    // a page refresh / new tab without an extra login.
    const { user } = useAuth.getState();
    if (user?.id) identify(String(user.id), { email: user.email });
    // Refresh the server's view of what is due. Catches someone who abandoned
    // a session mid-way — the ratings are already in localStorage but the
    // completion effect never ran — and keeps a rare studier from crossing the
    // server's staleness cutoff and quietly losing their reminders. Self-guards
    // on signed-out / no permission / no subscription and never throws.
    void reportState();

    // Flush writes queued in localStorage while the backend was unreachable —
    // on boot (a session that ended offline) and whenever the network returns.
    const flush = () => {
      void flushLocalProgress()
        .then((r) => { if (r) queryClient.invalidateQueries(); })
        .catch(() => { /* still offline / server down — the next event retries */ });
      // Reconcile the SM-2 schedule with the account's copy in the same two
      // moments. It never rejects; a pull that changed something has to
      // recompute what is already on screen (today's plan, the mastery map),
      // and those read the card map during render.
      void syncSrs().then((merged) => { if (merged > 0) queryClient.invalidateQueries(); });
    };
    flush();
    window.addEventListener('online', flush);
    return () => window.removeEventListener('online', flush);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LangProvider>
        <ErrorBoundary>
          {/* `v7_startTransition` wraps every navigation in React.startTransition,
              so a tab whose chunk is still downloading keeps the current page
              on screen until the new one can render — instead of dropping to
              the full-page spinner for the length of the fetch. */}
          <BrowserRouter basename={import.meta.env.BASE_URL} future={{ v7_startTransition: true }}>
            <PageviewTracker />
            <Routes>
              {/* Standalone routes (no app shell) — must come BEFORE the
                  Layout-wrapped block so printing isn't constrained by the
                  app's h-screen overflow-hidden container. */}
              <Route
                path="topic/:slug/print"
                element={
                  <Suspense fallback={<FullPageLoader />}>
                    <PrintTopicPage />
                  </Suspense>
                }
              />
              <Route
                path="topic/:slug/cheatsheet"
                element={
                  <Suspense fallback={<FullPageLoader />}>
                    <CheatsheetPage />
                  </Suspense>
                }
              />
              <Route path="/" element={<Layout />}>
                <Route
                  index
                  element={
                    <Suspense fallback={<FullPageLoader />}>
                      <HomePage />
                    </Suspense>
                  }
                />
                {/* Per-platform landings — same HomePage shell, different
                    hero copy + auto-applied platform filter + canonical / OG
                    meta. Adds 4 SEO entry points (/flutter, /ios, /android,
                    /kmp) without forking the dashboard. */}
                {Object.entries(LANDINGS).map(([slug, config]) => (
                  <Route
                    key={slug}
                    path={slug}
                    element={
                      <Suspense fallback={<FullPageLoader />}>
                        <HomePage landing={config} />
                      </Suspense>
                    }
                  />
                ))}
                <Route
                  path="topic/:slug"
                  element={
                    <Suspense fallback={<FullPageLoader />}>
                      <TopicPage />
                    </Suspense>
                  }
                />
                <Route
                  path="search"
                  element={
                    <Suspense fallback={<FullPageLoader />}>
                      <SearchPage />
                    </Suspense>
                  }
                />
                <Route
                  path="study"
                  element={
                    <Suspense fallback={<FullPageLoader />}>
                      <StudyPage />
                    </Suspense>
                  }
                />
                <Route
                  path="mock"
                  element={
                    <Suspense fallback={<FullPageLoader />}>
                      <MockPage />
                    </Suspense>
                  }
                />
                <Route
                  path="live"
                  element={
                    <Suspense fallback={<FullPageLoader />}>
                      <LivePage />
                    </Suspense>
                  }
                />
                <Route
                  path="bookmarks"
                  element={
                    <Suspense fallback={<FullPageLoader />}>
                      <BookmarksPage />
                    </Suspense>
                  }
                />
                <Route
                  path="admin"
                  element={
                    <Suspense fallback={<FullPageLoader />}>
                      <AdminDashboardPage />
                    </Suspense>
                  }
                />
                {AdminAuthoringPage && (
                  <Route
                    path="admin/authoring"
                    element={
                      <Suspense fallback={<FullPageLoader />}>
                        <AdminAuthoringPage />
                      </Suspense>
                    }
                  />
                )}
                <Route
                  path="pricing"
                  element={
                    <Suspense fallback={<FullPageLoader />}>
                      <PricingPage />
                    </Suspense>
                  }
                />
                <Route
                  path="contact"
                  element={
                    <Suspense fallback={<FullPageLoader />}>
                      <ContactPage />
                    </Suspense>
                  }
                />
                <Route
                  path="stats"
                  element={
                    <Suspense fallback={<FullPageLoader />}>
                      <StatsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="round/:slug"
                  element={
                    <Suspense fallback={<FullPageLoader />}>
                      <RoundPage />
                    </Suspense>
                  }
                />
                <Route
                  path="login"
                  element={
                    <Suspense fallback={<FullPageLoader />}>
                      <LoginPage />
                    </Suspense>
                  }
                />
                <Route
                  path="signup"
                  element={
                    <Suspense fallback={<FullPageLoader />}>
                      <SignupPage />
                    </Suspense>
                  }
                />
                <Route
                  path="reset"
                  element={
                    <Suspense fallback={<FullPageLoader />}>
                      <ResetPasswordPage />
                    </Suspense>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <Suspense fallback={<FullPageLoader />}>
                      <SettingsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="knowledge"
                  element={
                    <Suspense fallback={<FullPageLoader />}>
                      <KnowledgePage />
                    </Suspense>
                  }
                />
                <Route
                  path="roadmap"
                  element={
                    <Suspense fallback={<FullPageLoader />}>
                      <RoadmapPage />
                    </Suspense>
                  }
                />
                <Route
                  path="topics"
                  element={
                    <Suspense fallback={<FullPageLoader />}>
                      <TopicsPage />
                    </Suspense>
                  }
                />
                {/* Catch-all — must stay last inside the Layout route so a
                    bad URL renders the app chrome with a 404 body instead of
                    an empty root. */}
                <Route
                  path="*"
                  element={
                    <Suspense fallback={<FullPageLoader />}>
                      <NotFoundPage />
                    </Suspense>
                  }
                />
              </Route>
            </Routes>
          </BrowserRouter>
        </ErrorBoundary>
      </LangProvider>
    </QueryClientProvider>
  );
}
