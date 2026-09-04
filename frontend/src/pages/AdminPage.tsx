import { useMemo, useState, type ReactNode } from 'react';
import {
  ChevronDown, Plus, Save, Trash2, Undo2, Download, RotateCcw,
  Search as SearchIcon, X, Filter, Sparkles, FileText, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTopics, useQuestions } from '../lib/queries';
import { useAdmin, applyDiff, statusOf, type AdminDiff, type QuestionDiffStatus } from '../store/admin';
import { useLang, type Lang } from '../i18n/LangContext';
import { useT, type UICopy } from '../i18n/ui';
import {
  exportStaticDataJson,
  exportTopicJson,
  nextQuestionId,
} from '../lib/exportData';
import { Button, Pill, Eyebrow, FullPageLoader, type PillTone } from '../ui/index';
import { cn } from '../lib/cn';
import { aiDraftQuestion } from '../api/api';
import { useAiHealth } from '../components/AnswerGrader';
import type { Difficulty, Level, Question, Topic } from '../types/domain';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const LEVELS: Level[] = ['junior', 'mid', 'senior'];
const STATUS_FILTERS = ['all', 'clean', 'modified', 'added', 'deleted'];
const CODE_LANGUAGES = ['dart', 'json', 'yaml', 'bash', 'shell', 'javascript', 'typescript', 'xml', 'ruby'];

const STATUS_TONE: Record<QuestionDiffStatus, PillTone> = {
  clean: 'ghost',
  modified: 'amber',
  added: 'mint',
  deleted: 'coral',
};

// The shape backend/ai.js returns from the submit_draft tool. Every field is
// optional so a partial model response still opens as an editable card.
interface AiQuestionDraft {
  question?: string;
  answer?: string;
  difficulty?: Difficulty;
  codeExample?: string | null;
  codeLanguage?: string;
  tags?: string[];
}

// Axios rejects with an error carrying the server payload; we only need the
// machine-readable code off it.
function apiErrorCode(err: unknown): string | undefined {
  const code = (err as { response?: { data?: { code?: unknown } } })?.response?.data?.code;
  return typeof code === 'string' ? code : undefined;
}

const INPUT = 'w-full rounded-lg border border-rule/12 bg-paper px-2 py-1.5 text-sm text-ink outline-none transition-colors focus:border-rule/30';

