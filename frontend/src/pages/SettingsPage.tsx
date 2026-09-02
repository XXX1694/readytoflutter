import { useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ExternalLink } from 'lucide-react';
import { useAuth } from '../store/auth';
import {
  authUpdateName, authChangePassword, authChangeEmail, authDeleteAccount,
  authRegenerateRecoveryCode, readLocalProgress, serializeLocalProgress,
} from '../api/api';
import { useLang } from '../i18n/LangContext';
import { useT, useRecoveryCopy, type UICopy, type RecoveryErrorKey } from '../i18n/ui';
import {
  useSettingsCopy, type SettingsCopy, type SettingsErrorKey,
} from '../i18n/settingsPage';
import { usePrefs } from '../store/prefs';
import {
  Button, Chip, ChipGroup, List, ListRow, PageHeader, PageShell, Section,
  TextField, PasswordField,
} from '../ui/index';
import PushReminders from '../components/PushReminders';
import { RecoveryCodePanel } from './ResetPasswordPage';
import { getBookmarkIds } from '../lib/bookmarks';
import { useResetProgress } from '../lib/queries';
import { PLATFORMS } from '../lib/platform';
import { cn } from '../lib/cn';
import type { User } from '../types/domain';

/**
 * Me. Works with no account and no backend: appearance, session defaults,
 * saved questions, sources and the browser's own data are all local. The
 * account flows below only exist once there is a session to act on.
 */
export default function SettingsPage() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const t = useT(lang);
  const c = useSettingsCopy(lang);

  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const backendAvailable = useAuth((s) => s.backendAvailable);
  const clearSession = useAuth((s) => s.clearSession);
  const qc = useQueryClient();

  const handleAccountDeleted = () => {
    clearSession();
    qc.invalidateQueries();
    navigate('/login');
  };

  return (
    <PageShell width="reading">
      <PageHeader title={t.nav.me} />

      <Section title={c.accountTitle}>
        {token && user ? (
          <AccountFlows user={user} token={token} c={c} onDeleted={handleAccountDeleted} />
        ) : (
          <SignedOut c={c} t={t} showButtons={backendAvailable !== false} />
        )}
      </Section>

      <Section title={c.appearanceTitle} subtitle={c.appearanceSubtitle}>
        <Appearance c={c} />
      </Section>

      <Section title={c.sessionTitle} subtitle={c.sessionSubtitle}>
        <SessionDefaults c={c} label={t.nav.writeItFirst} />
      </Section>

      {/* Renders nothing at all unless the browser supports push, the server
          has VAPID keys, and the reader is signed in. */}
      <PushReminders lang={lang} />

      <Section title={t.nav.saved}>
        <SavedRow c={c} />
      </Section>

      <Section title={t.nav.sources}>
        <List>
          <ListRow to="/knowledge" title={c.sourcesRow} meta={c.sourcesMeta} />
        </List>
      </Section>

      <Section title={c.dataTitle} subtitle={c.dataSubtitle}>
        <DataFlows c={c} t={t} />
      </Section>

      <Section title={c.aboutTitle}>
        <About c={c} />
      </Section>
    </PageShell>
  );
}

