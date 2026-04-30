import axios from 'axios';
import { toast } from 'sonner';
import { queryClient } from '../lib/queryClient.js';
import { useAuth } from '../store/auth.js';

// Production fallback for GitHub Pages: when we're served from *.github.io
// and the build wasn't given an explicit VITE_API_BASE_URL, point at the
// Render-hosted backend so auth/sync still work.
const PROD_API_FALLBACK = 'https://readytoflutter.onrender.com/api';
const onGithubPages = typeof window !== 'undefined'
  && window.location.hostname.endsWith('.github.io');

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL
  || (onGithubPages ? PROD_API_FALLBACK : '/api');
const api = axios.create({ baseURL: apiBaseUrl });

// Attach the auth token (if any) to every outgoing request. Reading from the
// store on each request keeps things in sync after login/logout without
// re-creating the axios instance.
api.interceptors.request.use((config) => {
  const token = useAuth.getState().token;
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 → clear local session AND drop the TanStack Query cache so stale
// auth-scoped data doesn't keep rendering. Fallbacks below then take over
// for any caller that depends on progress reads.
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err?.response?.status === 401) {
      const { token, clearSession } = useAuth.getState();
      if (token) {
        queryClient.clear();
        clearSession();
        toast.message('Session expired', { description: 'Please sign in again.' });
      }
    }
    return Promise.reject(err);
  },
);

export { api, apiBaseUrl };

const STATIC_DATA_URL = `${import.meta.env.BASE_URL}seed/static-data.json`;
const PROGRESS_STORAGE_KEY = 'readytoflutter_progress_v1';
// Re-fetch the static bundle once an hour. Without this, a user with an
// open tab keeps serving the in-memory copy from the first load — so seed
// changes deployed mid-session never appear until the next hard reload.
const STATIC_DATA_TTL_MS = 60 * 60 * 1000;

let staticDataPromise = null;
let staticDataLoadedAt = 0;

const loadStaticData = () => {
  const fresh = staticDataPromise && (Date.now() - staticDataLoadedAt) < STATIC_DATA_TTL_MS;
  if (fresh) return staticDataPromise;

  staticDataPromise = fetch(STATIC_DATA_URL)
    .then(async (res) => {
      if (!res.ok) throw new Error(`Failed to load static data: ${res.status}`);
      const data = await res.json();
      staticDataLoadedAt = Date.now();
      return data;
    })
    .catch((err) => {
      // Reset on error so the next caller retries instead of memoizing failure.
      staticDataPromise = null;
      staticDataLoadedAt = 0;
      throw err;
    });

  return staticDataPromise;
};

// Force a reload of the static bundle on next read — used after admin edits
// or after the user signs in (server data may now differ from baked seed).
export const invalidateStaticData = () => {
  staticDataPromise = null;
  staticDataLoadedAt = 0;
};

