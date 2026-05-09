import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as Tabs from '@radix-ui/react-tabs';
import {
  Shield, BarChart3, Users, Inbox, Crown, Star, FileText, ArrowLeft,
  Loader2, Search, Check, RotateCcw, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../store/auth';
import { useLang } from '../i18n/LangContext.jsx';
import { Button, Eyebrow, Pill } from '../ui/index.js';
import {
  adminGetStats, adminListUsers, adminPatchUser,
  adminListContact, adminPatchContact,
} from '../api/api';
import { cn } from '../lib/cn';

const COPY = {
  en: {
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
    },
    users: {
      eyebrow: 'Users', searchPh: 'email or name…',
      email: 'Email', name: 'Name', joined: 'Joined', last: 'Last active', progress: 'Progress',
      tier: 'Tier', admin: 'Admin', actions: 'Actions',
      makeAdmin: 'Make admin', removeAdmin: 'Remove admin',
      promotePro: 'Set Pro', promoteLifetime: 'Set Lifetime', demoteFree: 'Set Free',
      totalLabel: (n) => `${n} users`,
      loadMore: 'Load more',
    },
    inbox: {
      eyebrow: 'Inbox',
      open: 'Open', resolved: 'Resolved', all: 'All',
      from: 'From', message: 'Message', received: 'Received',
      markResolved: 'Mark resolved', reopen: 'Reopen',
      empty: 'No messages here yet.',
    },
    content: {
      title: 'Content authoring',
      desc: 'In-browser question editor with localStorage diff and JSON export. Available in dev builds only.',
      open: 'Open authoring tool',
      devOnly: 'Dev-only',
    },
  },
  ru: {
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
    },
    users: {
      eyebrow: 'Пользователи', searchPh: 'email или имя…',
      email: 'Email', name: 'Имя', joined: 'Регистрация', last: 'Активность', progress: 'Прогресс',
      tier: 'Тариф', admin: 'Админ', actions: 'Действия',
      makeAdmin: 'Сделать админом', removeAdmin: 'Снять права',
      promotePro: 'Pro', promoteLifetime: 'Lifetime', demoteFree: 'Free',
      totalLabel: (n) => `${n} пользователей`,
      loadMore: 'Ещё',
    },
    inbox: {
      eyebrow: 'Входящие',
      open: 'Открытые', resolved: 'Закрытые', all: 'Все',
      from: 'От', message: 'Сообщение', received: 'Получено',
      markResolved: 'Закрыть', reopen: 'Открыть снова',
      empty: 'Сообщений нет.',
    },
    content: {
      title: 'Редактирование контента',
      desc: 'In-browser редактор вопросов с локальным diff и экспортом JSON. Доступен только в dev-сборке.',
      open: 'Открыть редактор',
      devOnly: 'Только dev',
    },
  },
};

