import axios, { type AxiosInstance } from 'axios';
import { toast } from 'sonner';
import { queryClient } from '../lib/queryClient';
import { useAuth } from '../store/auth';

import type {
  Topic,
  Question,
  Stats,
  User,
  ProgressStatus,
  Level,
  Difficulty,
  AdminStats,
  ContactMessage,
  AiGrade,
  ProTier,
} from '../types/domain.ts';

// Production fallback for GitHub Pages: when we're served from *.github.io
// and the build wasn't given an explicit VITE_API_BASE_URL, fall back to
// VITE_PROD_API_FALLBACK_URL (a build-time env). If that's also missing we
// run anonymous-only — every API call goes through the localStorage path.
//
// The fallback URL used to be hardcoded to a specific Render service name,
// which meant a backend rename or domain change would silently break Pages
// auth without any code visibility. Keeping it in env makes the wiring
// inspectable from the workflow / .env.example.
const PROD_API_FALLBACK: string = import.meta.env.VITE_PROD_API_FALLBACK_URL || '';
const onGithubPages: boolean = typeof window !== 'undefined'
  && window.location.hostname.endsWith('.github.io');

const apiBaseUrl: string =
  import.meta.env.VITE_API_BASE_URL
  || (onGithubPages && PROD_API_FALLBACK ? PROD_API_FALLBACK : '/api');

if (typeof window !== 'undefined' && onGithubPages && !import.meta.env.VITE_API_BASE_URL && !PROD_API_FALLBACK) {
  // One-time soft warning so a Pages deploy without either env doesn't
  // silently swallow auth — visible in the browser console for whoever's
  // wiring up a new fork.
  console.warn(
    '[api] Running on GitHub Pages without VITE_API_BASE_URL or VITE_PROD_API_FALLBACK_URL. '
    + 'Auth/sync will be unavailable; the app stays functional in anonymous mode.',
  );
}
const api: AxiosInstance = axios.create({ baseURL: apiBaseUrl });

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

// ── Static-data fallback (anonymous / GitHub Pages) ─────────────────────────

interface StaticDataPayload {
  topics: Topic[];
  questions: Question[];
}

interface LocalProgressEntry {
  status: ProgressStatus;
  notes?: string | null;
  updated_at: string;
}

type LocalProgressMap = Record<string, LocalProgressEntry>;

const STATIC_DATA_URL = `${import.meta.env.BASE_URL}seed/static-data.json`;
const PROGRESS_STORAGE_KEY = 'readytoflutter_progress_v1';
// Re-fetch the static bundle once an hour. Without this, a user with an
// open tab keeps serving the in-memory copy from the first load — so seed
// changes deployed mid-session never appear until the next hard reload.
const STATIC_DATA_TTL_MS = 60 * 60 * 1000;

let staticDataPromise: Promise<StaticDataPayload> | null = null;
let staticDataLoadedAt = 0;