export default function AdminPage() {
  const { lang } = useLang();
  const t = useT(lang);
  const isRu = lang === 'ru';

  const topicsQ = useTopics();
  const questionsQ = useQuestions();

  // Subscribe to individual slices so each selector returns a stable primitive
  // or the same reference until the slice actually changes — otherwise a
  // method that builds a fresh object every render triggers an infinite loop.
  const edits = useAdmin((s) => s.edits);
  const adds = useAdmin((s) => s.adds);
  const deletes = useAdmin((s) => s.deletes);
  const addAction = useAdmin((s) => s.add);
  const restoreAction = useAdmin((s) => s.restore);
  const resetAction = useAdmin((s) => s.reset);

  const stats = useMemo(() => ({
    edits: Object.keys(edits).length,
    adds: adds.length,
    deletes: Object.keys(deletes).length,
  }), [edits, adds, deletes]);

  // Compatibility wrapper — pass to children that expect the whole diff
  const diff = useMemo<AdminDiff>(() => ({ edits, adds, deletes }), [edits, adds, deletes]);

  const [search, setSearch] = useState('');
  const [filterTopic, setFilterTopic] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [openId, setOpenId] = useState<number | null>(null);

  const topics = useMemo(() => topicsQ.data ?? [], [topicsQ.data]);
  // The editor needs answers. This page is dev-only and runs against the
  // local backend, whose /questions joins every answer in; the guard keeps
  // the type honest rather than assuming it.
  const baseQuestions = useMemo(
    () => (questionsQ.data ?? []).filter((q): q is Question => typeof (q as Question).answer === 'string'),
    [questionsQ.data],
  );

  const merged = useMemo(() => applyDiff(baseQuestions, diff), [baseQuestions, diff]);

  const topicById = useMemo(
    () => new Map(topics.map((tp) => [tp.id, tp])),
    [topics],
  );

  const { enabled: aiEnabled } = useAiHealth();
  // useState must run before any conditional return — keep the AI-draft
  // state up here with the rest of the hooks.
  const [aiDrafting, setAiDrafting] = useState(false);

  // Filtering
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return merged
      .filter((x) => {
        if (filterTopic !== 'all' && x.topic_id !== Number(filterTopic)) return false;
        if (filterLevel !== 'all' && topicById.get(x.topic_id)?.level !== filterLevel) return false;
        if (filterDifficulty !== 'all' && x.difficulty !== filterDifficulty) return false;
        if (filterStatus !== 'all' && statusOf(x.id, diff) !== filterStatus) return false;
        if (q) {
          const hay = `${x.question}\n${x.answer}\n${x.code_example || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => (a.topic_id - b.topic_id) || (a.order_index - b.order_index));
  }, [merged, search, filterTopic, filterLevel, filterDifficulty, filterStatus, diff, topicById]);

  // Include deleted base items so the user can undo deletions
  const deletedItems = useMemo(
    () => baseQuestions.filter((q) => deletes[q.id]),
    [baseQuestions, deletes],
  );

  if (topicsQ.isLoading || questionsQ.isLoading) return <FullPageLoader />;

  const total = merged.length;

  const handleNew = () => {
    const topicId = filterTopic !== 'all' ? Number(filterTopic) : topics[0]?.id;
    if (!topicId) return;
    const newQ: Question = {
      id: nextQuestionId(baseQuestions, diff, topicId),
      topic_id: topicId,
      order_index: 99,
      difficulty: 'medium',
      question: '',
      answer: '',
      code_example: null,
      code_language: 'dart',
    };
    addAction(newQ);
    setOpenId(newQ.id);
    toast.success(isRu ? 'Создана новая карточка' : 'New question added');
  };

  // AI draft — author types a one-line idea, Claude returns a full draft
  // (question text, reference answer, difficulty, tags, optional code).
  // Result is editable in the admin UI like any other added question.
  const handleAiDraft = async () => {
    const topicId = filterTopic !== 'all' ? Number(filterTopic) : topics[0]?.id;
    if (!topicId) return;
    const topic = topicById.get(topicId);
    const prompt = window.prompt(
      isRu
        ? `Что должна проверить новая карточка по теме «${topic?.title || ''}»?\nНапример: «Объясни, как работают Streams в Dart и когда нужны broadcast-стримы»`
        : `What should this new card cover for topic "${topic?.title || ''}"?\nE.g. "Explain how Streams work in Dart and when broadcast streams matter"`,
      '',
    );
    if (!prompt || prompt.trim().length < 8) return;
    setAiDrafting(true);
    try {
      const result = await aiDraftQuestion({
        prompt: prompt.trim(),
        topicTitle: topic?.title,
        topicLevel: topic?.level,
        lang,
      });
      const draft = result.draft as AiQuestionDraft;
      const newQ: Question = {
        id: nextQuestionId(baseQuestions, diff, topicId),
        topic_id: topicId,
        order_index: 99,
        difficulty: draft.difficulty || 'medium',
        question: draft.question || '',
        answer: draft.answer || '',
        code_example: draft.codeExample || null,
        code_language: draft.codeLanguage || 'dart',
        tags: Array.isArray(draft.tags) ? draft.tags.join(', ') : '',
      };
      addAction(newQ);
      setOpenId(newQ.id);
      toast.success(isRu ? 'AI-черновик готов — отредактируй и сохрани' : 'AI draft ready — review and save');
    } catch (err) {
      const code = apiErrorCode(err);
      const msg = code === 'ai_disabled'
        ? (isRu ? 'AI выключен на сервере' : 'AI is disabled on the server')
        : code === 'rate_limited'
        ? (isRu ? 'Лимит запросов — попробуй позже' : 'Rate limit reached — try later')
        : (isRu ? 'Не получилось сгенерировать черновик' : 'Could not draft the question');
      toast.error(msg);
    } finally {
      setAiDrafting(false);
    }
  };

  const handleResetAll = () => {
    if (!window.confirm(isRu ? 'Сбросить все локальные правки?' : 'Reset all local changes?')) return;
    resetAction();
    toast.success(isRu ? 'Diff очищен' : 'Diff cleared');
  };

  return (
    <div className="bg-page min-h-full">
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Header */}
        <header className="mb-6 border-b border-rule/12 pb-5">
          <Eyebrow>
            {isRu ? 'Локальный редактор · экспорт в JSON' : 'Local editor · export to JSON'}
          </Eyebrow>
          <h1 className="mt-2 font-display text-3xl font-medium text-ink sm:text-4xl">
            {isRu ? 'Редактор вопросов' : 'Question editor'}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
            {isRu
              ? 'Все правки хранятся в localStorage и не уходят на сервер. Когда закончишь — экспортируй JSON и закоммить в репозиторий.'
              : 'Edits live in localStorage only — nothing is pushed to a server. When done, export JSON and commit it to the repo.'}
          </p>

          {/* Stats */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Pill tone="ghost">{total} {isRu ? 'всего' : 'total'}</Pill>
            <Pill tone="amber">{stats.edits} {isRu ? 'правок' : 'edits'}</Pill>
            <Pill tone="mint">{stats.adds} {isRu ? 'новых' : 'added'}</Pill>
            <Pill tone="coral">{stats.deletes} {isRu ? 'удалено' : 'deleted'}</Pill>
          </div>
        </header>

        {/* Toolbar */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-rule/12 bg-paper-2 px-3 transition-colors focus-within:border-rule/30">
            <SearchIcon className="h-4 w-4 text-muted" aria-hidden />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isRu ? 'Поиск по тексту…' : 'Search text…'}
              aria-label={isRu ? 'Поиск по тексту' : 'Search text'}
              className="h-10 flex-1 bg-transparent text-sm text-ink placeholder:text-muted-2 outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label={isRu ? 'Очистить' : 'Clear'}
                className="text-muted hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Button variant="brand" onClick={handleNew}>
            <Plus className="h-4 w-4" />
            {isRu ? 'Новый' : 'New'}
          </Button>

          {/* AI draft — only when backend AI is reachable. Hidden on Pages-only deploys. */}
          {aiEnabled && (
            <Button variant="outline" onClick={handleAiDraft} disabled={aiDrafting}>
              {aiDrafting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isRu ? 'AI-черновик' : 'AI draft'}
            </Button>
          )}

          <ExportMenu topics={topics} questions={baseQuestions} diff={diff} lang={lang} />

          <Button variant="outline" onClick={handleResetAll} className="text-muted hover:text-coral">
            <RotateCcw className="h-3.5 w-3.5" />
            {isRu ? 'Сбросить' : 'Reset'}
          </Button>
        </div>

        {/* Filter row */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <FilterSelect
            label={isRu ? 'Тема' : 'Topic'}
            value={filterTopic}
            onChange={setFilterTopic}
            options={[
              { value: 'all', label: isRu ? 'Все' : 'All' },
              ...topics.map((tp) => ({ value: String(tp.id), label: tp.title })),
            ]}
          />
          <FilterSelect
            label={isRu ? 'Уровень' : 'Level'}
            value={filterLevel}
            onChange={setFilterLevel}
            options={[
              { value: 'all', label: isRu ? 'Все' : 'All' },
              ...LEVELS.map((l) => ({ value: l, label: t[l].short })),
            ]}
          />
          <FilterSelect
            label={isRu ? 'Сложность' : 'Difficulty'}
            value={filterDifficulty}
            onChange={setFilterDifficulty}
            options={[
              { value: 'all', label: isRu ? 'Все' : 'All' },
              ...DIFFICULTIES.map((d) => ({ value: d, label: d })),
            ]}
          />
          <FilterSelect
            label={isRu ? 'Статус' : 'Status'}
            value={filterStatus}
            onChange={setFilterStatus}
            options={STATUS_FILTERS.map((s) => ({ value: s, label: s }))}
          />
          <span className="ml-auto text-[13px] text-muted">
            {filtered.length} {isRu ? 'найдено' : 'shown'}
          </span>
        </div>

        {/* Deleted (folded above the list) */}
        {deletedItems.length > 0 && (
          <div className="mb-4 rounded-lg border border-coral/25 bg-coral/8 p-3">
            <div className="eyebrow mb-2">
              {isRu ? 'Удалено в diff — можно вернуть' : 'Deleted in the diff — can be restored'}
            </div>
            <ul className="space-y-1">
              {deletedItems.map((q) => (
                <li key={q.id} className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-muted">#{q.id}</span>
                  <span className="flex-1 truncate text-ink-2 line-through decoration-coral">
                    {q.question}
                  </span>
                  <button
                    type="button"
                    onClick={() => restoreAction(q.id)}
                    className="inline-flex items-center gap-1 text-[13px] text-mint hover:underline"
                  >
                    <Undo2 className="h-3 w-3" aria-hidden />
                    {isRu ? 'Вернуть' : 'Restore'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* List */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Filter className="h-8 w-8 text-muted" aria-hidden />
              <p className="text-sm text-muted">
                {isRu ? 'Ничего не найдено' : 'Nothing matches'}
              </p>
            </div>
          ) : (
            filtered.map((q) => (
              <QuestionRow
                key={q.id}
                question={q}
                topic={topicById.get(q.topic_id)}
                lang={lang}
                t={t}
                expanded={openId === q.id}
                onToggle={() => setOpenId((prev) => (prev === q.id ? null : q.id))}
                topics={topics}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface SelectOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
}

function FilterSelect({ label, value, onChange, options }: FilterSelectProps) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="eyebrow">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-rule/12 bg-paper-2 px-2 py-1 text-[13px] text-ink outline-none transition-colors focus:border-rule/30"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

interface QuestionRowProps {
  question: Question;
  topic: Topic | undefined;
  lang: Lang;
  t: UICopy;
  expanded: boolean;
  onToggle: () => void;
  topics: Topic[];
}

function QuestionRow({ question, topic, lang, t, expanded, onToggle, topics }: QuestionRowProps) {
  const edits = useAdmin((s) => s.edits);
  const adds = useAdmin((s) => s.adds);
  const deletes = useAdmin((s) => s.deletes);
  const status = statusOf(question.id, { edits, adds, deletes });

  return (
    <article
      className={cn(
        'codex-card overflow-hidden',
        expanded && 'border-rule/25',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
      >
        <span className="mt-0.5 shrink-0 font-mono text-[12px] tabular-nums text-muted">
          #{question.id}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-ink">
            {question.question || <span className="italic text-muted-2">
              {lang === 'ru' ? 'пусто' : 'empty'}
            </span>}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Pill tone="ghost" size="xs">{topic?.title || '—'}</Pill>
            <Pill tone="ghost" size="xs">{topic ? t[topic.level].short : '—'}</Pill>
            <Pill tone="ghost" size="xs">{question.difficulty}</Pill>
            <Pill tone="ghost" size="xs">
              {lang === 'ru' ? 'позиция' : 'position'} {question.order_index}
            </Pill>
            {status !== 'clean' && (
              <Pill tone={STATUS_TONE[status]} size="xs">{status}</Pill>
            )}
          </div>
        </div>
        <ChevronDown
          className={cn('h-4 w-4 text-muted transition-transform', expanded && 'rotate-180')}
          aria-hidden
        />
      </button>

      {expanded && (
        <Editor
          key={question.id}
          question={question}
          topics={topics}
          lang={lang}
          onClose={onToggle}
          isAdded={status === 'added'}
        />
      )}
    </article>
  );
}

interface EditorProps {
  question: Question;
  topics: Topic[];
  lang: Lang;
  onClose: () => void;
  isAdded: boolean;
}

function Editor({ question, topics, lang, onClose, isAdded }: EditorProps) {
  const patch = useAdmin((s) => s.patch);
  const remove = useAdmin((s) => s.remove);
  const revertEdit = useAdmin((s) => s.revertEdit);
  // Mounted with `key={question.id}`, so opening a different row remounts
  // this component with a fresh draft — no sync-back effect needed.
  const [draft, setDraft] = useState<Question>(question);
  const isRu = lang === 'ru';

  const dirty = useMemo(
    () => (Object.keys(draft) as Array<keyof Question>).some((k) => draft[k] !== question[k]),
    [draft, question],
  );

  const save = () => {
    if (!draft.question.trim()) {
      toast.error(isRu ? 'Текст вопроса пустой' : 'The question text is empty');
      return;
    }
    if (!draft.answer.trim()) {
      toast.error(isRu ? 'Ответ пустой' : 'The answer is empty');
      return;
    }
    patch(draft.id, draft);
    toast.success(isRu ? 'Сохранено в diff' : 'Saved to the diff');
  };

  const discard = () => {
    if (isAdded) return;
    revertEdit(draft.id);
    setDraft(question);
    toast.success(isRu ? 'Возвращено к оригиналу' : 'Reverted to the original');
  };

  const handleRemove = () => {
    if (!window.confirm(isRu ? 'Удалить?' : 'Delete this question?')) return;
    remove(draft.id);
    onClose();
    toast.success(isRu ? 'Удалено' : 'Deleted');
  };

  return (
    <div className="border-t border-rule/12 p-4 sm:p-5">
      {/* Top row: topic, order, difficulty, language */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={isRu ? 'Тема' : 'Topic'}>
          <select
            value={draft.topic_id}
            onChange={(e) => setDraft({ ...draft, topic_id: Number(e.target.value) })}
            className={INPUT}
          >
            {topics.map((tp) => (
              <option key={tp.id} value={tp.id}>{tp.title}</option>
            ))}
          </select>
        </Field>
        <Field label={isRu ? 'Позиция' : 'Order index'}>
          <input
            type="number"
            value={draft.order_index}
            onChange={(e) => setDraft({ ...draft, order_index: Number(e.target.value) })}
            className={cn(INPUT, 'font-mono')}
          />
        </Field>
        <Field label={isRu ? 'Сложность' : 'Difficulty'}>
          <div className="flex gap-1">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDraft({ ...draft, difficulty: d })}
                aria-pressed={draft.difficulty === d}
                className={cn(
                  'flex-1 rounded-lg border px-2 py-1.5 text-[13px] transition-colors',
                  draft.difficulty === d
                    ? 'border-ink bg-ink text-paper'
                    : 'border-rule/12 bg-paper text-muted hover:border-rule/25 hover:text-ink',
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </Field>
        <Field label={isRu ? 'Язык кода' : 'Code language'}>
          <select
            value={draft.code_language || 'dart'}
            onChange={(e) => setDraft({ ...draft, code_language: e.target.value })}
            className={INPUT}
          >
            {CODE_LANGUAGES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label={isRu ? 'Вопрос' : 'Question'} className="mt-4">
        <textarea
          value={draft.question}
          onChange={(e) => setDraft({ ...draft, question: e.target.value })}
          rows={2}
          autoCorrect="off"
          spellCheck={false}
          className={cn(INPUT, 'resize-y px-3 py-2 leading-relaxed')}
        />
      </Field>

      <Field label={isRu ? 'Ответ' : 'Answer'} className="mt-4">
        <textarea
          value={draft.answer}
          onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
          rows={10}
          autoCorrect="off"
          spellCheck={false}
          className={cn(INPUT, 'answer-text resize-y px-3 py-2')}
        />
        <div className="mt-1 text-[12px] tabular-nums text-muted-2">
          {draft.answer.length} {isRu ? 'символов · переносы строк сохраняются' : 'characters · line breaks are preserved'}
        </div>
      </Field>

      <Field label={isRu ? 'Пример кода' : 'Code example'} className="mt-4">
        <textarea
          value={draft.code_example || ''}
          onChange={(e) => setDraft({ ...draft, code_example: e.target.value || null })}
          rows={12}
          autoCorrect="off"
          spellCheck={false}
          autoCapitalize="off"
          placeholder={isRu ? '// необязательно' : '// optional'}
          className={cn(INPUT, 'resize-y px-3 py-2 font-mono text-[12.5px] leading-relaxed')}
        />
      </Field>

      {/* Action row */}
      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-rule/12 pt-4">
        <Button variant="brand" size="sm" onClick={save} disabled={!dirty}>
          <Save className="h-3.5 w-3.5" />
          {isRu ? 'Сохранить' : 'Save'}
        </Button>
        {!isAdded && (
          <Button variant="ghost" size="sm" onClick={discard} disabled={!dirty}>
            <Undo2 className="h-3.5 w-3.5" />
            {isRu ? 'Откатить' : 'Discard'}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={handleRemove} className="ml-auto text-muted hover:text-coral">
          <Trash2 className="h-3.5 w-3.5" />
          {isRu ? 'Удалить' : 'Delete'}
        </Button>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  children: ReactNode;
  className?: string;
}

function Field({ label, children, className }: FieldProps) {
  return (
    <label className={cn('block', className)}>
      <span className="eyebrow mb-1 inline-block">{label}</span>
      {children}
    </label>
  );
}

interface ExportMenuProps {
  topics: Topic[];
  questions: Question[];
  diff: AdminDiff;
  lang: Lang;
}

function ExportMenu({ topics, questions, diff, lang }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const isRu = lang === 'ru';

  const exportAll = () => {
    exportStaticDataJson(topics, questions, diff);
    toast.success(isRu ? 'static-data.json скачан' : 'static-data.json downloaded');
    setOpen(false);
  };

  const exportTopic = (topic: Topic) => {
    exportTopicJson(topic, questions, diff);
    toast.success(isRu ? `${topic.slug}.json скачан` : `${topic.slug}.json downloaded`);
    setOpen(false);
  };

  return (
    <div className="relative">
      <Button variant="codex" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <Download className="h-4 w-4" />
        {isRu ? 'Экспорт' : 'Export'}
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} aria-hidden />
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-lg border border-rule/12 bg-paper-2 shadow-codex-lg">
          <button
            type="button"
            onClick={exportAll}
            className="flex w-full items-center gap-2 border-b border-rule/12 px-3 py-2 text-left text-sm hover:bg-paper"
          >
            <FileText className="h-3.5 w-3.5 text-muted" aria-hidden />
            <span>
              <span className="block font-medium text-ink">static-data.json</span>
              <span className="block text-[12px] text-muted">
                {isRu ? 'один файл — для GitHub Pages' : 'one file, for GitHub Pages'}
              </span>
            </span>
          </button>
          <div className="eyebrow border-b border-rule/12 px-3 py-2">
            {isRu ? 'По темам — для backend seed' : 'Per topic, for the backend seed'}
          </div>
          <div className="max-h-60 overflow-y-auto">
            {topics.map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => exportTopic(topic)}
                className="block w-full truncate px-3 py-1.5 text-left text-xs text-ink-2 hover:bg-paper hover:text-ink"
              >
                {topic.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
