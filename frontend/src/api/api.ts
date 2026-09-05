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
  Roadmap,
  QuestionSummary,
  QuestionAnswer,
  SrsCard,
  LiveTask,
  LiveTaskSolution,
  AiCodeReview,
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

// A Pages build with no backend wired up at all. Every remote call would go
// to `<site>/api/...`, wait for GitHub's 404 (~600 ms on a phone) and only
// then fall back to the static data — on every uncached query, so opening a
// topic paid that wait after its chunk had already arrived. tryRemote skips
// the round trip entirely in this build; the app is anonymous-only anyway.
export const noBackend: boolean = typeof window !== 'undefined'
  && onGithubPages && !import.meta.env.VITE_API_BASE_URL && !PROD_API_FALLBACK;

if (noBackend) {
  // One-time soft warning so a Pages deploy without either env doesn't
  // silently swallow auth — visible in the browser console for whoever's
  // wiring up a new fork.
  console.warn(
    '[api] Running on GitHub Pages without VITE_API_BASE_URL or VITE_PROD_API_FALLBACK_URL. '
    + 'Auth/sync will be unavailable; the app stays functional in anonymous mode.',
  );
}
// The timeout is what makes tryRemote's fallback reachable: a backend that
// accepts the connection and never answers (captive portal, dead proxy, hung
// dyno) otherwise pins a write in flight forever, with the status control
// disabled and nothing saved anywhere. Long enough to ride out a cold start.
const REQUEST_TIMEOUT_MS = 15_000;
// A model call takes as long as it takes.
const AI_TIMEOUT_MS = 60_000;
const api: AxiosInstance = axios.create({ baseURL: apiBaseUrl, timeout: REQUEST_TIMEOUT_MS });

// Attach the auth token (if any) to every outgoing request. Reading from the
// store on each request keeps things in sync after login/logout without
// re-creating the axios instance.
api.interceptors.request.use((config) => {
  const token = useAuth.getState().token;
  if (token) {
    if (config.headers) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// The API layer sits outside React, so the two toasts it raises read the
// saved language directly instead of going through LangContext.
const isRu = (): boolean =>
  typeof localStorage !== 'undefined' && localStorage.getItem('lang') === 'ru';

// 401 → clear local session AND reset the TanStack Query cache so stale
// auth-scoped data doesn't keep rendering. `resetQueries` (not `clear`) keeps
// the mounted observers attached and refetches them, so the page that was on
// screen re-renders from the fallbacks instead of going blank. Fallbacks below
// then take over for any caller that depends on progress reads.
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err?.response?.status === 401) {
      const { token, clearSession } = useAuth.getState();
      if (token) {
        clearSession();
        void queryClient.resetQueries();
        toast.message(
          isRu() ? 'Сессия истекла' : 'Session expired',
          { description: isRu() ? 'Войди снова.' : 'Please sign in again.' },
        );
      }
    }
    return Promise.reject(err);
  },
);

export { api, apiBaseUrl };

// ── Static-data fallback (anonymous / GitHub Pages) ─────────────────────────

// The catalogue: every question without its answer. Answers live in
// `seed/answers/<topic slug>.json`, loaded by `loadAnswers` when a topic,
// session or search needs them — see the generator's header for why.
interface StaticDataPayload {
  topics: Topic[];
  questions: QuestionSummary[];
  roadmap: Roadmap;
  tasks: LiveTask[];
}

interface LocalProgressEntry {
  status: ProgressStatus;
  notes?: string | null;
  updated_at: string;
}

type LocalProgressMap = Record<string, LocalProgressEntry>;

const STATIC_DATA_URL = `${import.meta.env.BASE_URL}seed/static-data.json`;
// The key predates the rename to Onsite and deliberately keeps the old name:
// it holds every anonymous user's progress, so renaming it silently wipes
// them. Changing it requires a read-old → write-new migration first.
const PROGRESS_STORAGE_KEY = 'readytoflutter_progress_v1';
// Re-fetch the static bundle once an hour. Without this, a user with an
// open tab keeps serving the in-memory copy from the first load — so seed
// changes deployed mid-session never appear until the next hard reload.
const STATIC_DATA_TTL_MS = 60 * 60 * 1000;