const loadStaticData = (): Promise<StaticDataPayload> => {
  const fresh = staticDataPromise && (Date.now() - staticDataLoadedAt) < STATIC_DATA_TTL_MS;
  if (fresh && staticDataPromise) return staticDataPromise;

  staticDataPromise = fetch(STATIC_DATA_URL)
    .then(async (res) => {
      if (!res.ok) throw new Error(`Failed to load static data: ${res.status}`);
      const data = (await res.json()) as StaticDataPayload;
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
export const invalidateStaticData = (): void => {
  staticDataPromise = null;
  staticDataLoadedAt = 0;
};

const readProgress = (): LocalProgressMap => {
  try {
    const data = localStorage.getItem(PROGRESS_STORAGE_KEY);
    return data ? (JSON.parse(data) as LocalProgressMap) : {};
  } catch (error) {
    console.error('Failed to read progress from localStorage:', error);
    return {};
  }
};

const writeProgress = (progress: LocalProgressMap): void => {
  try {
    const data = JSON.stringify(progress);
    localStorage.setItem(PROGRESS_STORAGE_KEY, data);
  } catch (error) {
    console.error('Failed to write progress to localStorage:', error);
    if ((error as DOMException).name === 'QuotaExceededError') {
      alert('Storage quota exceeded. Please clear some browser data.');
    }
    throw error;
  }
};

const withProgress = (question: Question, progress: LocalProgressMap): Question => {
  const p = progress[String(question.id)] || null;
  return {
    ...question,
    status: p?.status || 'not_started',
    notes: p?.notes || null,
  };
};

const buildTopicStats = (
  topics: Topic[],
  questions: Question[],
  progress: LocalProgressMap,
): Topic[] => {
  const countByTopic = new Map<number, number>();
  const completedByTopic = new Map<number, number>();

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

const fallbackGetTopics = async (level?: Level): Promise<Topic[]> => {
  const { topics, questions } = await loadStaticData();
  const progress = readProgress();
  return buildTopicStats(topics, questions, progress)
    .filter((t) => (level ? t.level === level : true))
    .sort((a, b) => a.order_index - b.order_index);
};

interface FallbackTopicWithQuestions extends Topic {
  questions: Question[];
}

const fallbackGetTopic = async (slug: string): Promise<FallbackTopicWithQuestions> => {
  const { topics, questions } = await loadStaticData();
  const progress = readProgress();

  const topic = topics.find((t) => t.slug === slug);
  if (!topic) {
    const err = new Error('Topic not found') as Error & { status?: number };
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

export interface QuestionFilterParams {
  level?: Level;
  difficulty?: Difficulty;
  search?: string;
}

const fallbackGetQuestions = async (params: QuestionFilterParams = {}): Promise<Question[]> => {
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
      } as Question;
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

const fallbackGetStats = async (): Promise<Stats> => {
  const { topics, questions } = await loadStaticData();
  const progress = readProgress();

  const totalQuestions = questions.length;
  const values = Object.values(progress);
  const completed = values.filter((p) => p.status === 'completed').length;
  const inProgress = values.filter((p) => p.status === 'in_progress').length;

  const byLevelMap = new Map<Level, number>();
  const topicById = new Map(topics.map((t) => [t.id, t]));

  questions.forEach((q) => {
    const level = topicById.get(q.topic_id)?.level;
    if (!level) return;
    byLevelMap.set(level, (byLevelMap.get(level) || 0) + 1);
  });

  const levelOrder: Level[] = ['junior', 'mid', 'senior'];
  const byLevel = levelOrder
    .filter((level) => byLevelMap.has(level))
    .map((level) => ({ level, count: byLevelMap.get(level)! }));

  return { totalQuestions, completed, inProgress, byLevel };
};

interface ProgressUpdateResult {
  success: boolean;
  status: ProgressStatus;
  notes: string | null;
  updated_at: string;
}

const fallbackUpdateProgress = async (
  questionId: number,
  status: ProgressStatus,
  notes?: string | null,
): Promise<ProgressUpdateResult> => {
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

const fallbackResetProgress = async (): Promise<{ success: boolean }> => {
  writeProgress({});
  return { success: true };
};

interface TryRemoteOptions {
  notifyOnWrite?: boolean;
}

// Throttle the "saved locally" toast so a burst of writes (e.g. rating 10
// cards in a row while offline) doesn't fire 10 toasts.
let lastOfflineToastAt = 0;
const tryRemote = async <T>(
  fn: () => Promise<T>,
  fallbackFn: () => Promise<T>,
  opts: TryRemoteOptions = {},
): Promise<T> => {
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

export const getTopics = (level?: Level): Promise<Topic[]> =>
  tryRemote(
    () => api.get<Topic[]>('/topics', { params: level ? { level } : {} }).then((r) => r.data),
    () => fallbackGetTopics(level),
  );

export const getTopic = (slug: string): Promise<FallbackTopicWithQuestions> =>
  tryRemote(
    () => api.get<FallbackTopicWithQuestions>(`/topics/${slug}`).then((r) => r.data),
    () => fallbackGetTopic(slug),
  );

export const getQuestions = (params?: QuestionFilterParams): Promise<Question[]> =>
  tryRemote(
    () => api.get<Question[]>('/questions', { params }).then((r) => r.data),
    () => fallbackGetQuestions(params),
  );

export const getStats = (): Promise<Stats> =>
  tryRemote(
    () => api.get<Stats>('/stats').then((r) => r.data),
    fallbackGetStats,
  );

export const updateProgress = (
  questionId: number,
  status: ProgressStatus,
  notes?: string | null,
): Promise<ProgressUpdateResult> =>
  tryRemote(
    () => api.post<ProgressUpdateResult>(`/progress/${questionId}`, { status, notes }).then((r) => r.data),
    () => fallbackUpdateProgress(questionId, status, notes),
    { notifyOnWrite: true },
  );

export const resetProgress = (): Promise<{ success: boolean }> =>
  tryRemote(
    () => api.delete<{ success: boolean }>('/progress/reset').then((r) => r.data),
    fallbackResetProgress,
    { notifyOnWrite: true },
  );

// ── Auth ────────────────────────────────────────────────────────────────────
// These don't have static fallbacks — auth is only meaningful with a real
// backend. Callers handle the rejection (LoginPage etc).

export interface AuthResponse {
  user: User;
  token: string;
}

export const authRegister = (email: string, password: string, name: string | null): Promise<AuthResponse> =>
  api.post<AuthResponse>('/auth/register', { email, password, name }).then((r) => r.data);

export const authLogin = (email: string, password: string): Promise<AuthResponse> =>
  api.post<AuthResponse>('/auth/login', { email, password }).then((r) => r.data);

export const authLogout = (): Promise<{ ok: boolean }> =>
  api.post<{ ok: boolean }>('/auth/logout').then((r) => r.data).catch(() => ({ ok: true }));

export const authMe = (): Promise<{ user: User }> =>
  api.get<{ user: User }>('/auth/me').then((r) => r.data);

export const authUpdateName = (name: string | null): Promise<{ user: User }> =>
  api.put<{ user: User }>('/auth/me', { name }).then((r) => r.data);

export const authChangePassword = (
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: boolean }> =>
  api.put<{ ok: boolean }>('/auth/password', { currentPassword, newPassword }).then((r) => r.data);

export const authChangeEmail = (
  currentPassword: string,
  newEmail: string,
): Promise<AuthResponse> =>
  api.put<AuthResponse>('/auth/email', { currentPassword, newEmail }).then((r) => r.data);

export const authDeleteAccount = (): Promise<{ ok: boolean }> =>
  api.delete<{ ok: boolean }>('/auth/me').then((r) => r.data);

export interface BulkProgressItem {
  questionId: number;
  status: ProgressStatus;
  notes?: string | null;
  updated_at?: string;
}

// Bulk import — used at first login to migrate localStorage progress to the
// server. Items use the same shape as the in-browser store.
export const bulkSyncProgress = (items: BulkProgressItem[]): Promise<{ imported: number; skipped: number }> =>
  api.post<{ imported: number; skipped: number }>('/progress/bulk', { items }).then((r) => r.data);

// Read raw localStorage progress so the sync helper can transform it for the
// bulk endpoint without touching the rest of the dual-mode plumbing.
export const readLocalProgress = (): LocalProgressMap => {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LocalProgressMap) : {};
  } catch {
    return {};
  }
};

export const clearLocalProgress = (): void => {
  try { localStorage.removeItem(PROGRESS_STORAGE_KEY); } catch { /* ignore */ }
};

// Translate localStorage progress shape into the /api/progress/bulk payload.
// Used by signup (first-time import) and login (merge any anonymous activity).
export const serializeLocalProgress = (progress: LocalProgressMap | null | undefined): BulkProgressItem[] =>
  Object.entries(progress || {})
    .map(([key, value]) => ({
      questionId: Number(key),
      status: value?.status as ProgressStatus,
      notes: value?.notes || null,
      updated_at: value?.updated_at || new Date().toISOString(),
    }))
    .filter((p) => p.questionId && p.status);

// ── AI grader ───────────────────────────────────────────────────────────────
// Server-side feature: the Anthropic API key lives on the backend, the
// frontend just probes /health and posts the user's answer. Both calls
// fail closed — if the backend isn't reachable, aiHealth() resolves to
// { enabled: false } so the UI hides the button silently.

export interface AiHealthResponse {
  enabled: boolean;
  reason?: string | null;
  model?: string;
  minChars?: number;
  tier?: ProTier | 'anon';
  cap?: number;
  remaining?: number;
}

export const aiHealth = (): Promise<AiHealthResponse> =>
  api.get<AiHealthResponse>('/ai/health').then((r) => r.data).catch(() => ({ enabled: false }));

export interface AiGradeArgs {
  questionId: number;
  userAnswer: string;
  lang: 'en' | 'ru';
}

export interface AiGradeResponse {
  grade: AiGrade;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens: number;
  };
}

export const aiGradeAnswer = ({ questionId, userAnswer, lang }: AiGradeArgs): Promise<AiGradeResponse> =>
  api.post<AiGradeResponse>('/ai/grade', { questionId, userAnswer, lang }).then((r) => r.data);

export interface AiDraftArgs {
  prompt: string;
  topicTitle?: string;
  topicLevel?: Level;
  lang: 'en' | 'ru';
}

export const aiDraftQuestion = (args: AiDraftArgs): Promise<{ draft: unknown; usage?: unknown }> =>
  api.post<{ draft: unknown; usage?: unknown }>('/ai/draft-question', args).then((r) => r.data);

// ── Contact form ────────────────────────────────────────────────────────────
export interface ContactArgs {
  name?: string | null;
  email: string;
  message: string;
  website?: string;
}

export const submitContact = (args: ContactArgs): Promise<{ ok: boolean; id?: number }> =>
  api.post<{ ok: boolean; id?: number }>('/contact', args).then((r) => r.data);

// ── Billing (Stripe) ────────────────────────────────────────────────────────
// Health probe so the UI can hide /pricing CTAs cleanly when billing isn't
// configured. Failures resolve to disabled rather than throwing.
export interface BillingHealthResponse {
  enabled: boolean;
  reason?: string | null;
}

export const billingHealth = (): Promise<BillingHealthResponse> =>
  api.get<BillingHealthResponse>('/billing/health').then((r) => r.data).catch(() => ({ enabled: false }));

export const billingCheckout = (): Promise<{ url: string }> =>
  api.post<{ url: string }>('/billing/checkout').then((r) => r.data);

export const billingPortal = (): Promise<{ url: string }> =>
  api.post<{ url: string }>('/billing/portal').then((r) => r.data);

// ── Admin ───────────────────────────────────────────────────────────────────

export const adminGetStats = (): Promise<AdminStats> =>
  api.get<AdminStats>('/admin/stats').then((r) => r.data);

export interface ListUsersArgs {
  q?: string;
  limit?: number;
  offset?: number;
}

export interface AdminUsersResponse {
  rows: User[];
  total: number;
}

export const adminListUsers = ({ q = '', limit = 50, offset = 0 }: ListUsersArgs = {}): Promise<AdminUsersResponse> =>
  api.get<AdminUsersResponse>('/admin/users', { params: { q, limit, offset } }).then((r) => r.data);

export interface AdminUserPatch {
  isAdmin?: boolean;
  proTier?: ProTier;
  proExpiresAt?: string | null;
}

export const adminPatchUser = (id: number, body: AdminUserPatch): Promise<{ user: User }> =>
  api.patch<{ user: User }>(`/admin/users/${id}`, body).then((r) => r.data);

export interface ListContactArgs {
  status?: 'open' | 'resolved' | null;
  limit?: number;
  offset?: number;
}

export interface AdminContactResponse {
  rows: ContactMessage[];
  total: number;
}

export const adminListContact = ({ status = null, limit = 50, offset = 0 }: ListContactArgs = {}): Promise<AdminContactResponse> =>
  api.get<AdminContactResponse>('/admin/contact', { params: { status, limit, offset } }).then((r) => r.data);

export const adminPatchContact = (
  id: number,
  body: { status: 'open' | 'resolved' },
): Promise<{ message: ContactMessage }> =>
  api.patch<{ message: ContactMessage }>(`/admin/contact/${id}`, body).then((r) => r.data);
