import axios from 'axios';
import { useAuth } from '../store/auth.js';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
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

// 401 → clear local session. The fallbacks below take over for any caller
// that depends on progress reads.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      const { token, clearSession } = useAuth.getState();
      if (token) clearSession();
    }
    return Promise.reject(err);
  },
);

export { api, apiBaseUrl };

const STATIC_DATA_URL = `${import.meta.env.BASE_URL}seed/static-data.json`;
const PROGRESS_STORAGE_KEY = 'readytoflutter_progress_v1';

let staticDataPromise = null;
let isLoadingStaticData = false;

const loadStaticData = async () => {
  // If already loaded, return cached promise
  if (staticDataPromise) {
    return staticDataPromise;
  }

  // If currently loading, wait for it
  if (isLoadingStaticData) {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (staticDataPromise) {
          clearInterval(checkInterval);
          resolve(staticDataPromise);
        }
      }, 50);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Static data loading timeout'));
      }, 10000);
    });
  }

  // Start loading
  isLoadingStaticData = true;

  staticDataPromise = fetch(STATIC_DATA_URL)
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`Failed to load static data: ${res.status}`);
      }
      return res.json();
    })
    .catch((error) => {
      // Reset on error so it can be retried
      staticDataPromise = null;
      isLoadingStaticData = false;
      throw error;
    })
    .finally(() => {
      isLoadingStaticData = false;
    });

  return staticDataPromise;
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

const tryRemote = async (fn, fallbackFn) => {
  try {
    return await fn();
  } catch {
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
  );

export const resetProgress = () =>
  tryRemote(
    () => api.delete('/progress/reset').then((r) => r.data),
    fallbackResetProgress,
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
