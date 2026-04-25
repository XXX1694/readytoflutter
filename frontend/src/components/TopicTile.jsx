import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { ProgressBar, TopicGlyph } from '../ui/index.js';
import { cn } from '../lib/cn.js';

const LEVEL_DOT = {
  junior: 'bg-brand',
  mid: 'bg-plum',
  senior: 'bg-mint',
};

export default function TopicTile({ topic, level, t, topicTitle, topicDesc }) {
  const navigate = useNavigate();
  const pct = topic.question_count > 0
    ? Math.round((topic.completed_count / topic.question_count) * 100)
    : 0;
  const completedAll = pct === 100;

  return (
    <button
      type="button"
      onClick={() => navigate(`/topic/${topic.slug}`)}
      aria-label={`${topicTitle(topic)} — ${topic.question_count}`}
      className={cn(
        'group relative flex flex-col gap-3 overflow-hidden rounded-md border-1.5 border-ink bg-paper-2 p-4 text-left',
        'shadow-codex-sm transition-all duration-150',
        'hover:-translate-x-px hover:-translate-y-px hover:shadow-codex',
        'active:translate-x-px active:translate-y-px active:shadow-none',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
      )}
    >
      <div className="flex items-start justify-between">
        <TopicGlyph topic={topic} size="md" />
        <div className="flex items-center gap-1.5">
          <span className={cn('h-1.5 w-1.5 rounded-full', LEVEL_DOT[level])} aria-hidden />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            {topic.question_count}{' '}
            <span className="text-muted-2">Q</span>
          </span>
        </div>
      </div>

      <h3 className="font-display text-lg font-medium leading-tight tracking-tight text-ink line-clamp-2">
        {topicTitle(topic)}
      </h3>
      <p className="text-xs leading-snug text-muted line-clamp-2">{topicDesc(topic)}</p>

      <div className="mt-auto flex items-center gap-2 pt-1">
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

      <ArrowUpRight
        className="absolute right-3 top-3 h-4 w-4 -translate-y-2 translate-x-2 text-brand opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100"
        aria-hidden
      />
    </button>
  );
}