let staticDataPromise: Promise<StaticDataPayload> | null = null;
let staticDataLoadedAt = 0;
let staticDataLastGood: StaticDataPayload | null = null;

const loadStaticData = (): Promise<StaticDataPayload> => {
  const fresh = staticDataPromise !== null
    && Date.now() - staticDataLoadedAt < STATIC_DATA_TTL_MS;
  if (fresh && staticDataPromise) return staticDataPromise;

  // Stamp the start time before the fetch: concurrent callers during a stale
  // refresh then see a recent stamp and share this promise, instead of each
  // starting its own download and 2 MB parse.
  staticDataLoadedAt = Date.now();
  staticDataPromise = fetch(STATIC_DATA_URL)
    .then(async (res) => {
      if (!res.ok) throw new Error(`Failed to load static data: ${res.status}`);
      const data = (await res.json()) as StaticDataPayload;
      staticDataLoadedAt = Date.now();
      staticDataLastGood = data;
      return data;
    })
    .catch((err) => {
      // A failed refresh must not throw away a bundle we already have — that
      // turned one bad hourly refresh into an app where every read rejects.
      // Serve the last good copy; a reload or invalidateStaticData retries.
      if (staticDataLastGood) {
        staticDataPromise = Promise.resolve(staticDataLastGood);
        return staticDataLastGood;
      }
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
  staticDataLastGood = null;
  answersPromises.clear();
  solutionPromises.clear();
};

// ── Answers: one file per topic ──────────────────────────────────────────────

type AnswerRow = QuestionAnswer & { id: number };

const answersUrl = (slug: string): string =>
  `${import.meta.env.BASE_URL}seed/answers/${encodeURIComponent(slug)}.json`;

// One in-flight or settled fetch per topic for the life of the page; the
// files only change with a deploy, and the service worker keeps them
// network-first like the catalogue.
const answersPromises = new Map<string, Promise<AnswerRow[]>>();

const loadAnswers = (slug: string): Promise<AnswerRow[]> => {
  const cached = answersPromises.get(slug);
  if (cached) return cached;
  const pending = fetch(answersUrl(slug))
    .then(async (res) => {
      if (!res.ok) throw new Error(`Failed to load answers for ${slug}: ${res.status}`);
      return (await res.json()) as AnswerRow[];
    })
    .catch((err: unknown) => {
      // Don't memoise a failure — a dropped request shouldn't blank the
      // topic's answers for the rest of the session.
      answersPromises.delete(slug);
      throw err;
    });
  answersPromises.set(slug, pending);
  return pending;
};

const toAnswerMap = (rows: ReadonlyArray<{ id: number } & QuestionAnswer>): Record<number, QuestionAnswer> =>
  Object.fromEntries(rows.map((r) => [r.id, { answer: r.answer, code_example: r.code_example }]));

// ── Live-coding solutions: one file per task ─────────────────────────────────

const solutionUrl = (slug: string): string =>
  `${import.meta.env.BASE_URL}seed/solutions/${encodeURIComponent(slug)}.json`;

// Same one-promise-per-slug memo the answers loader uses: a solution only
// changes with a deploy, and the review screen may ask for it twice.
const solutionPromises = new Map<string, Promise<LiveTaskSolution>>();

const loadSolution = (slug: string): Promise<LiveTaskSolution> => {
  const cached = solutionPromises.get(slug);
  if (cached) return cached;
  const pending = fetch(solutionUrl(slug))
    .then(async (res) => {
      if (!res.ok) throw new Error(`Failed to load solution for ${slug}: ${res.status}`);
      return (await res.json()) as LiveTaskSolution;
    })
    .catch((err: unknown) => {
      solutionPromises.delete(slug);
      throw err;
    });
  solutionPromises.set(slug, pending);
  return pending;
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
      toast.error(
        isRu() ? 'Хранилище переполнено' : 'Storage full',
        { description: isRu() ? 'Очисти данные сайта в браузере.' : 'Clear some browser data.' },
      );
    }
    throw error;
  }
};