function fmtDate(s, locale) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtRelative(s, locale) {
  if (!s) return '—';
  const d = (Date.now() - new Date(s).getTime()) / 1000;
  if (d < 60) return 'now';
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  if (d < 86400 * 30) return `${Math.floor(d / 86400)}d`;
  return new Date(s).toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

export default function AdminDashboardPage() {
  const { lang } = useLang();
  const T = COPY[lang === 'ru' ? 'ru' : 'en'];
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const token = useAuth((s) => s.token);
  const backendAvailable = useAuth((s) => s.backendAvailable);

  // Auth gates first — keep them dumb so the heavy data hooks below never
  // fire for unauthorized viewers.
  if (backendAvailable === false) {
    return <GateMessage title={T.backendDown} sub="" navigate={navigate} backLabel={T.back} />;
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
          className="mb-5 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted hover:text-ink"
        >
          <ArrowLeft className="h-3 w-3" />
          {T.back}
        </Link>

        <header className="mb-7">
          <Eyebrow accent="brand">
            <Shield className="mr-1 inline h-3 w-3" />
            {T.title}
          </Eyebrow>
          <h1 className="mt-3 font-display text-3xl font-medium leading-tight tracking-tight text-ink sm:text-4xl">
            {T.title}
          </h1>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted">
            {user.email}
          </p>
        </header>

        <Tabs.Root defaultValue="overview">
          <Tabs.List
            className="mb-6 inline-flex flex-wrap items-center gap-px rounded-md border border-rule/15 bg-paper-2 p-0.5 shadow-codex-sm"
          >
            <TabTrigger value="overview" icon={<BarChart3 className="h-3.5 w-3.5" />}>{T.tabOverview}</TabTrigger>
            <TabTrigger value="users" icon={<Users className="h-3.5 w-3.5" />}>{T.tabUsers}</TabTrigger>
            <TabTrigger value="inbox" icon={<Inbox className="h-3.5 w-3.5" />}>{T.tabInbox}</TabTrigger>
            <TabTrigger value="content" icon={<FileText className="h-3.5 w-3.5" />}>{T.tabContent}</TabTrigger>
          </Tabs.List>

          <Tabs.Content value="overview" className="outline-none">
            <OverviewTab T={T.overview} lang={lang} />
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

function TabTrigger({ value, icon, children }) {
  return (
    <Tabs.Trigger
      value={value}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-muted transition-colors',
        'data-[state=active]:bg-ink data-[state=active]:text-paper hover:text-ink',
      )}
    >
      {icon}
      {children}
    </Tabs.Trigger>
  );
}

function GateMessage({ title, sub, navigate, backLabel }) {
  return (
    <div className="bg-page flex min-h-full items-center justify-center px-4">
      <div className="max-w-md text-center">
        <Shield className="mx-auto mb-3 h-8 w-8 text-muted" />
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

function OverviewTab({ T, lang }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    adminGetStats()
      .then((d) => { if (alive) { setStats(d); setLoading(false); } })
      .catch((err) => { if (alive) { setError(err); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  if (loading) return <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted" />;
  if (error || !stats) {
    return <p className="text-sm text-[rgb(var(--coral))]">Failed to load stats</p>;
  }

  const tiles = [
    { label: T.users, value: stats.totalUsers, accent: 'ink' },
    { label: T.proUsers, value: stats.proUsers, accent: 'brand' },
    { label: T.signups24h, value: stats.signups24h, accent: 'mint' },
    { label: T.signups7d, value: stats.signups7d, accent: 'mint' },
    { label: T.active7d, value: stats.activeUsers7d, accent: 'amber' },
    { label: T.active30d, value: stats.activeUsers30d, accent: 'amber' },
    { label: T.totalProgress, value: stats.totalProgress, accent: 'ink' },
    { label: T.completed, value: stats.completed, accent: 'mint' },
    { label: T.aiGrades24h, value: stats.aiGrades24h, accent: 'plum' },
    { label: T.openContacts, value: stats.openContacts, accent: 'coral' },
    { label: T.questions, value: stats.totalQuestions, accent: 'ink' },
    { label: T.topics, value: stats.totalTopics, accent: 'ink' },
  ];

  return (
    <section>
      <Eyebrow className="mb-4">{T.eyebrow}</Eyebrow>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="rounded-lg border border-rule/15 bg-paper-2 p-4 shadow-codex-sm"
          >
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted">{t.label}</div>
            <div className={cn(
              'mt-2 font-display text-3xl font-semibold tabular-nums tracking-tight',
              t.accent === 'brand' && 'text-brand',
              t.accent === 'mint' && 'text-[rgb(var(--mint))]',
              t.accent === 'amber' && 'text-[rgb(var(--amber))]',
              t.accent === 'coral' && 'text-[rgb(var(--coral))]',
              t.accent === 'plum' && 'text-[rgb(var(--plum))]',
              (t.accent === 'ink' || !t.accent) && 'text-ink',
            )}>
              {t.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Users ────────────────────────────────────────────────────────────────────

function UsersTab({ T, lang, self }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';

  const load = (reset = false) => {
    setLoading(true);
    const off = reset ? 0 : offset;
    adminListUsers({ q, limit: 50, offset: off })
      .then(({ rows, total }) => {
        setItems(reset ? rows : [...items, ...rows]);
        setTotal(total);
        setOffset(off + rows.length);
      })
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(true); /* eslint-disable-next-line */ }, []);
  useEffect(() => {
    const id = setTimeout(() => load(true), 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line
  }, [q]);

  const update = async (id, patch, label) => {
    setBusy(id + label);
    try {
      const { user } = await adminPatchUser(id, patch);
      setItems((prev) => prev.map((u) => (u.id === id ? { ...u, ...user } : u)));
      toast.success('Updated');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Update failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Eyebrow>{T.eyebrow}</Eyebrow>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted">{T.totalLabel(total)}</span>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-md border border-rule/15 bg-paper-2 px-3 py-2 shadow-codex-sm">
        <Search className="h-4 w-4 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={T.searchPh}
          className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
        />
      </div>

      <div className="overflow-x-auto rounded-md border border-rule/15 bg-paper-2 shadow-codex-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rule/15 text-left font-mono text-[10px] uppercase tracking-wider text-muted">
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
                    {u.pro_tier === 'free' ? 'free' : (u.pro_tier === 'lifetime' ? <><Crown className="mr-1 inline h-3 w-3" />lifetime</> : <><Star className="mr-1 inline h-3 w-3" />pro</>)}
                  </Pill>
                </td>
                <td className="px-3 py-2.5">
                  {u.is_admin ? <Pill tone="amber">admin</Pill> : <span className="font-mono text-[10px] text-muted">—</span>}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {u.pro_tier !== 'pro' && (
                      <button
                        onClick={() => update(u.id, { proTier: 'pro' }, 'pro')}
                        disabled={busy === u.id + 'pro'}
                        className="rounded border border-rule/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted hover:border-brand/40 hover:text-brand disabled:opacity-50"
                      >{T.promotePro}</button>
                    )}
                    {u.pro_tier !== 'lifetime' && (
                      <button
                        onClick={() => update(u.id, { proTier: 'lifetime' }, 'lifetime')}
                        disabled={busy === u.id + 'lifetime'}
                        className="rounded border border-rule/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted hover:border-plum/40 hover:text-[rgb(var(--plum))] disabled:opacity-50"
                      >{T.promoteLifetime}</button>
                    )}
                    {u.pro_tier !== 'free' && (
                      <button
                        onClick={() => update(u.id, { proTier: 'free' }, 'free')}
                        disabled={busy === u.id + 'free'}
                        className="rounded border border-rule/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted hover:border-rule/40 hover:text-ink disabled:opacity-50"
                      >{T.demoteFree}</button>
                    )}
                    {u.id !== self.id && (
                      <button
                        onClick={() => update(u.id, { isAdmin: !u.is_admin }, 'adm')}
                        disabled={busy === u.id + 'adm'}
                        className="rounded border border-rule/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted hover:border-amber/40 hover:text-[rgb(var(--amber))] disabled:opacity-50"
                      >{u.is_admin ? T.removeAdmin : T.makeAdmin}</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {offset < total && (
        <div className="mt-3 text-center">
          <Button variant="ghost" size="sm" onClick={() => load(false)} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {T.loadMore}
          </Button>
        </div>
      )}
    </section>
  );
}

// ── Inbox ────────────────────────────────────────────────────────────────────

function InboxTab({ T, lang }) {
  const [filter, setFilter] = useState('open');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';

  const load = () => {
    setLoading(true);
    adminListContact({ status: filter === 'all' ? null : filter, limit: 100 })
      .then(({ rows, total }) => { setItems(rows); setTotal(total); })
      .catch(() => toast.error('Failed to load inbox'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const setStatus = async (id, status) => {
    setBusy(id);
    try {
      const { message } = await adminPatchContact(id, { status });
      setItems((prev) => prev.map((m) => (m.id === id ? message : m)));
      toast.success('Updated');
    } catch {
      toast.error('Update failed');
    } finally { setBusy(null); }
  };

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <Eyebrow>{T.eyebrow}</Eyebrow>
        <div className="inline-flex gap-px rounded-md border border-rule/15 bg-paper-2 p-0.5 shadow-codex-sm">
          {[['open', T.open], ['resolved', T.resolved], ['all', T.all]].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={cn(
                'rounded-sm px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors',
                filter === k ? 'bg-ink text-paper' : 'text-muted hover:text-ink',
              )}
            >{label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted" />
      ) : items.length === 0 ? (
        <p className="rounded-md border border-dashed border-rule/30 bg-paper-2/40 p-8 text-center font-mono text-[11px] uppercase tracking-wider text-muted">
          {T.empty}
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((m) => (
            <li
              key={m.id}
              className="rounded-lg border border-rule/15 bg-paper-2 p-4 shadow-codex-sm"
            >
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-ink">{m.name || m.email}</span>
                  <a href={`mailto:${m.email}`} className="font-mono text-[11px] text-muted hover:text-brand">
                    {m.email}
                  </a>
                  {m.user_id && <Pill tone="ghost">user #{m.user_id}</Pill>}
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone={m.status === 'resolved' ? 'mint' : 'amber'}>{m.status}</Pill>
                  <span className="font-mono text-[10px] text-muted">{fmtRelative(m.created_at, locale)}</span>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm text-ink-2">{m.message}</p>
              <div className="mt-3 flex justify-end">
                {m.status === 'open' ? (
                  <button
                    onClick={() => setStatus(m.id, 'resolved')}
                    disabled={busy === m.id}
                    className="inline-flex items-center gap-1.5 rounded border border-rule/15 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted hover:border-mint/40 hover:text-[rgb(var(--mint))] disabled:opacity-50"
                  >
                    <Check className="h-3 w-3" />{T.markResolved}
                  </button>
                ) : (
                  <button
                    onClick={() => setStatus(m.id, 'open')}
                    disabled={busy === m.id}
                    className="inline-flex items-center gap-1.5 rounded border border-rule/15 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted hover:text-ink disabled:opacity-50"
                  >
                    <RotateCcw className="h-3 w-3" />{T.reopen}
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

function ContentTab({ T }) {
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
