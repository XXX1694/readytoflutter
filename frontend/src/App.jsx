import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import Layout from './components/Layout.jsx';
import { LangProvider } from './i18n/LangContext.jsx';
import { queryClient } from './lib/queryClient';
import { FullPageLoader } from './ui/index.js';
import { useAuth } from './store/auth';
import { apiBaseUrl } from './api/api';
import { prefetchIdle } from './lib/prefetch.js';
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
const HomePage = lazy(() => import('./pages/HomePage.jsx'));
const TopicPage = lazy(() => import('./pages/TopicPage.jsx'));
const SearchPage = lazy(() => import('./pages/SearchPage.jsx'));
const StudyPage = lazy(() => import('./pages/StudyPage.jsx'));
const MockPage = lazy(() => import('./pages/MockPage.jsx'));
const BookmarksPage = lazy(() => import('./pages/BookmarksPage.jsx'));
// Production admin dashboard — server-data driven (users, contact inbox,
// stats). Always mounted; the page itself gates on `user.is_admin`, so
// non-admin visitors hitting /admin via deep-link see a 'not authorized'
// screen instead of the dashboard.
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage.jsx'));
// Authoring is the dev-only in-browser question editor (localStorage diff
// + JSON export). Kept separate at /admin/authoring so production builds
// don't ship the 600+ LOC editor in the main bundle.
const AdminAuthoringPage = import.meta.env.DEV
  ? lazy(() => import('./pages/AdminPage.jsx'))
  : null;
const StatsPage = lazy(() => import('./pages/StatsPage.jsx'));
const PrintTopicPage = lazy(() => import('./pages/PrintTopicPage.jsx'));
const CheatsheetPage = lazy(() => import('./pages/CheatsheetPage.jsx'));
const RoundPage = lazy(() => import('./pages/RoundPage.jsx'));
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const SignupPage = lazy(() => import('./pages/SignupPage.jsx'));
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'));
const KnowledgePage = lazy(() => import('./pages/KnowledgePage.jsx'));
const PricingPage = lazy(() => import('./pages/PricingPage.jsx'));
const ContactPage = lazy(() => import('./pages/ContactPage.jsx'));

export default function App() {
  // Probe the backend exactly once on app boot so the auth UI knows whether
  // to render before the user clicks anything. Doing it lazily on first
  // AccountMenu interaction caused a flicker race where backendAvailable
  // was still null at first paint.
  useEffect(() => {
    useAuth.getState().probeBackend(apiBaseUrl);
    // Warm bottom-nav route chunks during idle so the first tap on any
    // tab doesn't spend ~150ms waiting on a network round-trip.
    prefetchIdle();
    // Bring up the analytics SDK if a provider is configured. Lazy: no
    // network bytes if neither VITE_POSTHOG_KEY nor VITE_PLAUSIBLE_DOMAIN
    // is set at build time.
    initAnalytics();
    // Re-identify the persisted user on boot so retention cohorts survive
    // a page refresh / new tab without an extra login.
    const { user } = useAuth.getState();
    if (user?.id) identify(String(user.id), { email: user.email });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LangProvider>
        <ErrorBoundary>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
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
              </Route>
            </Routes>
          </BrowserRouter>
        </ErrorBoundary>
      </LangProvider>
    </QueryClientProvider>
  );
}
