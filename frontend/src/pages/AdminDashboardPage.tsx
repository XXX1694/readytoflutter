import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, type NavigateFunction } from 'react-router-dom';
import * as Tabs from '@radix-ui/react-tabs';
import {
  Shield, BarChart3, Users, Inbox, FileText, ArrowLeft,
  Loader2, Search, Check, RotateCcw, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../store/auth';
import { useLang, type Lang } from '../i18n/LangContext';
import { ruPlural } from '../i18n/plural';
import { Button, Eyebrow, Pill } from '../ui/index';
import {
  adminGetStats, adminListUsers, adminPatchUser,
  adminListContact, adminPatchContact,
} from '../api/api';
import { cn } from '../lib/cn';
import type { AdminStats, ContactMessage, ProTier, User } from '../types/domain';

// /admin/users joins two aggregate columns that aren't part of the shared
// User shape (see the query in backend/database.js).
type AdminUserRow = User & {
  progress_count: number;
  last_active_at: string | null;
};

const EN = {
  title: 'Admin', back: 'Back to home',
  tabOverview: 'Overview', tabUsers: 'Users', tabInbox: 'Inbox', tabContent: 'Content',
  notSignedIn: 'Sign in required', notSignedInSub: 'Admin requires an account.',
  notAdmin: 'Not authorized', notAdminSub: 'Your account does not have admin access.',
  backendDown: 'Backend unavailable',
  overview: {
    eyebrow: 'Snapshot',
    users: 'Users', proUsers: 'Pro users',
    signups24h: 'Signups · 24h', signups7d: 'Signups · 7d',
    active7d: 'Active · 7d', active30d: 'Active · 30d',
    totalProgress: 'Progress rows', completed: 'Completed',
    aiGrades24h: 'AI grades · 24h', openContacts: 'Open tickets',
    questions: 'Questions', topics: 'Topics',
    failed: 'Could not load the stats.',
  },
  users: {
    eyebrow: 'Users', searchPh: 'email or name…',
    email: 'Email', joined: 'Joined', last: 'Last active', progress: 'Progress',
    tier: 'Tier', admin: 'Admin', actions: 'Actions',
    makeAdmin: 'Make admin', removeAdmin: 'Remove admin',
    promotePro: 'Set Pro', promoteLifetime: 'Set Lifetime', demoteFree: 'Set Free',
    totalLabel: (n: number) => `${n} users`,
    loadMore: 'Load more',
    loadFailed: 'Could not load the users.',
    updated: 'Saved', updateFailed: 'Could not save the change.',
  },
  inbox: {
    eyebrow: 'Inbox',
    open: 'Open', resolved: 'Resolved', all: 'All',
    markResolved: 'Mark resolved', reopen: 'Reopen',
    empty: 'No messages here yet.',
    loadFailed: 'Could not load the inbox.',
    updated: 'Saved', updateFailed: 'Could not save the change.',
  },
  content: {
    title: 'Content authoring',
    desc: 'In-browser question editor with a localStorage diff and JSON export. Available in dev builds only.',
    open: 'Open authoring tool',
    devOnly: 'Dev only',
  },
};

type AdminCopy = typeof EN;

const RU: AdminCopy = {
  title: 'Админка', back: 'На главную',
  tabOverview: 'Обзор', tabUsers: 'Пользователи', tabInbox: 'Входящие', tabContent: 'Контент',
  notSignedIn: 'Требуется вход', notSignedInSub: 'Админка работает только с аккаунтом.',
  notAdmin: 'Доступ запрещён', notAdminSub: 'У этого аккаунта нет прав админа.',
  backendDown: 'Бэкенд недоступен',
  overview: {
    eyebrow: 'Снимок',
    users: 'Пользователей', proUsers: 'Pro-юзеров',
    signups24h: 'Регистрации · 24ч', signups7d: 'Регистрации · 7д',
    active7d: 'Активны · 7д', active30d: 'Активны · 30д',
    totalProgress: 'Записей прогресса', completed: 'Завершено',
    aiGrades24h: 'AI-проверок · 24ч', openContacts: 'Открытых тикетов',
    questions: 'Вопросов', topics: 'Тем',
    failed: 'Не удалось загрузить статистику.',
  },
  users: {
    eyebrow: 'Пользователи', searchPh: 'email или имя…',
    email: 'Email', joined: 'Регистрация', last: 'Активность', progress: 'Прогресс',
    tier: 'Тариф', admin: 'Админ', actions: 'Действия',
    makeAdmin: 'Сделать админом', removeAdmin: 'Снять права',
    promotePro: 'Выдать Pro', promoteLifetime: 'Выдать Lifetime', demoteFree: 'Сделать Free',
    totalLabel: (n: number) => `${n} ${ruPlural(n, 'пользователь', 'пользователя', 'пользователей')}`,
    loadMore: 'Ещё',
    loadFailed: 'Не удалось загрузить пользователей.',
    updated: 'Сохранено', updateFailed: 'Не удалось сохранить изменение.',
  },
  inbox: {
    eyebrow: 'Входящие',
    open: 'Открытые', resolved: 'Закрытые', all: 'Все',
    markResolved: 'Закрыть', reopen: 'Открыть снова',
    empty: 'Сообщений пока нет.',
    loadFailed: 'Не удалось загрузить входящие.',
    updated: 'Сохранено', updateFailed: 'Не удалось сохранить изменение.',
  },
  content: {
    title: 'Редактирование контента',
    desc: 'Редактор вопросов в браузере с локальным diff и экспортом JSON. Доступен только в dev-сборке.',
    open: 'Открыть редактор',
    devOnly: 'Только dev',
  },
};

const COPY: Record<Lang, AdminCopy> = { en: EN, ru: RU };

const PAGE_SIZE = 50;

function fmtDate(s: string | null | undefined, locale: string): string {
  if (!s) return '—';
  return new Date(s).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtRelative(s: string | null | undefined, locale: string): string {
  if (!s) return '—';
  const ru = locale.startsWith('ru');
  const d = (Date.now() - new Date(s).getTime()) / 1000;
  if (d < 60) return ru ? 'сейчас' : 'now';
  if (d < 3600) return `${Math.floor(d / 60)}${ru ? 'м' : 'm'}`;
  if (d < 86400) return `${Math.floor(d / 3600)}${ru ? 'ч' : 'h'}`;
  if (d < 86400 * 30) return `${Math.floor(d / 86400)}${ru ? 'д' : 'd'}`;
  return new Date(s).toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

export default function AdminDashboardPage() {
  const { lang } = useLang();
  const T = COPY[lang];
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const token = useAuth((s) => s.token);
  const backendAvailable = useAuth((s) => s.backendAvailable);

  // Auth gates first — keep them dumb so the heavy data hooks below never
  // fire for unauthorized viewers.
  if (backendAvailable === false) {
    return <GateMessage title={T.backendDown} navigate={navigate} backLabel={T.back} />;
  }
  if (!token) {
    return <GateMessage title={T.notSignedIn} sub={T.notSignedInSub} navigate={navigate} backLabel={T.back} />;
  }
  if (!user?.is_admin) {
    return <GateMessage title={T.notAdmin} sub={T.notAdminSub} navigate={navigate} backLabel={T.back} />;
  }

  return (
    <div className="bg-page min-h-full px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/"
          className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          {T.back}
        </Link>

        <header className="mb-7">
          <h1 className="font-display text-3xl font-medium leading-tight text-ink sm:text-4xl">
            {T.title}
          </h1>
          <p className="mt-1 text-sm text-muted">{user.email}</p>
        </header>

        <Tabs.Root defaultValue="overview">
          <Tabs.List className="mb-6 inline-flex flex-wrap items-center gap-px rounded-md border border-rule/12 bg-paper-2 p-0.5">
            <TabTrigger value="overview" icon={<BarChart3 className="h-3.5 w-3.5" />}>{T.tabOverview}</TabTrigger>
            <TabTrigger value="users" icon={<Users className="h-3.5 w-3.5" />}>{T.tabUsers}</TabTrigger>
            <TabTrigger value="inbox" icon={<Inbox className="h-3.5 w-3.5" />}>{T.tabInbox}</TabTrigger>
            <TabTrigger value="content" icon={<FileText className="h-3.5 w-3.5" />}>{T.tabContent}</TabTrigger>
          </Tabs.List>

          <Tabs.Content value="overview" className="outline-none">
            <OverviewTab T={T.overview} />
          </Tabs.Content>
          <Tabs.Content value="users" className="outline-none">
            <UsersTab T={T.users} lang={lang} self={user} />
          </Tabs.Content>
          <Tabs.Content value="inbox" className="outline-none">
            <InboxTab T={T.inbox} lang={lang} />
          </Tabs.Content>
          <Tabs.Content value="content" className="outline-none">
            <ContentTab T={T.content} />
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </div>
  );
}

interface TabTriggerProps {
  value: string;
  icon: ReactNode;
  children: ReactNode;
}

function TabTrigger({ value, icon, children }: TabTriggerProps) {
  return (
    <Tabs.Trigger
      value={value}
      className={cn(
        'inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-[13px] font-medium text-muted transition-colors',
        'data-[state=active]:bg-ink data-[state=active]:text-paper hover:text-ink',
      )}
    >
      {icon}
      {children}
    </Tabs.Trigger>
  );
}

interface GateMessageProps {
  title: string;
  sub?: string;
  navigate: NavigateFunction;
  backLabel: string;
}

function GateMessage({ title, sub, navigate, backLabel }: GateMessageProps) {
  return (
    <div className="bg-page flex min-h-full items-center justify-center px-4">
      <div className="max-w-md text-center">
        <Shield className="mx-auto mb-3 h-8 w-8 text-muted" aria-hidden />
        <h1 className="font-display text-2xl text-ink">{title}</h1>
        {sub && <p className="mt-2 text-sm text-ink-2">{sub}</p>}
        <Button variant="codex" size="md" className="mt-5" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Button>
      </div>
    </div>
  );
}

// ── Overview ─────────────────────────────────────────────────────────────────

function OverviewTab({ T }: { T: AdminCopy['overview'] }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    adminGetStats()
      .then((d) => { if (alive) { setStats(d); setLoading(false); } })
      .catch(() => { if (alive) { setFailed(true); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  if (loading) return <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted" aria-hidden />;
  if (failed || !stats) return <p className="text-sm text-coral">{T.failed}</p>;

  const tiles: Array<{ label: string; value: number }> = [
    { label: T.users, value: stats.totalUsers },
    { label: T.proUsers, value: stats.proUsers },
    { label: T.signups24h, value: stats.signups24h },
    { label: T.signups7d, value: stats.signups7d },
    { label: T.active7d, value: stats.activeUsers7d },
    { label: T.active30d, value: stats.activeUsers30d },
    { label: T.totalProgress, value: stats.totalProgress },
    { label: T.completed, value: stats.completed },
    { label: T.aiGrades24h, value: stats.aiGrades24h },
    { label: T.openContacts, value: stats.openContacts },
    { label: T.questions, value: stats.totalQuestions },
    { label: T.topics, value: stats.totalTopics },
  ];

  return (
    <section>
      <Eyebrow className="mb-4">{T.eyebrow}</Eyebrow>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="codex-card p-4">
            <div className="text-[13px] text-muted">{tile.label}</div>
            <div className="num mt-2 text-3xl text-ink">{tile.value.toLocaleString()}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Users ────────────────────────────────────────────────────────────────────

interface UsersTabProps {
  T: AdminCopy['users'];
  lang: Lang;
  self: User;
}

function UsersTab({ T, lang, self }: UsersTabProps) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';

  // First page, debounced on the search box. Later pages come from `loadMore`,
  // which appends rather than replacing.
  useEffect(() => {
    let alive = true;
    const id = setTimeout(() => {
      setLoading(true);
      adminListUsers({ q, limit: PAGE_SIZE, offset: 0 })
        .then(({ rows, total: count }) => {
          if (!alive) return;
          setItems(rows as AdminUserRow[]);
          setTotal(count);
        })
        .catch(() => { if (alive) toast.error(T.loadFailed); })
        .finally(() => { if (alive) setLoading(false); });
    }, 250);
    return () => { alive = false; clearTimeout(id); };
  }, [q, T.loadFailed]);

  const loadMore = () => {
    setLoading(true);
    adminListUsers({ q, limit: PAGE_SIZE, offset: items.length })
      .then(({ rows, total: count }) => {
        setItems((prev) => [...prev, ...(rows as AdminUserRow[])]);
        setTotal(count);
      })
      .catch(() => toast.error(T.loadFailed))
      .finally(() => setLoading(false));
  };

  const update = async (
    id: number,
    patch: { proTier?: ProTier; isAdmin?: boolean },
    label: string,
  ) => {
    setBusy(`${id}:${label}`);
    try {
      const { user } = await adminPatchUser(id, patch);
      setItems((prev) => prev.map((u) => (u.id === id ? { ...u, ...user } : u)));
      toast.success(T.updated);
    } catch {
      toast.error(T.updateFailed);
    } finally {
      setBusy(null);
    }
  };

  const actionClass = 'rounded border border-rule/15 px-2 py-0.5 text-[12px] text-muted transition-colors hover:border-rule/35 hover:text-ink disabled:opacity-50';

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Eyebrow>{T.eyebrow}</Eyebrow>
        <span className="text-[13px] text-muted">{T.totalLabel(total)}</span>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-md border border-rule/12 bg-paper-2 px-3 py-2">
        <Search className="h-4 w-4 text-muted" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={T.searchPh}
          aria-label={T.searchPh}
          className="w-full bg-transparent text-sm text-ink placeholder:text-muted-2 focus:outline-none"
        />
      </div>

      <div className="codex-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rule/12 text-left text-[12px] font-medium text-muted">
              <th className="px-3 py-2">{T.email}</th>
              <th className="px-3 py-2">{T.joined}</th>
              <th className="px-3 py-2 text-right">{T.progress}</th>
              <th className="px-3 py-2">{T.last}</th>
              <th className="px-3 py-2">{T.tier}</th>
              <th className="px-3 py-2">{T.admin}</th>
              <th className="px-3 py-2 text-right">{T.actions}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id} className="border-b border-rule/8 last:border-0">
                <td className="px-3 py-2.5">
                  <div className="text-ink">{u.email}</div>
                  {u.name && <div className="text-xs text-muted">{u.name}</div>}
                </td>
                <td className="px-3 py-2.5 text-ink-2">{fmtDate(u.created_at, locale)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-ink-2">{u.progress_count}</td>
                <td className="px-3 py-2.5 text-ink-2">{fmtRelative(u.last_active_at, locale)}</td>
                <td className="px-3 py-2.5">
                  <Pill tone={u.pro_tier === 'free' ? 'ghost' : (u.pro_tier === 'lifetime' ? 'plum' : 'brand')}>
                    {u.pro_tier}
                  </Pill>
                </td>
                <td className="px-3 py-2.5">
                  {u.is_admin ? <Pill tone="ink">{T.admin}</Pill> : <span className="text-muted">—</span>}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {u.pro_tier !== 'pro' && (
                      <button
                        onClick={() => update(u.id, { proTier: 'pro' }, 'pro')}
                        disabled={busy === `${u.id}:pro`}
                        className={actionClass}
                      >{T.promotePro}</button>
                    )}
                    {u.pro_tier !== 'lifetime' && (
                      <button
                        onClick={() => update(u.id, { proTier: 'lifetime' }, 'lifetime')}
                        disabled={busy === `${u.id}:lifetime`}
                        className={actionClass}
                      >{T.promoteLifetime}</button>
                    )}
                    {u.pro_tier !== 'free' && (
                      <button
                        onClick={() => update(u.id, { proTier: 'free' }, 'free')}
                        disabled={busy === `${u.id}:free`}
                        className={actionClass}
                      >{T.demoteFree}</button>
                    )}
                    {u.id !== self.id && (
                      <button
                        onClick={() => update(u.id, { isAdmin: !u.is_admin }, 'admin')}
                        disabled={busy === `${u.id}:admin`}
                        className={actionClass}
                      >{u.is_admin ? T.removeAdmin : T.makeAdmin}</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {items.length < total && (
        <div className="mt-3 text-center">
          <Button variant="ghost" size="sm" onClick={loadMore} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {T.loadMore}
          </Button>
        </div>
      )}
    </section>
  );
}

// ── Inbox ────────────────────────────────────────────────────────────────────

type InboxFilter = 'open' | 'resolved' | 'all';

interface InboxTabProps {
  T: AdminCopy['inbox'];
  lang: Lang;
}

function InboxTab({ T, lang }: InboxTabProps) {
  const [filter, setFilter] = useState<InboxFilter>('open');
  const [items, setItems] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';

  useEffect(() => {
    let alive = true;
    adminListContact({ status: filter === 'all' ? null : filter, limit: 100 })
      .then(({ rows }) => { if (alive) setItems(rows); })
      .catch(() => { if (alive) toast.error(T.loadFailed); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [filter, T.loadFailed]);

  // The spinner is raised where the interaction happens rather than inside the
  // effect — a synchronous setState in an effect body just costs a render.
  const changeFilter = (next: InboxFilter) => {
    if (next === filter) return;
    setLoading(true);
    setFilter(next);
  };

  const setStatus = async (id: number, status: 'open' | 'resolved') => {
    setBusy(id);
    try {
      const { message } = await adminPatchContact(id, { status });
      setItems((prev) => prev.map((m) => (m.id === id ? message : m)));
      toast.success(T.updated);
    } catch {
      toast.error(T.updateFailed);
    } finally { setBusy(null); }
  };

  const tabs: Array<[InboxFilter, string]> = [
    ['open', T.open], ['resolved', T.resolved], ['all', T.all],
  ];

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Eyebrow>{T.eyebrow}</Eyebrow>
        <div className="inline-flex gap-px rounded-md border border-rule/12 bg-paper-2 p-0.5">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => changeFilter(key)}
              aria-pressed={filter === key}
              className={cn(
                'rounded px-3 py-1 text-[13px] transition-colors',
                filter === key ? 'bg-ink text-paper' : 'text-muted hover:text-ink',
              )}
            >{label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted" aria-hidden />
      ) : items.length === 0 ? (
        <p className="rounded-md border border-dashed border-rule/20 bg-paper-2 p-8 text-center text-sm text-muted">
          {T.empty}
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((m) => (
            <li key={m.id} className="codex-card p-4">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-medium text-ink">{m.name || m.email}</span>
                  <a href={`mailto:${m.email}`} className="text-[13px] text-muted hover:text-brand">
                    {m.email}
                  </a>
                  {m.user_id && <span className="text-[12px] text-muted-2">user #{m.user_id}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone={m.status === 'resolved' ? 'mint' : 'amber'}>
                    {m.status === 'resolved' ? T.resolved : T.open}
                  </Pill>
                  <span className="text-[12px] text-muted">{fmtRelative(m.created_at, locale)}</span>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm text-ink-2">{m.message}</p>
              <div className="mt-3 flex justify-end">
                {m.status === 'open' ? (
                  <button
                    type="button"
                    onClick={() => setStatus(m.id, 'resolved')}
                    disabled={busy === m.id}
                    className="inline-flex items-center gap-1.5 rounded border border-rule/15 px-2 py-1 text-[12px] text-muted transition-colors hover:border-rule/35 hover:text-ink disabled:opacity-50"
                  >
                    <Check className="h-3 w-3" aria-hidden />{T.markResolved}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setStatus(m.id, 'open')}
                    disabled={busy === m.id}
                    className="inline-flex items-center gap-1.5 rounded border border-rule/15 px-2 py-1 text-[12px] text-muted transition-colors hover:border-rule/35 hover:text-ink disabled:opacity-50"
                  >
                    <RotateCcw className="h-3 w-3" aria-hidden />{T.reopen}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ── Content authoring (handoff to dev-only AdminPage) ───────────────────────

function ContentTab({ T }: { T: AdminCopy['content'] }) {
  const isDev = import.meta.env.DEV;
  return (
    <section>
      <Eyebrow>{T.title}</Eyebrow>
      <p className="mt-3 max-w-xl text-sm text-ink-2">{T.desc}</p>
      <div className="mt-5">
        {isDev ? (
          <Link to="/admin/authoring">
            <Button variant="codex" size="md">
              <ExternalLink className="h-4 w-4" />
              {T.open}
            </Button>
          </Link>
        ) : (
          <Pill tone="ghost">{T.devOnly}</Pill>
        )}
      </div>
    </section>
  );
}
