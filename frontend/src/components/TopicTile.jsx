import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Flame } from 'lucide-react';
import { ProgressBar, TopicGlyph } from '../ui/index.js';
import { cn } from '../lib/cn.js';

const LEVEL_DOT = {
  junior: 'bg-brand',
  mid: 'bg-plum',
  senior: 'bg-mint',
};

export default function TopicTile({ topic, level, t, topicTitle, topicDesc, dueCount = 0 }) {
  const navigate = useNavigate();
  const pct = topic.question_count > 0
    ? Math.round((topic.completed_count / topic.question_count) * 100)
    : 0;
  const completedAll = pct === 100;
  const hasDue = dueCount > 0;

  return (
    <button
      type="button"
      onClick={() => navigate(`/topic/${topic.slug}`)}
      aria-label={`${topicTitle(topic)} — ${topic.question_count}${hasDue ? ` · ${dueCount} due` : ''}`}
      className={cn(
        'group relative flex flex-col gap-3 overflow-hidden rounded-2xl border bg-paper-2 p-5 text-left',
        'shadow-[0_1px_2px_0_rgb(var(--shadow)/0.04),0_4px_16px_-4px_rgb(var(--shadow)/0.06)]',
        'transition-all duration-300 ease-out',
        'hover:-translate-y-0.5 hover:shadow-[0_2px_4px_0_rgb(var(--shadow)/0.06),0_16px_40px_-8px_rgb(var(--shadow)/0.12)]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        hasDue ? 'border-[rgb(var(--amber))]/30 hover:border-[rgb(var(--amber))]/50' : 'border-rule/8 hover:border-rule/20',
      )}
    >
      {/* Aurora wash that fades in on hover — gives the card "ambient lighting" */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-0 bg-gradient-to-br from-brand/0 via-transparent to-brand-sky/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-hover:from-brand/[0.06] group-hover:to-brand-sky/[0.04]"
      />

      {/* Pending-review accent stripe — only when SRS has due cards here. */}
      {hasDue && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[rgb(var(--amber))] to-transparent"
        />
      )}

      <div className="relative flex items-start justify-between">
        <TopicGlyph topic={topic} size="md" />
        <div className="flex items-center gap-1.5">
          {hasDue && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-[rgb(var(--amber))]/12 px-2 py-0.5 font-mono text-[10px] uppercase tabular-nums tracking-wider text-[rgb(var(--amber))]">
              <Flame className="h-2.5 w-2.5" aria-hidden />
              {dueCount}
            </span>
          )}
          <span className={cn('h-1.5 w-1.5 rounded-full', LEVEL_DOT[level])} aria-hidden />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            {topic.question_count}
            <span className="ml-0.5 text-muted-2">Q</span>
          </span>
        </div>
      </div>

      <h3 className="relative font-display text-[17px] font-semibold leading-tight tracking-tight text-ink line-clamp-2">
        {topicTitle(topic)}
      </h3>
      <p className="relative text-[12.5px] leading-snug text-muted line-clamp-2">{topicDesc(topic)}</p>

      <div className="relative mt-auto flex items-center gap-2 pt-1">
        <ProgressBar
          value={topic.completed_count || 0}
          max={topic.question_count || 0}
          size="xs"
          tone={completedAll ? 'mint' : 'brand'}
        />
        <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted">
          {topic.completed_count || 0}/{topic.question_count || 0}
        </span>
      </div>

      {/* Hover arrow — slides in from off-corner */}
      {!hasDue && (
        <ArrowUpRight
          className="absolute right-4 top-4 h-4 w-4 -translate-y-1 translate-x-1 text-brand opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100"
          aria-hidden
        />
      )}
    </button>
  );
}
