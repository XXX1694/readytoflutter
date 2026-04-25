import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Sparkles, Flame } from 'lucide-react';
import { useQuestions } from '../lib/queries.js';
import { getSrsSummary } from '../lib/srs.js';
import { useLang } from '../i18n/LangContext.jsx';
import { Button, Eyebrow } from '../ui/index.js';
import { cn } from '../lib/cn.js';

export default function DueWidget() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const { data: questions = [] } = useQuestions();

  const summary = useMemo(() => getSrsSummary(questions), [questions]);
  const ready = summary.due + summary.overdue;
  const startable = ready + Math.min(summary.fresh, 10);

  return (
    <div className="rounded-md border-1.5 border-ink bg-paper-2 p-5 shadow-codex-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Eyebrow accent="brand">
            {lang === 'ru' ? 'Карточки на сегодня' : 'Due today'}
          </Eyebrow>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="num text-display-xs text-ink sm:text-display-sm">{startable}</span>
            <span className="font-mono text-xs uppercase text-muted">
              {lang === 'ru' ? 'к разбору' : 'to review'}
            </span>
          </div>
        </div>
        <Brain className="h-7 w-7 text-brand" aria-hidden />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat
          label={lang === 'ru' ? 'Просрочено' : 'Overdue'}
          value={summary.overdue}
          accent="text-coral"
          icon={<Flame className="h-3 w-3" />}
        />
        <Stat
          label={lang === 'ru' ? 'Сегодня' : 'Today'}
          value={summary.due}
          accent="text-[rgb(var(--amber))]"
        />
        <Stat
          label={lang === 'ru' ? 'Новых' : 'New'}
          value={summary.fresh}
          accent="text-brand"
          icon={<Sparkles className="h-3 w-3" />}
        />
      </div>

      <Button
        variant="brand"
        size="md"
        className="mt-5 w-full"
        onClick={() => navigate('/study')}
        disabled={startable === 0}
      >
        <Brain className="h-4 w-4" />
        {startable === 0
          ? (lang === 'ru' ? 'Очередь пуста' : 'Queue empty')
          : (lang === 'ru' ? 'Начать сессию' : 'Start session')}
      </Button>
      <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-wider text-muted-2">
        {lang === 'ru'
          ? `${summary.learned} изучено · ${summary.total} всего`
          : `${summary.learned} learned · ${summary.total} total`}
      </p>
    </div>
  );
}

function Stat({ label, value, accent, icon }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-md border border-rule px-2 py-2">
      <span className={cn('num text-xl tabular-nums', accent)}>{value}</span>
      <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-muted">
        {icon}{label}
      </span>
    </div>
  );
}
