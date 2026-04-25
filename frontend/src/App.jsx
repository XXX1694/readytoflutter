import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import Layout from './components/Layout.jsx';
import { LangProvider } from './i18n/LangContext.jsx';
import { queryClient } from './lib/queryClient.js';
import { FullPageLoader } from './ui/index.js';
import './store/prefs.js'; // side-effect: hydrate theme before paint

// Code splitting: lazy load pages
const HomePage = lazy(() => import('./pages/HomePage.jsx'));
const TopicPage = lazy(() => import('./pages/TopicPage.jsx'));
const SearchPage = lazy(() => import('./pages/SearchPage.jsx'));
const StudyPage = lazy(() => import('./pages/StudyPage.jsx'));
const MockPage = lazy(() => import('./pages/MockPage.jsx'));
const BookmarksPage = lazy(() => import('./pages/BookmarksPage.jsx'));
const AdminPage = lazy(() => import('./pages/AdminPage.jsx'));
const StatsPage = lazy(() => import('./pages/StatsPage.jsx'));
const PrintTopicPage = lazy(() => import('./pages/PrintTopicPage.jsx'));

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LangProvider>
        <ErrorBoundary>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
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
              <Route path="/" element={<Layout />}>
                <Route
                  index
                  element={
                    <Suspense fallback={<FullPageLoader />}>
                      <HomePage />
                    </Suspense>
                  }
                />
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
                      <AdminPage />
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
              </Route>
            </Routes>
          </BrowserRouter>
        </ErrorBoundary>
      </LangProvider>
    </QueryClientProvider>
  );
}