const withProgress = <Q extends QuestionSummary>(question: Q, progress: LocalProgressMap): Q => {
  const p = progress[String(question.id)] || null;
  return {
    ...question,
    status: p?.status || 'not_started',
    notes: p?.notes || null,
  };
};

const buildTopicStats = (
  topics: Topic[],
  questions: QuestionSummary[],
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

  // The catalogue carries the topic's questions; their answers are the
  // topic's own file, merged back by id.
  const answersById = new Map((await loadAnswers(topic.slug)).map((row) => [row.id, row]));
  const topicQuestions: Question[] = questions
    .filter((q) => q.topic_id === topic.id)
    .sort((a, b) => a.order_index - b.order_index)
    .map((q) => {
      const body = answersById.get(q.id);
      return {
        ...withProgress(q, progress),
        answer: body?.answer ?? '',
        code_example: body?.code_example ?? null,
      };
    });

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

const fallbackGetQuestions = async (params: QuestionFilterParams = {}): Promise<QuestionSummary[]> => {
  const { topics, questions } = await loadStaticData();
  const progress = readProgress();
  const topicById = new Map(topics.map((t) => [t.id, t]));

  const search = params.search?.trim().toLowerCase();

  return questions
    .map((q): QuestionSummary => {
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
    // The catalogue has no answer text; the Search page indexes answers
    // itself once it has loaded them per topic.
    .filter((q) => (search ? q.question.toLowerCase().includes(search) : true))
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
  const known = new Set(questions.map((q) => q.id));
  const values = Object.entries(progress)
    .filter(([id]) => known.has(Number(id)))
    .map(([, entry]) => entry);
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
  if (noBackend) return fallbackFn();
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
      toast.message(isRu() ? 'Сохранено локально' : 'Saved locally', {
        description: isRu()
          ? 'Сервер недоступен. Прогресс синхронизируется, когда связь вернётся.'
          : 'Backend unreachable. Your progress will sync once you reconnect.',
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

export const getQuestions = (params?: QuestionFilterParams): Promise<QuestionSummary[]> =>
  tryRemote(
    () => api.get<QuestionSummary[]>('/questions', { params }).then((r) => r.data),
    () => fallbackGetQuestions(params),
  );

/**
 * The answers of one topic, keyed by question id. The server's topic route
 * already carries them; the static bundle keeps them in the topic's own
 * file, fetched on demand and shared by every card that shows an answer.
 */
export const getAnswers = (slug: string): Promise<Record<number, QuestionAnswer>> =>
  tryRemote(
    () => api.get<FallbackTopicWithQuestions>(`/topics/${slug}`).then((r) => toAnswerMap(r.data.questions)),
    () => loadAnswers(slug).then(toAnswerMap),
  );

/**
 * The live-coding catalogue: every task without its solution or rubric.
 *
 * There is no `/api/tasks` route and there does not need to be — the tasks are
 * curated seed content with no per-user state, so both arms read the same
 * static bundle the frontend already ships. The `tryRemote` wrapper is what
 * keeps this honest if a server route ever appears: only the first argument
 * changes, and anonymous mode keeps working untouched.
 */
export const getLiveTasks = (): Promise<LiveTask[]> =>
  tryRemote(
    () => loadStaticData().then((d) => d.tasks || []),
    () => loadStaticData().then((d) => d.tasks || []),
  );

/** One task's reference solution, rubric and notes. */
export const getLiveTaskSolution = (slug: string): Promise<LiveTaskSolution> =>
  tryRemote(
    () => loadSolution(slug),
    () => loadSolution(slug),
  );

export const getStats = (): Promise<Stats> =>
  tryRemote(
    () => api.get<Stats>('/stats').then((r) => r.data),
    fallbackGetStats,
  );

// The roadmap is static content with no per-user state, generated from the
// same seed as the questions, so it is read straight from the bundle the
// frontend ships — there is no API route to try first. Progress is layered
// on client-side from the questions' own status fields.
export const getRoadmap = (): Promise<Roadmap> =>
  loadStaticData().then((d) => d.roadmap);

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
  // A signed-in reset must reach the server — if it can't, it rejects so the
  // caller shows a failure and the local-only SRS schedule is left intact,
  // rather than reporting success, wiping the schedule, and leaving the
  // server's rows to reappear on reconnect. Anonymous users have no server,
  // so their reset legitimately falls back to clearing localStorage.
  useAuth.getState().token
    ? api.delete<{ success: boolean }>('/progress/reset').then((r) => r.data)
    : tryRemote(
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
  /**
   * Present only on the register response. This is the single moment the
   * recovery code exists outside the user's own notes — the server keeps only
   * a bcrypt hash of it — so the caller must make them save it before
   * navigating away. It is never returned again.
   */
  recoveryCode?: string;
}

export const authRegister = (email: string, password: string, name: string | null): Promise<AuthResponse> =>
  api.post<AuthResponse>('/auth/register', { email, password, name }).then((r) => r.data);

export const authLogin = (email: string, password: string): Promise<AuthResponse> =>
  api.post<AuthResponse>('/auth/login', { email, password }).then((r) => r.data);

export const authLogout = (): Promise<{ ok: boolean }> =>
  api.post<{ ok: boolean }>('/auth/logout').then((r) => r.data).catch(() => ({ ok: true }));

export const authUpdateName = (name: string | null): Promise<{ user: User }> =>
  api.put<{ user: User }>('/auth/me', { name }).then((r) => r.data);

// The change signs every other session out; `token` is this session's
// replacement from the new epoch.
export const authChangePassword = (
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: boolean; token?: string }> =>
  api.put<{ ok: boolean; token?: string }>('/auth/password', { currentPassword, newPassword }).then((r) => r.data);

export const authChangeEmail = (
  currentPassword: string,
  newEmail: string,
): Promise<AuthResponse> =>
  api.put<AuthResponse>('/auth/email', { currentPassword, newEmail }).then((r) => r.data);

// ── Push reminders ──────────────────────────────────────────────────────────
// Spaced repetition only works if the learner comes back on the day a card is
// due. The server cannot compute that — SM-2 state lives in this browser's
// localStorage — so the client reports its own due snapshot and the server
// schedules from it. See backend/push.js.

export interface PushDevice {
  id: number;
  created_at: string;
  last_seen_at: string | null;
  last_notified_at: string | null;
}

export interface PushHealth {
  enabled: boolean;
  reason: string | null;
  /** Required as `applicationServerKey`; without it the browser cannot subscribe. */
  publicKey: string | null;
  sendHourLocal: number;
  quietHourLocal: number;
  staleDays: number;
  /** Only present for a signed-in caller. */
  devices?: PushDevice[];
}

/** The browser's PushSubscription, narrowed to what the server stores. */
export interface PushSubscriptionPayload {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/**
 * The client's view of what is due. `nextDueAt` is ISO 8601 — the SRS store
 * keeps `dueAt` as epoch milliseconds, so convert with `new Date(ms).toISOString()`.
 * It is what lets the job stay quiet until there is something to say.
 */
export interface PushStateReport {
  dueCount: number;
  nextDueAt?: string | null;
  tzOffsetMinutes?: number;
}

export const pushHealth = (): Promise<PushHealth> =>
  tryRemote(
    () => api.get<PushHealth>('/push/health').then((r) => r.data),
    async () => ({
      enabled: false, reason: 'unreachable', publicKey: null,
      sendHourLocal: 9, quietHourLocal: 22, staleDays: 30,
    }),
  );

export const pushSubscribe = (
  subscription: PushSubscriptionPayload,
  state: PushStateReport,
): Promise<{ ok: boolean; device: { id: number; created_at: string } }> =>
  api.post('/push/subscribe', { subscription, ...state }).then((r) => r.data);

/**
 * A full snapshot, not a patch — omitting `nextDueAt` clears the stored value.
 * Always send the complete picture.
 */
export const pushReportState = (
  endpoint: string,
  state: PushStateReport,
): Promise<{ ok: boolean }> =>
  api.post<{ ok: boolean }>('/push/state', { endpoint, ...state }).then((r) => r.data);

export const pushUnsubscribe = (endpoint: string): Promise<{ ok: boolean; removed: boolean }> =>
  api.post<{ ok: boolean; removed: boolean }>('/push/unsubscribe', { endpoint }).then((r) => r.data);

export const pushSendTest = (): Promise<{ ok: boolean; sent: number; gone: number; failed: number }> =>
  api.post('/push/test', {}).then((r) => r.data);

// ── Account recovery ────────────────────────────────────────────────────────
// There is no email provider, so "forgot password" is a single-use code. See
// the block comment in backend/auth.js for the reasoning.

/** Replaces the live code with a new one. Gated by the current password. */
export const authRegenerateRecoveryCode = (
  currentPassword: string,
): Promise<{ recoveryCode: string }> =>
  api.post<{ recoveryCode: string }>('/auth/recovery/regenerate', { currentPassword })
    .then((r) => r.data);

/**
 * Sets a new password from a recovery code. Deliberately does NOT return a
 * session — the caller sends the user to sign in. `recoveryCode` in the reply
 * is the *replacement*: the one just used is spent, and this is the only time
 * the new one is shown.
 */
export const authResetWithRecoveryCode = (
  email: string,
  code: string,
  newPassword: string,
): Promise<{ ok: boolean; recoveryCode: string }> =>
  api.post<{ ok: boolean; recoveryCode: string }>('/auth/recovery/reset', { email, code, newPassword })
    .then((r) => r.data);

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

// Push any writes that landed in localStorage while the backend was
// unreachable up to the server, then clear them. A signed-in user's offline
// writes used to sit in localStorage forever — the "will sync once you
// reconnect" toast promised a sync that nothing performed — and the next read
// returned the server's pre-offline row, reverting their work on screen. Safe
// to call repeatedly: the server merges by updated_at, and with no token or an
// empty queue it is a no-op. Runs on boot and on every `online` event (App).
export const flushLocalProgress = async (): Promise<{ imported: number; skipped: number } | null> => {
  if (!useAuth.getState().token) return null;
  const items = serializeLocalProgress(readLocalProgress());
  if (items.length === 0) return null;
  const result = await bulkSyncProgress(items);
  clearLocalProgress();
  return result;
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

// ── SRS schedule sync ───────────────────────────────────────────────────────
// Auth-only, and deliberately not wrapped in tryRemote: there is no fallback
// to run, because localStorage *is* the working copy. A failure here only
// means the account's copy is stale, and lib/srsSync.ts retries on the next
// boot or `online` event.
export const getSrsCards = (): Promise<SrsCard[]> =>
  api.get<{ cards: SrsCard[] }>('/srs').then((r) => r.data?.cards || []);

export const bulkSyncSrsCards = (
  cards: SrsCard[],
): Promise<{ imported: number; skipped: number }> =>
  api.post<{ imported: number; skipped: number }>('/srs/bulk', { cards }).then((r) => r.data);

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
  tryRemote(
    () => api.get<AiHealthResponse>('/ai/health').then((r) => r.data),
    async () => ({ enabled: false }),
  );

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
  api.post<AiGradeResponse>('/ai/grade', { questionId, userAnswer, lang }, { timeout: AI_TIMEOUT_MS }).then((r) => r.data);

export interface AiReviewArgs {
  taskSlug: string;
  code: string;
  lang: 'en' | 'ru';
}

export interface AiReviewResponse {
  review: AiCodeReview;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens: number;
  };
}

export const aiReviewCode = ({ taskSlug, code, lang }: AiReviewArgs): Promise<AiReviewResponse> =>
  api.post<AiReviewResponse>('/ai/review-code', { taskSlug, code, lang }, { timeout: AI_TIMEOUT_MS }).then((r) => r.data);

export interface AiDraftArgs {
  prompt: string;
  topicTitle?: string;
  topicLevel?: Level;
  lang: 'en' | 'ru';
}

export const aiDraftQuestion = (args: AiDraftArgs): Promise<{ draft: unknown; usage?: unknown }> =>
  api.post<{ draft: unknown; usage?: unknown }>('/ai/draft-question', args, { timeout: AI_TIMEOUT_MS }).then((r) => r.data);

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
  tryRemote(
    () => api.get<BillingHealthResponse>('/billing/health').then((r) => r.data),
    async () => ({ enabled: false }),
  );

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