// ── Account, signed out ────────────────────────────────────────────────────
function SignedOut({ c, t, showButtons }: { c: SettingsCopy; t: UICopy; showButtons: boolean }) {
  return (
    <div>
      <p className="max-w-xl text-[15px] leading-relaxed text-ink-2">{c.anonBody}</p>
      {showButtons && (
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild variant="codex">
            <Link to="/login">{t.nav.signIn}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/signup">{c.createAccount}</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Account, signed in ─────────────────────────────────────────────────────
interface AccountFlowsProps {
  user: User;
  token: string;
  c: SettingsCopy;
  onDeleted: () => void;
}

function AccountFlows({ user, token, c, onDeleted }: AccountFlowsProps) {
  const { lang } = useLang();
  const joined = new Date(user.created_at).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="space-y-7">
      <p className="text-[13px] text-muted">
        {user.email} · {c.joined} {joined}
      </p>
      <ProfileBlock user={user} token={token} c={c} />
      <PasswordBlock c={c} />
      <RecoveryBlock c={c} user={user} token={token} />
      <EmailBlock user={user} c={c} />
      <DeleteBlock c={c} onDeleted={onDeleted} />
    </div>
  );
}

function ProfileBlock({ user, token, c }: { user: User; token: string; c: SettingsCopy }) {
  const setSession = useAuth((s) => s.setSession);
  const qc = useQueryClient();
  const [name, setName] = useState(user.name ?? '');
  const [saving, setSaving] = useState(false);
  const dirty = name.trim() !== (user.name ?? '').trim();

  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const { user: updated } = await authUpdateName(name.trim() || null);
      setSession(token, updated);
      qc.invalidateQueries();
      toast.success(c.profileSaved);
    } catch {
      toast.error(c.errors.unknown_error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Block title={c.profileTitle} subtitle={c.profileSubtitle}>
      <form onSubmit={save} className="space-y-5">
        <TextField
          label={c.name}
          hint={c.nameHint}
          value={name}
          onChange={setName}
          placeholder={c.namePh}
          autoCapitalize="words"
          autoComplete="name"
          maxLength={80}
        />
        <TextField
          label={c.email}
          hint={c.emailReadOnlyHint}
          type="email"
          value={user.email}
          readOnly
        />
        <Button type="submit" variant="codex" disabled={!dirty || saving}>
          {saving ? c.saving : c.saveProfile}
        </Button>
      </form>
    </Block>
  );
}

function PasswordBlock({ c }: { c: SettingsCopy }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (next.length < 8) return setError('password_too_short');
    if (next !== confirm) return setError('mismatch');
    if (next === current) return setError('same_as_current');

    setSaving(true);
    try {
      await authChangePassword(current, next);
      toast.success(c.passwordChanged);
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      setError(httpStatus(err) === 401 ? 'wrong_current' : apiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Block title={c.securityTitle} subtitle={c.securitySubtitle}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <PasswordField
          label={c.currentPassword}
          value={current}
          onChange={setCurrent}
          autoComplete="current-password"
          showLabel={c.showPwd}
          hideLabel={c.hidePwd}
        />
        <PasswordField
          label={c.newPassword}
          hint={c.newPasswordHint}
          value={next}
          onChange={setNext}
          autoComplete="new-password"
          showLabel={c.showPwd}
          hideLabel={c.hidePwd}
        />
        <PasswordField
          label={c.confirmPassword}
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          showLabel={c.showPwd}
          hideLabel={c.hidePwd}
        />

        <ErrorNote c={c} error={error} />

        <Button type="submit" variant="codex" disabled={saving || !current || !next || !confirm}>
          {saving ? c.saving : c.changePassword}
        </Button>
      </form>
    </Block>
  );
}

// There is no reset email, so this code is the whole of account recovery.
// Accounts made before the feature shipped have none — `has_recovery_code`
// is what tells them so.
function RecoveryBlock({ c, user, token }: { c: SettingsCopy; user: User; token: string }) {
  const { lang } = useLang();
  const R = useRecoveryCopy(lang);
  const setSession = useAuth((s) => s.setSession);

  const [password, setPassword] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<RecoveryErrorKey | null>(null);
  // Present only between "generated" and "I have saved it".
  const [issued, setIssued] = useState<string | null>(null);

  const hasCode = user.has_recovery_code === 1;

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (working || !password) return;
    setError(null);
    setWorking(true);
    try {
      const { recoveryCode } = await authRegenerateRecoveryCode(password);
      setIssued(recoveryCode);
      setPassword('');
      // The flag drives this block's own copy, so it has to move now rather
      // than waiting for the next /auth/me.
      setSession(token, { ...user, has_recovery_code: 1 });
    } catch (err) {
      const status = httpStatus(err);
      setError(status === 401 ? 'wrong_password' : status === 429 ? 'rate_limited' : 'unknown_error');
    } finally {
      setWorking(false);
    }
  };

  return (
    <Block title={R.settingsTitle} subtitle={R.settingsSubtitle}>
      {issued ? (
        <RecoveryCodePanel
          code={issued}
          T={R}
          ctaLabel={R.done}
          onAcknowledge={() => setIssued(null)}
        />
      ) : (
        <form onSubmit={submit} className="space-y-5" noValidate>
          <div>
            <p className="text-sm font-medium text-ink">{hasCode ? R.statusHas : R.statusNone}</p>
            <p className="mt-1 text-[13px] text-muted">
              {hasCode ? R.replaceWarning : R.generateNote}
            </p>
          </div>

          <PasswordField
            label={R.currentPassword}
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            showLabel={c.showPwd}
            hideLabel={c.hidePwd}
          />

          {error && (
            <p role="alert" className="rounded-md border border-coral/30 bg-coral/8 px-3 py-2 text-[13px] text-coral">
              {R.errors[error]}
            </p>
          )}

          <Button type="submit" variant="outline" disabled={working || !password}>
            {working ? R.generating : hasCode ? R.replaceCta : R.generateCta}
          </Button>
        </form>
      )}
    </Block>
  );
}

function EmailBlock({ user, c }: { user: User; c: SettingsCopy }) {
  const setSession = useAuth((s) => s.setSession);
  const qc = useQueryClient();
  const [password, setPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!/.+@.+\..+/.test(newEmail)) return setError('invalid_email');
    if (newEmail.trim().toLowerCase() === user.email) return setError('same_as_current');

    setSaving(true);
    try {
      const { user: updated, token: newToken } = await authChangeEmail(password, newEmail.trim());
      setSession(newToken, updated);
      qc.invalidateQueries();
      toast.success(c.emailChanged);
      setPassword('');
      setNewEmail('');
    } catch (err) {
      const code = httpStatus(err);
      if (code === 401) setError('wrong_password');
      else if (code === 409) setError('email_taken');
      else setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Block title={c.changeEmailTitle} subtitle={c.changeEmailSubtitle}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <TextField label={c.currentEmail} type="email" value={user.email} readOnly />
        <TextField
          label={c.newEmail}
          type="email"
          value={newEmail}
          onChange={setNewEmail}
          placeholder="you@example.com"
          autoComplete="email"
        />
        <PasswordField
          label={c.confirmWithPassword}
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          showLabel={c.showPwd}
          hideLabel={c.hidePwd}
        />

        <ErrorNote c={c} error={error} />

        <Button type="submit" variant="outline" disabled={saving || !password || !newEmail}>
          {saving ? c.saving : c.changeEmail}
        </Button>
      </form>
    </Block>
  );
}

function DeleteBlock({ c, onDeleted }: { c: SettingsCopy; onDeleted: () => void }) {
  const [confirmText, setConfirmText] = useState('');
  const [working, setWorking] = useState(false);
  const matches = confirmText.trim().toLowerCase() === 'delete';

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!matches || working) return;
    if (!window.confirm(c.deleteFinalConfirm)) return;
    setWorking(true);
    try {
      await authDeleteAccount();
      toast.success(c.accountDeleted);
      onDeleted();
    } catch {
      toast.error(c.errors.unknown_error);
    } finally {
      setWorking(false);
    }
  };

  return (
    <Block title={c.deleteTitle} subtitle={c.deleteSubtitle}>
      <form onSubmit={submit} className="space-y-5">
        <TextField
          label={c.deleteConfirmLabel}
          value={confirmText}
          onChange={setConfirmText}
          placeholder="delete"
          autoComplete="off"
        />
        <Button
          type="submit"
          variant="outline"
          disabled={!matches || working}
          className="border-coral/40 text-coral hover:border-coral hover:bg-coral/8"
        >
          {working ? c.deleting : c.deleteCta}
        </Button>
      </form>
    </Block>
  );
}

// ── Appearance / session ───────────────────────────────────────────────────
function Appearance({ c }: { c: SettingsCopy }) {
  const theme = usePrefs((s) => s.theme);
  const setTheme = usePrefs((s) => s.setTheme);
  const { lang, setLang } = useLang();

  return (
    <div className="space-y-6">
      <ChipGroup label={c.themeLabel} ariaLabel={c.themeLabel}>
        <Chip active={theme === 'light'} onClick={() => setTheme('light')}>{c.themeLight}</Chip>
        <Chip active={theme === 'dark'} onClick={() => setTheme('dark')}>{c.themeDark}</Chip>
      </ChipGroup>
      <ChipGroup label={c.langLabel} ariaLabel={c.langLabel}>
        <Chip active={lang === 'en'} onClick={() => setLang('en')}>English</Chip>
        <Chip active={lang === 'ru'} onClick={() => setLang('ru')}>Русский</Chip>
      </ChipGroup>
    </div>
  );
}

function SessionDefaults({ c, label }: { c: SettingsCopy; label: string }) {
  const recallMode = usePrefs((s) => s.recallMode);
  const setRecallMode = usePrefs((s) => s.setRecallMode);

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">{c.writeItFirstHint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={recallMode}
        aria-label={label}
        onClick={() => setRecallMode(!recallMode)}
        /* The track is 24px tall; the vertical padding brings the hit area to
           the 44px touch target without changing what you see. */
        className="-my-2.5 shrink-0 py-2.5"
      >
        <span
          className={cn(
            'flex h-6 w-11 items-center rounded-full border transition-colors',
            recallMode ? 'border-ink bg-ink' : 'border-rule/25 bg-paper',
          )}
        >
          <span
            className={cn(
              'h-4 w-4 rounded-full bg-paper-2 transition-transform',
              recallMode ? 'translate-x-6' : 'translate-x-1',
            )}
          />
        </span>
      </button>
    </div>
  );
}

