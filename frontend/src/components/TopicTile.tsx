import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopicGlyph } from '../ui/index';
import { useLang } from '../i18n/LangContext';
import { cn } from '../lib/cn';

import type { Topic } from '../types/domain';
import type { UICopy } from '../i18n/ui';
import type { ContentHelpers } from '../i18n/content';

export interface TopicTileProps {
  topic: Topic;
  t: UICopy;
  topicTitle: ContentHelpers['topicTitle'];
  topicDesc: ContentHelpers['topicDesc'];
  /** SRS cards waiting in this topic. */
  dueCount?: number;
}

/**
 * One topic in the catalogue grid.
 *
 * Progress is a tally, not a bar: fifty progress bars in a grid is the shape
 * of a monitoring console, and `7 / 12` is both smaller and more precise than
 * a 4px sliver. A finished topic turns its count mint — the semantic "right" —
 * and a topic with cards waiting gets the marker, because that is the one
 * thing on the tile you can act on today.
 */
function TopicTile({ topic, t, topicTitle, topicDesc, dueCount = 0 }: TopicTileProps) {
  const navigate = useNavigate();
  const { lang } = useLang();
  const total = topic.question_count || 0;
  const done = topic.completed_count || 0;
  const completedAll = total > 0 && done === total;
  const hasDue = dueCount > 0;
  const dueLabel = lang === 'ru' ? 'к разбору' : 'due';

  return (
    <button
      type="button"
      onClick={() => navigate(`/topic/${topic.slug}`)}
      aria-label={`${topicTitle(topic)} — ${done}/${total} ${t.completedOf}${hasDue ? `, ${dueCount} ${dueLabel}` : ''}`}
      className={cn(
        'codex-card flex flex-col gap-2.5 p-4 text-left',
        hasDue && 'border-[rgb(var(--marker)/0.55)] hover:border-[rgb(var(--marker)/0.75)]',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <TopicGlyph topic={topic} size="md" />
        {hasDue && (
          <span className="marker shrink-0 text-[13px] text-ink">
            <span className="num">{dueCount}</span> {dueLabel}
          </span>
        )}
      </div>

      <h3 className="font-display text-[17px] font-semibold leading-tight text-ink line-clamp-2">
        {topicTitle(topic)}
      </h3>
      <p className="text-[13px] leading-snug text-muted line-clamp-2">{topicDesc(topic)}</p>

      <div className="mt-auto flex items-baseline gap-1.5 pt-1">
        <span className={cn('num text-[15px]', completedAll ? 'text-mint' : 'text-ink')}>
          {done}
        </span>
        <span className="num text-[13px] text-muted">/ {total}</span>
        <span className="text-[13px] text-muted">{t.completedOf}</span>
      </div>
    </button>
  );
}

export default memo(TopicTile);
