/**
 * Tests for the dual-mode API layer.
 *
 * Every read/write in the app goes through `tryRemote(remote, fallback)`.
 * When the backend is absent (GitHub Pages), unreachable (offline) or 401s
 * (expired session), the app has to keep working off `seed/static-data.json`
 * plus localStorage — and the localStorage progress map is the *only* copy of
 * an anonymous user's history. A regression here either bricks the offline app
 * or silently drops progress, and neither throws anywhere visible.
 *
 * Both `axios` and `fetch` are mocked so the remote/fallback branch is chosen
 * deterministically rather than by whatever is listening on :3001.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import type { Question, Topic, User } from '../types/domain.ts';

const mocks = vi.hoisted(() => ({
  axiosInstance: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
  toast: { message: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

vi.mock('axios', () => ({
  default: { create: vi.fn(() => mocks.axiosInstance) },
}));

vi.mock('sonner', () => ({ toast: mocks.toast }));

// ── Fixture: a miniature static-data.json ────────────────────────────────────
// Deliberately stored out of display order so the fallback's own sorting is
// what the assertions observe.
const TOPICS: Topic[] = [
  {
    id: 1,
    title: 'Dart Basics',
    slug: 'dart-basics',
    level: 'junior',
    category: 'language',
    description: 'Dart fundamentals',
    icon: '',
    order_index: 2,
  },
  {
    id: 2,
    title: 'Streams',
    slug: 'streams',
    level: 'mid',
    category: 'async',
    description: 'Reactive Dart',
    icon: '',
    order_index: 1,
  },
];

const QUESTIONS: Question[] = [
  {
    id: 10,
    topic_id: 1,
    order_index: 2,
    difficulty: 'easy',
    question: 'What is a Future?',
    answer: 'A Future represents a value available later.',
    code_example: null,
    code_language: 'dart',
  },
  {
    id: 11,
    topic_id: 1,
    order_index: 1,
    difficulty: 'hard',
    question: 'Explain isolates',
    answer: 'Isolates are independent workers with their own memory.',
    code_example: null,
    code_language: 'dart',
  },
  {
    id: 20,
    topic_id: 2,
    order_index: 1,
    difficulty: 'medium',
    question: 'What is a StreamController?',
    answer: 'It exposes a sink and a broadcast stream.',
    code_example: null,
    code_language: 'dart',
  },
];

const STATIC_PAYLOAD = { topics: TOPICS, questions: QUESTIONS };

// The key is load-bearing: it predates the rename to Onsite and holds every
// anonymous user's progress. Renaming it silently wipes them, so the literal
// is asserted rather than imported.
const PROGRESS_KEY = 'readytoflutter_progress_v1';

const FAKE_USER: User = {
  id: 1,
  email: 'user@example.test',
  name: 'Test',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  is_admin: 0,
  pro_tier: 'free',
  pro_expires_at: null,
};

let fetchMock: ReturnType<typeof vi.fn>;

const okFetch = () => vi.fn(async () => ({
  ok: true,
  status: 200,
  json: async () => JSON.parse(JSON.stringify(STATIC_PAYLOAD)),
}));

const seedProgress = (map: Record<string, unknown>) => {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(map));
};

// Fresh module graph per test: api.ts memoises the static bundle and throttles
// the offline toast in module scope, so leaking that state between tests would
// make assertions depend on ordering.
type ApiModule = typeof import('./api');
let api: ApiModule;

const loadApi = async (): Promise<ApiModule> => {
  vi.resetModules();
  return import('./api');
};

beforeEach(async () => {
  Object.values(mocks.axiosInstance).forEach((v) => {
    if (typeof v === 'function' && 'mockReset' in v) (v as ReturnType<typeof vi.fn>).mockReset();
  });
  mocks.axiosInstance.interceptors.request.use.mockReset();
  mocks.axiosInstance.interceptors.response.use.mockReset();
  mocks.toast.message.mockReset();

  fetchMock = okFetch();
  vi.stubGlobal('fetch', fetchMock);

  api = await loadApi();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// Make every remote call fail the way an absent backend does.
const backendDown = () => {
  const err = Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' });
  mocks.axiosInstance.get.mockRejectedValue(err);
  mocks.axiosInstance.post.mockRejectedValue(err);
  mocks.axiosInstance.delete.mockRejectedValue(err);
};

const backendUnauthorized = () => {
  const err = Object.assign(new Error('Request failed with status code 401'), {
    response: { status: 401, data: { error: 'Authentication required' } },
  });
  mocks.axiosInstance.get.mockRejectedValue(err);
  mocks.axiosInstance.post.mockRejectedValue(err);
  mocks.axiosInstance.delete.mockRejectedValue(err);
};

describe('tryRemote — remote wins when the backend answers', () => {
  it('returns the server payload and never reads the static bundle', async () => {
    const serverTopics = [{ ...TOPICS[0], question_count: 99, completed_count: 7 }];
    mocks.axiosInstance.get.mockResolvedValue({ data: serverTopics });

    const topics = await api.getTopics();

    expect(topics).toEqual(serverTopics);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.axiosInstance.get).toHaveBeenCalledWith('/topics', { params: {} });
  });

  it('forwards the level filter to the server instead of filtering client-side', async () => {
    mocks.axiosInstance.get.mockResolvedValue({ data: [] });

    await api.getTopics('mid');

    expect(mocks.axiosInstance.get).toHaveBeenCalledWith('/topics', { params: { level: 'mid' } });
  });
});

describe('tryRemote — static-data fallback when the backend is unreachable', () => {
  beforeEach(() => { backendDown(); });

  it('serves topics from static-data.json with progress counts from localStorage', async () => {
    seedProgress({
      10: { status: 'completed', notes: null, updated_at: '2026-01-01T00:00:00.000Z' },
      20: { status: 'in_progress', notes: null, updated_at: '2026-01-01T00:00:00.000Z' },
    });

    const topics = await api.getTopics();

    // The path carries the build's base — `/readytoflutter/` in GitHub
    // Actions, `/` locally — so read it from the same place the module does
    // rather than hard-coding the local form (which is what made this test
    // green on a laptop and red in CI).
    expect(fetchMock).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}seed/static-data.json`);
    // Sorted by order_index — Streams (1) before Dart Basics (2).
    expect(topics.map((t) => t.slug)).toEqual(['streams', 'dart-basics']);
    expect(topics.find((t) => t.id === 1)).toMatchObject({ question_count: 2, completed_count: 1 });
    expect(topics.find((t) => t.id === 2)).toMatchObject({ question_count: 1, completed_count: 0 });
  });

  it('applies the level filter in the fallback so /topics?level= keeps working offline', async () => {
    const topics = await api.getTopics('junior');
    expect(topics.map((t) => t.slug)).toEqual(['dart-basics']);
  });

  it('serves a single topic with its questions ordered and progress merged in', async () => {
    seedProgress({
      10: { status: 'completed', notes: 'my note', updated_at: '2026-01-01T00:00:00.000Z' },
    });

    const topic = await api.getTopic('dart-basics');

    expect(topic.questions.map((q) => q.id)).toEqual([11, 10]);
    expect(topic.questions.find((q) => q.id === 10)).toMatchObject({
      status: 'completed',
      notes: 'my note',
    });
    // Questions with no stored progress must default, not come back undefined.
    expect(topic.questions.find((q) => q.id === 11)).toMatchObject({
      status: 'not_started',
      notes: null,
    });
    expect(topic).toMatchObject({ question_count: 2, completed_count: 1 });
  });

  it('rejects with a 404-shaped error for an unknown topic slug', async () => {
    // The route renders a "not found" page off `err.status`; a bare throw
    // would render a generic crash instead.
    await expect(api.getTopic('no-such-topic')).rejects.toMatchObject({ status: 404 });
  });

  it('sorts questions by topic order then question order, joining topic metadata', async () => {
    const questions = await api.getQuestions();

    expect(questions.map((q) => q.id)).toEqual([20, 11, 10]);
    expect(questions[0]).toMatchObject({
      topic_title: 'Streams',
      topic_slug: 'streams',
      level: 'mid',
    });
  });

  it('filters questions by level and difficulty offline', async () => {
    expect((await api.getQuestions({ level: 'junior' })).map((q) => q.id)).toEqual([11, 10]);
    expect((await api.getQuestions({ difficulty: 'hard' })).map((q) => q.id)).toEqual([11]);
    expect((await api.getQuestions({ level: 'mid', difficulty: 'hard' }))).toEqual([]);
  });

  it('searches question text and answer text case-insensitively offline', async () => {
    expect((await api.getQuestions({ search: 'ISOLATES' })).map((q) => q.id)).toEqual([11]);
    // "broadcast" only appears in an answer.
    expect((await api.getQuestions({ search: 'broadcast' })).map((q) => q.id)).toEqual([20]);
    expect(await api.getQuestions({ search: 'nothing matches this' })).toEqual([]);
    // A whitespace-only search must not filter everything away.
    expect((await api.getQuestions({ search: '   ' })).map((q) => q.id)).toEqual([20, 11, 10]);
  });

  it('computes stats from the local progress map', async () => {
    seedProgress({
      10: { status: 'completed', notes: null, updated_at: '2026-01-01T00:00:00.000Z' },
      11: { status: 'in_progress', notes: null, updated_at: '2026-01-01T00:00:00.000Z' },
      20: { status: 'not_started', notes: null, updated_at: '2026-01-01T00:00:00.000Z' },
    });

    const stats = await api.getStats();

    expect(stats).toEqual({
      totalQuestions: 3,
      completed: 1,
      inProgress: 1,
      byLevel: [
        { level: 'junior', count: 2 },
        { level: 'mid', count: 1 },
      ],
    });
  });

  it('propagates the failure when the static bundle itself cannot be fetched', async () => {
    // Both sides down must reject rather than resolve with `undefined`, which
    // would render an empty dashboard as if the user had no data.
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })));
    api = await loadApi();
    backendDown();

    await expect(api.getTopics()).rejects.toThrow(/Failed to load static data: 404/);
  });
});

describe('localStorage progress round-trip', () => {
  beforeEach(() => { backendDown(); });

  it('persists a progress write under the legacy storage key and reads it back', async () => {
    const result = await api.updateProgress(10, 'completed', 'nailed it');

    expect(result).toMatchObject({ success: true, status: 'completed', notes: 'nailed it' });
    expect(typeof result.updated_at).toBe('string');
    expect(Number.isNaN(Date.parse(result.updated_at))).toBe(false);

    const raw = JSON.parse(localStorage.getItem(PROGRESS_KEY) as string);
    expect(raw['10']).toMatchObject({ status: 'completed', notes: 'nailed it' });
    expect(api.readLocalProgress()['10']).toMatchObject({ status: 'completed' });
  });

  it('makes a fallback write visible to the very next fallback read', async () => {
    // This is the whole point of the offline mode: mark a card done, navigate,
    // and see it still done.
    await api.updateProgress(10, 'completed');
    await api.updateProgress(11, 'in_progress');

    const stats = await api.getStats();
    expect(stats.completed).toBe(1);
    expect(stats.inProgress).toBe(1);

    const topic = await api.getTopic('dart-basics');
    expect(topic.questions.find((q) => q.id === 10)?.status).toBe('completed');
    expect(topic.completed_count).toBe(1);
  });

  it('overwrites the entry for a question instead of appending a second one', async () => {
    await api.updateProgress(10, 'in_progress', 'first pass');
    await api.updateProgress(10, 'completed', null);

    const stored = api.readLocalProgress();
    expect(Object.keys(stored)).toEqual(['10']);
    expect(stored['10']).toMatchObject({ status: 'completed', notes: null });
  });

  it('resetProgress empties the map without removing the key', async () => {
    await api.updateProgress(10, 'completed');

    await expect(api.resetProgress()).resolves.toEqual({ success: true });

    expect(api.readLocalProgress()).toEqual({});
    expect((await api.getStats()).completed).toBe(0);
  });

  it('survives a corrupt localStorage payload rather than crashing every read', async () => {
    // The production path logs the parse failure; silence it so a passing run
    // has no stderr noise.
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem(PROGRESS_KEY, '{not json');

    expect(api.readLocalProgress()).toEqual({});
    const stats = await api.getStats();
    expect(stats.completed).toBe(0);
    expect(stats.totalQuestions).toBe(3);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('clearLocalProgress drops only the progress key', async () => {
    await api.updateProgress(10, 'completed');
    localStorage.setItem('rtf:srs:v1', '{"1":{}}');

    api.clearLocalProgress();

    expect(localStorage.getItem(PROGRESS_KEY)).toBeNull();
    expect(localStorage.getItem('rtf:srs:v1')).toBe('{"1":{}}');
  });

  it('serializeLocalProgress builds the bulk payload and drops unusable entries', async () => {
    // Feeds POST /api/progress/bulk on first login. A wrong shape here means a
    // silent 400 or a skipped import — the user's offline history never lands
    // on the server.
    seedProgress({
      10: { status: 'completed', notes: 'note', updated_at: '2026-01-01T00:00:00.000Z' },
      11: { status: 'in_progress', updated_at: '2026-02-01T00:00:00.000Z' },
      12: { notes: 'no status' },
      'not-a-number': { status: 'completed' },
    });

    const items = api.serializeLocalProgress(api.readLocalProgress());

    expect(items).toEqual([
      { questionId: 10, status: 'completed', notes: 'note', updated_at: '2026-01-01T00:00:00.000Z' },
      { questionId: 11, status: 'in_progress', notes: null, updated_at: '2026-02-01T00:00:00.000Z' },
    ]);
    expect(items.every((i) => typeof i.questionId === 'number')).toBe(true);
  });

  it('serializeLocalProgress tolerates an empty or missing map', () => {
    expect(api.serializeLocalProgress({})).toEqual([]);
    expect(api.serializeLocalProgress(null)).toEqual([]);
    expect(api.serializeLocalProgress(undefined)).toEqual([]);
  });
});

describe('offline write notification', () => {
  it('warns a signed-in user once that a write only landed locally', async () => {
    const { useAuth } = await import('../store/auth');
    useAuth.getState().setSession('a-token', FAKE_USER);
    backendDown();

    await api.updateProgress(10, 'completed');
    await api.updateProgress(11, 'completed');

    // Throttled to one toast per 30s so rating a stack of cards offline
    // doesn't produce a wall of toasts.
    expect(mocks.toast.message).toHaveBeenCalledTimes(1);
    expect(mocks.toast.message).toHaveBeenCalledWith('Saved locally', expect.anything());
    // The writes themselves still landed.
    expect(Object.keys(api.readLocalProgress()).sort()).toEqual(['10', '11']);
  });

  it('stays silent for an anonymous user, for whom local-only is normal', async () => {
    const { useAuth } = await import('../store/auth');
    useAuth.getState().clearSession();
    backendDown();

    await api.updateProgress(10, 'completed');

    expect(mocks.toast.message).not.toHaveBeenCalled();
    expect(api.readLocalProgress()['10']).toMatchObject({ status: 'completed' });
  });

  it('stays silent on reads, which fall back constantly on GitHub Pages', async () => {
    const { useAuth } = await import('../store/auth');
    useAuth.getState().setSession('a-token', FAKE_USER);
    backendDown();

    await api.getTopics();
    await api.getStats();

    expect(mocks.toast.message).not.toHaveBeenCalled();
  });
});

describe('401 handling', () => {
  it('clears the session on a 401 and still rejects so callers see the failure', async () => {
    const { useAuth } = await import('../store/auth');
    useAuth.getState().setSession('expired-token', FAKE_USER);

    const onRejected = mocks.axiosInstance.interceptors.response.use.mock.calls[0][1];
    const err = { response: { status: 401 } };

    await expect(onRejected(err)).rejects.toBe(err);
    expect(useAuth.getState().token).toBeNull();
    expect(useAuth.getState().user).toBeNull();
    expect(mocks.toast.message).toHaveBeenCalledWith('Session expired', expect.anything());
  });

  it('does not toast a session expiry at an anonymous user who never had a token', async () => {
    const { useAuth } = await import('../store/auth');
    useAuth.getState().clearSession();

    const onRejected = mocks.axiosInstance.interceptors.response.use.mock.calls[0][1];
    await expect(onRejected({ response: { status: 401 } })).rejects.toBeTruthy();

    expect(mocks.toast.message).not.toHaveBeenCalled();
  });

  it('leaves the session alone on a non-401 failure', async () => {
    const { useAuth } = await import('../store/auth');
    useAuth.getState().setSession('a-token', FAKE_USER);

    const onRejected = mocks.axiosInstance.interceptors.response.use.mock.calls[0][1];
    await expect(onRejected({ response: { status: 500 } })).rejects.toBeTruthy();

    expect(useAuth.getState().token).toBe('a-token');
  });

  it('keeps every read working off static data once the backend 401s', async () => {
    // The whole reason the fallback exists: an expired token must degrade to
    // anonymous mode, not to a blank app.
    backendUnauthorized();
    seedProgress({
      10: { status: 'completed', notes: null, updated_at: '2026-01-01T00:00:00.000Z' },
    });

    const [topics, topic, questions, stats] = await Promise.all([
      api.getTopics(),
      api.getTopic('dart-basics'),
      api.getQuestions(),
      api.getStats(),
    ]);

    expect(topics).toHaveLength(2);
    expect(topic.questions).toHaveLength(2);
    expect(questions).toHaveLength(3);
    expect(stats.completed).toBe(1);
  });
});

describe('static-data caching', () => {
  beforeEach(() => { backendDown(); });

  it('fetches the static bundle once and reuses it across reads', async () => {
    await api.getTopics();
    await api.getQuestions();
    await api.getStats();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('invalidateStaticData forces the next read to re-fetch', async () => {
    await api.getTopics();
    api.invalidateStaticData();
    await api.getTopics();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not memoise a failed fetch, so a transient outage self-heals', async () => {
    const failing = vi.fn(async () => { throw new Error('offline'); });
    vi.stubGlobal('fetch', failing);
    api = await loadApi();
    backendDown();

    await expect(api.getTopics()).rejects.toThrow('offline');

    vi.stubGlobal('fetch', okFetch());
    const topics = await api.getTopics();
    expect(topics).toHaveLength(2);
  });
});

describe('auth calls have no fallback', () => {
  it('rejects instead of pretending a login succeeded when the backend is absent', async () => {
    // A silent success here would hand out a fake session with no token.
    backendDown();

    await expect(api.authLogin('user@example.test', 'password')).rejects.toThrow('Network Error');
    await expect(api.authRegister('user@example.test', 'password', null)).rejects.toThrow('Network Error');
  });

  it('aiHealth and billingHealth fail closed so the UI hides the feature', async () => {
    backendDown();

    await expect(api.aiHealth()).resolves.toEqual({ enabled: false });
    await expect(api.billingHealth()).resolves.toEqual({ enabled: false });
  });
});