const readProgress = () => {
  try {
    const data = localStorage.getItem(PROGRESS_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Failed to read progress from localStorage:', error);
    return {};
  }
};

const writeProgress = (progress) => {
  try {
    const data = JSON.stringify(progress);
    localStorage.setItem(PROGRESS_STORAGE_KEY, data);
  } catch (error) {
    console.error('Failed to write progress to localStorage:', error);
    // Check if quota exceeded
    if (error.name === 'QuotaExceededError') {
      alert('Storage quota exceeded. Please clear some browser data.');
    }
    throw error;
  }
};

const withProgress = (question, progress) => {
  const p = progress[String(question.id)] || null;
  return {
    ...question,
    status: p?.status || 'not_started',
    notes: p?.notes || null,
  };
};

const buildTopicStats = (topics, questions, progress) => {
  const countByTopic = new Map();
  const completedByTopic = new Map();

  questions.forEach((q) => {
    countByTopic.set(q.topic_id, (countByTopic.get(q.topic_id) || 0) + 1);
    const p = progress[String(q.id)];
    if (p?.status === 'completed') {
      completedByTopic.set(q.topic_id, (completedByTopic.get(q.topic_id) || 0) + 1);
    }
  });

  return topics.map((t) => ({
    ...t,
    question_count: countByTopic.get(t.id) || 0,
    completed_count: completedByTopic.get(t.id) || 0,
  }));
};

const fallbackGetTopics = async (level) => {
  const { topics, questions } = await loadStaticData();
  const progress = readProgress();
  const enriched = buildTopicStats(topics, questions, progress)
    .filter((t) => (level ? t.level === level : true))
    .sort((a, b) => a.order_index - b.order_index);
  return enriched;
};

const fallbackGetTopic = async (slug) => {
  const { topics, questions } = await loadStaticData();
  const progress = readProgress();

  const topic = topics.find((t) => t.slug === slug);
  if (!topic) {
    const err = new Error('Topic not found');
    err.status = 404;
    throw err;
  }

  const topicQuestions = questions
    .filter((q) => q.topic_id === topic.id)
    .sort((a, b) => a.order_index - b.order_index)
    .map((q) => withProgress(q, progress));

  const completedCount = topicQuestions.filter((q) => q.status === 'completed').length;

  return {
    ...topic,
    question_count: topicQuestions.length,
    completed_count: completedCount,
    questions: topicQuestions,
  };
};

const fallbackGetQuestions = async (params = {}) => {
  const { topics, questions } = await loadStaticData();
  const progress = readProgress();
  const topicById = new Map(topics.map((t) => [t.id, t]));

  const search = params.search?.trim().toLowerCase();

  return questions
    .map((q) => {
      const topic = topicById.get(q.topic_id);
      return {
        ...withProgress(q, progress),
        topic_title: topic?.title,
        level: topic?.level,
        topic_slug: topic?.slug,
      };
    })
    .filter((q) => (params.level ? q.level === params.level : true))
    .filter((q) => (params.difficulty ? q.difficulty === params.difficulty : true))
    .filter((q) => {
      if (!search) return true;
      return (
        q.question.toLowerCase().includes(search)
        || q.answer.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => {
      const ta = topicById.get(a.topic_id)?.order_index ?? 0;
      const tb = topicById.get(b.topic_id)?.order_index ?? 0;
      if (ta !== tb) return ta - tb;
      return a.order_index - b.order_index;
    });
};

const fallbackGetStats = async () => {
  const { topics, questions } = await loadStaticData();
  const progress = readProgress();

  const totalQuestions = questions.length;
  const values = Object.values(progress);
  const completed = values.filter((p) => p.status === 'completed').length;
  const inProgress = values.filter((p) => p.status === 'in_progress').length;

  const byLevelMap = new Map();
  const topicById = new Map(topics.map((t) => [t.id, t]));

  questions.forEach((q) => {
    const level = topicById.get(q.topic_id)?.level;
    if (!level) return;
    byLevelMap.set(level, (byLevelMap.get(level) || 0) + 1);
  });

  const levelOrder = ['junior', 'mid', 'senior'];
  const byLevel = levelOrder
    .filter((level) => byLevelMap.has(level))
    .map((level) => ({ level, count: byLevelMap.get(level) }));

  return { totalQuestions, completed, inProgress, byLevel };
};

const fallbackUpdateProgress = async (questionId, status, notes) => {
  const progress = readProgress();
  const now = new Date().toISOString();
  progress[String(questionId)] = {
    status,
    notes: notes || null,
    updated_at: now,
  };
  writeProgress(progress);
  return { success: true, status, notes: notes || null, updated_at: now };
};

const fallbackResetProgress = async () => {
  writeProgress({});
  return { success: true };
};

// Throttle the "saved locally" toast so a burst of writes (e.g. rating 10
// cards in a row while offline) doesn't fire 10 toasts.
let lastOfflineToastAt = 0;
const tryRemote = async (fn, fallbackFn, opts = {}) => {
  try {
    return await fn();
  } catch {
    // 401 is handled by the interceptor (clears session). For other failures
    // — likely network/5xx — fall back to localStorage. If the user has a
    // session token (i.e. *expected* server sync) and the failure is a write,
    // surface a single toast every 30s so they know writes aren't reaching the
    // server.
    if (opts.notifyOnWrite && useAuth.getState().token && (Date.now() - lastOfflineToastAt) > 30_000) {
      lastOfflineToastAt = Date.now();
      toast.message('Saved locally', {
        description: 'Backend unreachable — your progress will sync once you reconnect.',
      });
    }
    return fallbackFn();
  }
};

export const getTopics = (level) =>
  tryRemote(
    () => api.get('/topics', { params: level ? { level } : {} }).then((r) => r.data),
    () => fallbackGetTopics(level),
  );

export const getTopic = (slug) =>
  tryRemote(
    () => api.get(`/topics/${slug}`).then((r) => r.data),
    () => fallbackGetTopic(slug),
  );

export const getQuestions = (params) =>
  tryRemote(
    () => api.get('/questions', { params }).then((r) => r.data),
    () => fallbackGetQuestions(params),
  );

export const getStats = () =>
  tryRemote(
    () => api.get('/stats').then((r) => r.data),
    fallbackGetStats,
  );

export const updateProgress = (questionId, status, notes) =>
  tryRemote(
    () => api.post(`/progress/${questionId}`, { status, notes }).then((r) => r.data),
    () => fallbackUpdateProgress(questionId, status, notes),
    { notifyOnWrite: true },
  );

export const resetProgress = () =>
  tryRemote(
    () => api.delete('/progress/reset').then((r) => r.data),
    fallbackResetProgress,
    { notifyOnWrite: true },
  );

// ── Auth ────────────────────────────────────────────────────────────────────
// These don't have static fallbacks — auth is only meaningful with a real
// backend. Callers handle the rejection (LoginPage etc).

export const authRegister = (email, password, name) =>
  api.post('/auth/register', { email, password, name }).then((r) => r.data);

export const authLogin = (email, password) =>
  api.post('/auth/login', { email, password }).then((r) => r.data);

export const authLogout = () =>
  api.post('/auth/logout').then((r) => r.data).catch(() => ({ ok: true }));

export const authMe = () =>
  api.get('/auth/me').then((r) => r.data);

export const authUpdateName = (name) =>
  api.put('/auth/me', { name }).then((r) => r.data);

export const authChangePassword = (currentPassword, newPassword) =>
  api.put('/auth/password', { currentPassword, newPassword }).then((r) => r.data);

export const authChangeEmail = (currentPassword, newEmail) =>
  api.put('/auth/email', { currentPassword, newEmail }).then((r) => r.data);

export const authDeleteAccount = () =>
  api.delete('/auth/me').then((r) => r.data);

// Bulk import — used at first login to migrate localStorage progress to the
// server. Items use the same shape as the in-browser store.
export const bulkSyncProgress = (items) =>
  api.post('/progress/bulk', { items }).then((r) => r.data);

// Read raw localStorage progress so the sync helper can transform it for the
// bulk endpoint without touching the rest of the dual-mode plumbing.
export const readLocalProgress = () => {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const clearLocalProgress = () => {
  try { localStorage.removeItem(PROGRESS_STORAGE_KEY); } catch { /* ignore */ }
};

// Translate localStorage progress shape into the /api/progress/bulk payload.
// Used by signup (first-time import) and login (merge any anonymous activity).
export const serializeLocalProgress = (progress) =>
  Object.entries(progress || {})
    .map(([key, value]) => ({
      questionId: Number(key),
      status: value?.status,
      notes: value?.notes || null,
      updated_at: value?.updated_at || new Date().toISOString(),
    }))
    .filter((p) => p.questionId && p.status);