// ── Saved / data / about ───────────────────────────────────────────────────
function SavedRow({ c }: { c: SettingsCopy }) {
  // Read once on mount: bookmarks cannot change while this page is open.
  const [count] = useState(() => getBookmarkIds().length);
  return (
    <List>
      <ListRow to="/bookmarks" title={c.savedRow} meta={c.savedCount(count)} />
    </List>
  );
}

function DataFlows({ c, t }: { c: SettingsCopy; t: UICopy }) {
  const reset = useResetProgress();
  const [items] = useState(() => serializeLocalProgress(readLocalProgress()));
  const [bookmarks] = useState(() => getBookmarkIds());
  const empty = items.length === 0 && bookmarks.length === 0;

  const exportProgress = () => {
    const payload = { exportedAt: new Date().toISOString(), progress: items, bookmarks };
    const url = URL.createObjectURL(
      new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'onsite-progress.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = async () => {
    if (!window.confirm(t.resetConfirm)) return;
    try {
      await reset.mutateAsync();
      toast.success(t.progressReset);
    } catch {
      toast.error(t.failedReset);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={exportProgress} disabled={empty}>
          {c.exportCta}
        </Button>
        <Button
          variant="outline"
          onClick={handleReset}
          className="border-coral/40 text-coral hover:border-coral hover:bg-coral/8"
        >
          {t.resetAllProgress}
        </Button>
      </div>
      <p className="mt-3 text-[13px] text-muted">{empty ? c.exportEmpty : c.exportHint}</p>
    </div>
  );
}

function About({ c }: { c: SettingsCopy }) {
  const platform = usePrefs((s) => s.platform);
  const docs = PLATFORMS.find((p) => p.key === platform) ?? PLATFORMS[0];

  return (
    <div>
      <p className="max-w-xl text-[15px] leading-relaxed text-ink-2">{c.aboutBody}</p>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
        <Link to="/pricing" className="text-brand hover:underline">{c.pricing}</Link>
        <Link to="/contact" className="text-brand hover:underline">{c.contact}</Link>
        <a
          href={docs.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-brand hover:underline"
        >
          {docs.docsLabel}
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      </div>
    </div>
  );
}

// ── Reusable bits ──────────────────────────────────────────────────────────
function Block({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="border-t border-rule/12 pt-6 first:border-0 first:pt-0">
      <h3 className="font-display text-[15px] font-semibold text-ink">{title}</h3>
      {subtitle && <p className="mt-1 text-[13px] leading-relaxed text-muted">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function ErrorNote({ c, error }: { c: SettingsCopy; error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-md border border-coral/30 bg-coral/8 px-3 py-2 text-[13px] text-coral">
      {c.errors[error as SettingsErrorKey] ?? c.errors.unknown_error}
    </p>
  );
}

// Axios errors reach us as `unknown`; both helpers narrow without pulling the
// axios types into a presentational module.
const httpStatus = (err: unknown): number | undefined =>
  (err as { response?: { status?: number } })?.response?.status;

const apiError = (err: unknown): string =>
  (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'unknown_error';
