import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown, Plus, Save, Trash2, Undo2, Download, RotateCcw,
  Search as SearchIcon, X, Filter, Sparkles, FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTopics, useQuestions } from '../lib/queries.js';
import { useAdmin, applyDiff, statusOf } from '../store/admin.js';
import { useLang } from '../i18n/LangContext.jsx';
import { useT } from '../i18n/ui.js';
import {
  exportStaticDataJson,
  exportTopicJson,
  nextQuestionId,
} from '../lib/exportData.js';
import { Button, Pill, FullPageLoader, Eyebrow } from '../ui/index.js';
import { cn } from '../lib/cn.js';

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const LEVELS = ['junior', 'mid', 'senior'];
const STATUS_FILTERS = ['all', 'clean', 'modified', 'added', 'deleted'];
const STATUS_TONE = {
  clean: 'ghost',
  modified: 'amber',
  added: 'mint',
  deleted: 'coral',
};

export default function AdminPage() {
  const { lang } = useLang();
  const t = useT(lang);

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

  // Compatibility wrapper — pass to children that expect the old `diff` shape
  const diff = useMemo(() => ({ edits, adds, deletes }), [edits, adds, deletes]);

  const [search, setSearch] = useState('');
  const [filterTopic, setFilterTopic] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [openId, setOpenId] = useState(null);

  const topics = topicsQ.data ?? [];
  const baseQuestions = questionsQ.data ?? [];

  const merged = useMemo(() => {
    return applyDiff(baseQuestions, { edits, adds, deletes });
  }, [baseQuestions, edits, adds, deletes]);

  const topicById = useMemo(() => Object.fromEntries(topics.map((t) => [t.id, t])), [topics]);

  // Filtering
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return merged
      .filter((x) => {
        if (filterTopic !== 'all' && x.topic_id !== Number(filterTopic)) return false;
        if (filterLevel !== 'all') {
          const lvl = topicById[x.topic_id]?.level;
          if (lvl !== filterLevel) return false;
        }
        if (filterDifficulty !== 'all' && x.difficulty !== filterDifficulty) return false;
        if (filterStatus !== 'all') {
          const st = statusOf(x.id, diff);
          if (st !== filterStatus) return false;
        }
        if (q) {
          const hay = `${x.question}\n${x.answer}\n${x.code_example || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => (a.topic_id - b.topic_id) || (a.order_index - b.order_index));
  }, [merged, search, filterTopic, filterLevel, filterDifficulty, filterStatus, diff, topicById]);

  // Include deleted base items so the user can undo deletions
  const deletedItems = useMemo(() => {
    return baseQuestions.filter((q) => deletes[q.id]);
  }, [baseQuestions, deletes]);

  if (topicsQ.isLoading || questionsQ.isLoading) return <FullPageLoader />;

  const total = merged.length;

  const handleNew = () => {
    const topicId = filterTopic !== 'all' ? Number(filterTopic) : topics[0]?.id;
    if (!topicId) return;
    const newQ = {
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
    toast.success(lang === 'ru' ? 'Создана новая карточка' : 'New question added');
  };

  const handleResetAll = () => {
    if (!window.confirm(lang === 'ru' ? 'Сбросить все локальные правки?' : 'Reset all local changes?')) return;
    resetAction();
    toast.success(lang === 'ru' ? 'Diff очищен' : 'Diff cleared');
  };

  return (
    <div className="bg-page min-h-full">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Header */}
        <header className="mb-6 border-b border-rule/15 pb-5">
          <Eyebrow accent="brand">Codex Admin · local-only</Eyebrow>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
            {lang === 'ru' ? 'Редактор вопросов' : 'Question editor'}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
            {lang === 'ru'
              ? 'Все правки хранятся в localStorage и не уходят на сервер. Когда закончишь — экспортируй JSON и закоммить в репозиторий.'
              : 'Edits live in localStorage only — nothing is pushed to a server. When done, export JSON and commit to the repo.'}
          </p>

          {/* Stats */}
          <div className="mt-4 flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-wider">
            <Pill tone="ghost">{total} {lang === 'ru' ? 'всего' : 'total'}</Pill>
            <Pill tone="amber">{stats.edits} {lang === 'ru' ? 'правок' : 'edits'}</Pill>
            <Pill tone="mint">{stats.adds} {lang === 'ru' ? 'новых' : 'added'}</Pill>
            <Pill tone="coral">{stats.deletes} {lang === 'ru' ? 'удалено' : 'deleted'}</Pill>
          </div>
        </header>

        {/* Toolbar */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <div className="flex flex-1 min-w-[220px] items-center gap-2 rounded-xl border border-rule/12 bg-paper-2/60 px-3 transition-all duration-200 focus-within:border-brand/40 focus-within:bg-paper-2 focus-within:ring-2 focus-within:ring-brand/15">
            <SearchIcon className="h-4 w-4 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === 'ru' ? 'Поиск по тексту…' : 'Search text…'}
              className="h-10 flex-1 bg-transparent text-sm text-ink placeholder:text-muted-2 outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} aria-label="Clear">
                <X className="h-4 w-4 text-muted" />
              </button>
            )}
          </div>

          <Button variant="brand" onClick={handleNew}>
            <Plus className="h-4 w-4" />
            {lang === 'ru' ? 'Новый' : 'New'}
          </Button>

          <ExportMenu topics={topics} questions={baseQuestions} diff={diff} lang={lang} />

          <Button variant="outline" onClick={handleResetAll} className="text-muted hover:text-coral">
            <RotateCcw className="h-3.5 w-3.5" />
            {lang === 'ru' ? 'Сбросить' : 'Reset'}
          </Button>
        </div>

        {/* Filter row */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <FilterPills
            label={lang === 'ru' ? 'Тема' : 'Topic'}
            value={filterTopic}
            onChange={setFilterTopic}
            options={[
              { value: 'all', label: lang === 'ru' ? 'Все' : 'All' },
              ...topics.map((tp) => ({ value: String(tp.id), label: tp.title })),
            ]}
          />
          <FilterPills
            label={lang === 'ru' ? 'Уровень' : 'Level'}
            value={filterLevel}
            onChange={setFilterLevel}
            options={[
              { value: 'all', label: 'All' },
              ...LEVELS.map((l) => ({ value: l, label: t[l].short })),
            ]}
          />
          <FilterPills
            label={lang === 'ru' ? 'Сложность' : 'Difficulty'}
            value={filterDifficulty}
            onChange={setFilterDifficulty}
            options={[
              { value: 'all', label: 'All' },
              ...DIFFICULTIES.map((d) => ({ value: d, label: d })),
            ]}
          />
          <FilterPills
            label={lang === 'ru' ? 'Статус' : 'Status'}
            value={filterStatus}
            onChange={setFilterStatus}
            options={STATUS_FILTERS.map((s) => ({ value: s, label: s }))}
          />
          <span className="ml-auto font-mono text-[11px] uppercase tracking-wider text-muted">
            {filtered.length} {lang === 'ru' ? 'найдено' : 'shown'}
          </span>
        </div>

        {/* Deleted (folded above the list) */}
        {deletedItems.length > 0 && (
          <div className="mb-4 rounded-xl border border-coral/30 bg-coral/8 p-3">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-coral">
              {lang === 'ru' ? 'Удалено в diff (можно вернуть)' : 'Deleted in diff (can restore)'}
            </div>
            <ul className="space-y-1">
              {deletedItems.map((q) => (
                <li key={q.id} className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-muted">#{q.id}</span>
                  <span className="flex-1 truncate text-ink-2 line-through decoration-coral">
                    {q.question}
                  </span>
                  <button
                    onClick={() => restoreAction(q.id)}
                    className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-mint hover:underline"
                  >
                    <Undo2 className="h-3 w-3" />
                    {lang === 'ru' ? 'Вернуть' : 'Restore'}
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
              <Filter className="h-8 w-8 text-muted" />
              <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
                {lang === 'ru' ? 'Ничего не найдено' : 'Nothing matches'}
              </p>
            </div>
          ) : (
            filtered.map((q) => (
              <QuestionRow
                key={q.id}
                question={q}
                topic={topicById[q.topic_id]}
                lang={lang}
                t={t}
                expanded={openId === q.id}
                onToggle={() => setOpenId((p) => (p === q.id ? null : q.id))}
                topics={topics}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function FilterPills({ label, value, onChange, options }) {
  return (
    <div className="flex items-center gap-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-rule/12 bg-paper-2 px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-ink outline-none transition-all duration-200 focus:border-brand/40 focus:ring-2 focus:ring-brand/15"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function QuestionRow({ question, topic, lang, t, expanded, onToggle, topics }) {
  const edits = useAdmin((s) => s.edits);
  const adds = useAdmin((s) => s.adds);
  const deletes = useAdmin((s) => s.deletes);
  const status = statusOf(question.id, { edits, adds, deletes });
  const isAdded = status === 'added';

  return (
    <article
      className={cn(
        'overflow-hidden rounded-2xl border bg-paper-2 transition-all duration-300',
        expanded
          ? 'border-rule/15 shadow-[0_2px_4px_0_rgb(var(--shadow)/0.06),0_16px_40px_-8px_rgb(var(--shadow)/0.10)]'
          : 'border-rule/8 shadow-[0_1px_2px_0_rgb(var(--shadow)/0.04),0_4px_16px_-4px_rgb(var(--shadow)/0.06)] hover:-translate-y-0.5 hover:border-rule/15',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
      >
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-brand mt-0.5">
          #{question.id}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink truncate">
            {question.question || <span className="italic text-muted-2">(empty)</span>}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider">
            <Pill tone="ghost" size="xs">{topic?.title || '?'}</Pill>
            <Pill tone="ghost" size="xs">{topic ? t[topic.level]?.short : '?'}</Pill>
            <Pill tone="ghost" size="xs">{question.difficulty}</Pill>
            <Pill tone="ghost" size="xs">{lang === 'ru' ? 'позиция' : 'pos'} {question.order_index}</Pill>
            {status !== 'clean' && (
              <Pill tone={STATUS_TONE[status]} size="xs">{status}</Pill>
            )}
          </div>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-muted transition-transform', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <Editor question={question} topics={topics} lang={lang} onClose={() => onToggle()} isAdded={isAdded} />
      )}
    </article>
  );
}

function Editor({ question, topics, lang, onClose, isAdded }) {
  const patch = useAdmin((s) => s.patch);
  const remove = useAdmin((s) => s.remove);
  const revertEdit = useAdmin((s) => s.revertEdit);
  const [draft, setDraft] = useState(question);

  // Reset draft when the question id changes (different row opened)
  useEffect(() => { setDraft(question); }, [question.id]);

  const dirty = useMemo(() => {
    return Object.keys(draft).some((k) => draft[k] !== question[k]);
  }, [draft, question]);

  const save = () => {
    if (!draft.question.trim()) {
      toast.error(lang === 'ru' ? 'Текст вопроса пустой' : 'Question text is empty');
      return;
    }
    if (!draft.answer.trim()) {
      toast.error(lang === 'ru' ? 'Ответ пустой' : 'Answer is empty');
      return;
    }
    patch(draft.id, draft);
    toast.success(lang === 'ru' ? 'Сохранено в diff' : 'Saved to diff');
  };

  const discard = () => {
    if (isAdded) return;
    revertEdit(draft.id);
    setDraft(question);
    toast.success(lang === 'ru' ? 'Возвращено к оригиналу' : 'Reverted');
  };

  const handleRemove = () => {
    if (!window.confirm(lang === 'ru' ? 'Удалить?' : 'Delete?')) return;
    remove(draft.id);
    onClose();
    toast.success(lang === 'ru' ? 'Удалено' : 'Deleted');
  };

  return (
    <div className="border-t border-rule/15 p-4 sm:p-5">
      {/* Top row: topic, order, difficulty, language */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={lang === 'ru' ? 'Тема' : 'Topic'}>
          <select
            value={draft.topic_id}
            onChange={(e) => setDraft({ ...draft, topic_id: Number(e.target.value) })}
            className="w-full rounded-xl border border-rule/12 bg-paper-2/60 px-2 py-1.5 text-sm outline-none transition-all duration-200 focus:border-brand/40 focus:bg-paper-2 focus:ring-2 focus:ring-brand/15"
          >
            {topics.map((tp) => (
              <option key={tp.id} value={tp.id}>{tp.title}</option>
            ))}
          </select>
        </Field>
        <Field label={lang === 'ru' ? 'Позиция' : 'Order index'}>
          <input
            type="number"
            value={draft.order_index}
            onChange={(e) => setDraft({ ...draft, order_index: Number(e.target.value) })}
            className="w-full rounded-xl border border-rule/12 bg-paper-2/60 px-2 py-1.5 text-sm outline-none transition-all duration-200 focus:border-brand/40 focus:bg-paper-2 focus:ring-2 focus:ring-brand/15 font-mono"
          />
        </Field>
        <Field label={lang === 'ru' ? 'Сложность' : 'Difficulty'}>
          <div className="flex gap-1">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDraft({ ...draft, difficulty: d })}
                className={cn(
                  'flex-1 rounded-xl border px-2 py-1.5 font-mono text-[11px] uppercase transition-all duration-200',
                  draft.difficulty === d
                    ? 'border-ink bg-ink text-paper'
                    : 'border-rule/12 bg-paper-2/60 text-muted hover:border-rule/25 hover:text-ink hover:bg-rule/5',
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </Field>
        <Field label={lang === 'ru' ? 'Язык кода' : 'Code language'}>
          <select
            value={draft.code_language || 'dart'}
            onChange={(e) => setDraft({ ...draft, code_language: e.target.value })}
            className="w-full rounded-xl border border-rule/12 bg-paper-2/60 px-2 py-1.5 text-sm outline-none transition-all duration-200 focus:border-brand/40 focus:bg-paper-2 focus:ring-2 focus:ring-brand/15"
          >
            {['dart', 'json', 'yaml', 'bash', 'shell', 'javascript', 'typescript', 'xml', 'ruby'].map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label={lang === 'ru' ? 'Вопрос' : 'Question'} className="mt-4">
        <textarea
          value={draft.question}
          onChange={(e) => setDraft({ ...draft, question: e.target.value })}
          rows={2}
          autoCorrect="off"
          spellCheck={false}
          className="w-full resize-y rounded-xl border border-rule/12 bg-paper-2/60 px-3 py-2 text-sm leading-relaxed outline-none transition-all duration-200 focus:border-brand/40 focus:bg-paper-2 focus:ring-2 focus:ring-brand/15"
        />
      </Field>

      <Field label={lang === 'ru' ? 'Ответ' : 'Answer'} className="mt-4">
        <textarea
          value={draft.answer}
          onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
          rows={10}
          autoCorrect="off"
          spellCheck={false}
          className="w-full resize-y rounded-xl border border-rule/12 bg-paper-2/60 px-3 py-2 text-sm leading-relaxed outline-none transition-all duration-200 focus:border-brand/40 focus:bg-paper-2 focus:ring-2 focus:ring-brand/15 answer-text"
        />
        <div className="mt-1 font-mono text-[10px] text-muted-2">
          {draft.answer.length} chars · {lang === 'ru' ? 'переносы строк сохраняются' : 'line breaks preserved'}
        </div>
      </Field>

      <Field label={lang === 'ru' ? 'Пример кода' : 'Code example'} className="mt-4">
        <textarea
          value={draft.code_example || ''}
          onChange={(e) => setDraft({ ...draft, code_example: e.target.value || null })}
          rows={12}
          autoCorrect="off"
          spellCheck={false}
          autoCapitalize="off"
          placeholder={lang === 'ru' ? '// необязательно' : '// optional'}
          className="w-full resize-y rounded-xl border border-rule/12 bg-paper-2/60 px-3 py-2 text-[12.5px] leading-relaxed outline-none transition-all duration-200 focus:border-brand/40 focus:bg-paper-2 focus:ring-2 focus:ring-brand/15 font-mono"
        />
      </Field>

      {/* Action row */}
      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-rule pt-4">
        <Button variant="brand" size="sm" onClick={save} disabled={!dirty}>
          <Save className="h-3.5 w-3.5" />
          {lang === 'ru' ? 'Сохранить' : 'Save'}
        </Button>
        {!isAdded && (
          <Button variant="ghost" size="sm" onClick={discard} disabled={!dirty}>
            <Undo2 className="h-3.5 w-3.5" />
            {lang === 'ru' ? 'Откатить' : 'Discard'}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={handleRemove} className="ml-auto text-muted hover:text-coral">
          <Trash2 className="h-3.5 w-3.5" />
          {lang === 'ru' ? 'Удалить' : 'Delete'}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children, className }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1 inline-block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function ExportMenu({ topics, questions, diff, lang }) {
  const [open, setOpen] = useState(false);

  const exportAll = () => {
    exportStaticDataJson(topics, questions, diff);
    toast.success('static-data.json downloaded');
    setOpen(false);
  };

  const exportTopic = (topic) => {
    exportTopicJson(topic, questions, diff);
    toast.success(`${topic.slug}.json downloaded`);
    setOpen(false);
  };

  return (
    <div className="relative">
      <Button variant="codex" onClick={() => setOpen((v) => !v)}>
        <Download className="h-4 w-4" />
        {lang === 'ru' ? 'Экспорт' : 'Export'}
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-md border border-rule/15 bg-paper-2 shadow-codex-lg">
          <button
            onClick={exportAll}
            className="flex w-full items-center gap-2 border-b border-rule px-3 py-2 text-left text-sm hover:bg-paper"
          >
            <FileText className="h-3.5 w-3.5 text-brand" />
            <div>
              <div className="font-medium">static-data.json</div>
              <div className="font-mono text-[10px] uppercase text-muted-2">
                {lang === 'ru' ? 'один файл — для GitHub Pages' : 'single file for Pages'}
              </div>
            </div>
          </button>
          <div className="px-3 py-2 border-b border-rule font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            {lang === 'ru' ? 'По темам (для backend seed)' : 'Per topic (backend seed)'}
          </div>
          <div className="max-h-60 overflow-y-auto">
            {topics.map((topic) => (
              <button
                key={topic.id}
                onClick={() => exportTopic(topic)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-paper"
              >
                <Sparkles className="h-3 w-3 text-mint shrink-0" />
                <span className="truncate">{topic.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
