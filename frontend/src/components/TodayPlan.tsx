import { useMemo, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Timer } from 'lucide-react';
import { useQuestions, useTopics } from '../lib/queries';
import { buildPlan } from '../lib/plan';
import { useLang } from '../i18n/LangContext';
import { useT } from '../i18n/ui';
import { useContent } from '../i18n/content';
import { useHomeCopy } from '../i18n/homePage';
import { Button } from '../ui/index';
import { usePrefs } from '../store/prefs';
import { filterTopicsByPlatform, filterQuestionsByPlatform } from '../lib/platform';
import { StackIcon, StackTile } from '../lib/stackIcons';
import { useCurrentStack } from '../lib/useStack';
import { cn } from '../lib/cn';

const SECONDS_PER_CARD = 60;

/**
 * Two settings of the same card. `plate` has a row to itself: the figure and
 * the emblem grow with the width, so on a wide screen the card is a spread
 * rather than four lines in the corner of a blue rectangle. `column` is the
 * card beside the pitch headline (PageHeader's aside, from `xl`), where it
 * goes back to the phone's proportions; below `xl` the aside stacks and the
 * column card is the plate.
 */
const LAYOUT = {
  plate: {
    card: 'p-5 sm:p-8 lg:p-10',
    copy: 'max-w-[640px]',
    figure: 'text-[36px] sm:text-[52px] lg:text-[64px]',
    minutes: 'text-[17px] sm:text-[20px]',
    composition: 'text-[15px] sm:text-[16px] lg:text-[17px]',
    // The phone crops the mark in the corner; with room it sits whole,
    // upright and centred on the right, clear of the copy column — 220px
    // beside the rail at `lg`, where the plate is 704px, 280px from `xl`.
    emblem: '-right-6 -top-8 h-44 w-44 rotate-[-8deg] opacity-[0.14] sm:-right-4 sm:-top-6 sm:h-60 sm:w-60 lg:right-4 lg:top-1/2 lg:h-[220px] lg:w-[220px] lg:-translate-y-1/2 lg:rotate-0 lg:opacity-[0.16] xl:right-10 xl:h-[280px] xl:w-[280px]',
    button: 'w-full sm:w-auto',
  },
  column: {
    card: 'p-5 sm:p-8 lg:p-10 xl:p-7',
    copy: 'max-w-[640px]',
    figure: 'text-[36px] sm:text-[52px] lg:text-[64px] xl:text-[48px]',
    minutes: 'text-[17px] sm:text-[20px] xl:text-[17px]',
    composition: 'text-[15px] sm:text-[16px] lg:text-[17px] xl:text-[15px]',
    emblem: '-right-6 -top-8 h-44 w-44 rotate-[-8deg] opacity-[0.14] sm:-right-4 sm:-top-6 sm:h-60 sm:w-60 lg:right-4 lg:top-1/2 lg:h-[220px] lg:w-[220px] lg:-translate-y-1/2 lg:rotate-0 lg:opacity-[0.16] xl:-right-6 xl:-top-8 xl:h-40 xl:w-40 xl:translate-y-0 xl:rotate-[-8deg] xl:opacity-[0.14]',
    button: 'w-full sm:w-auto xl:w-full',
  },
} as const;

export interface TodayPlanProps {
  /**
   * Set at the far end of the stack row. Today passes nothing (its own `h1`
   * already says "Today"); the landings pass it, since there the `h1` names
   * the stack.
   */
  eyebrow?: ReactNode;
  /** See `LAYOUT`. Today is the plate; the pitch seats the column beside its headline. */
  layout?: keyof typeof LAYOUT;
  className?: string;
}

/**
 * The one card on Today, painted in the stack's colour. Four lines and one
 * button: which stack this is, what today is made of, where you are weakest,
 * and the way in. The stack's mark sits as a watermark — this is the one
 * place the design spends its boldness; everything around it is ink on
 * paper. In pitch mode the same card is the plate beside the headline.
 */
export default function TodayPlan({ eyebrow, layout = 'plate', className }: TodayPlanProps) {
  const L = LAYOUT[layout];
  const navigate = useNavigate();
  const { lang } = useLang();
  const t = useT(lang);
  const c = useHomeCopy(lang);
  const { topicTitle } = useContent(lang);
  const { data: allQuestions = [] } = useQuestions();
  const { data: allTopics = [] } = useTopics();
  const platform = usePrefs((s) => s.platform);
  const stack = useCurrentStack();

  // Scope today's plan to the currently-selected platform so an iOS-focused
  // user doesn't get Flutter cards in their session, and vice versa.
  const topics = useMemo(
    () => filterTopicsByPlatform(allTopics, platform),
    [allTopics, platform],
  );
  const questions = useMemo(
    () => filterQuestionsByPlatform(allQuestions, allTopics, platform),
    [allQuestions, allTopics, platform],
  );

  const plan = useMemo(() => buildPlan(questions, topics), [questions, topics]);

  const total = plan.ids.length;
  const minutes = Math.max(1, Math.round((total * SECONDS_PER_CARD) / 60));
  // Nothing in the stack at all vs. everything learned and nothing due.
  const empty = questions.length === 0;
  const allCaughtUp = !empty && total === 0;
  const weakTopic = plan.weakTopic;

  // The deep link the button opens. Same contract as before: an explicit id
  // list plus the label the session header shows.
  const start = (): void => {
    if (total === 0) {
      navigate('/study');
      return;
    }
    navigate(`/study?ids=${plan.ids.join(',')}&label=${encodeURIComponent(t.nav.today)}`);
  };

  // Composition, as a sentence rather than a rack of chips.
  const parts: string[] = [];
  if (plan.due > 0) parts.push(t.nav.due(plan.due));
  if (plan.weak > 0) parts.push(plan.weakUntouched ? c.weakNew(plan.weak) : c.weak(plan.weak));
  if (plan.fresh > 0) parts.push(c.fresh(plan.fresh));

  return (
    <div className={cn('relative overflow-hidden rounded-3xl bg-brand text-on-brand shadow-codex-lg', L.card, className)}>
      {/* Watermark — the stack's mark, large and faint, clear of the text. */}
      <StackIcon stack={platform} className={cn('pointer-events-none absolute', L.emblem)} />

      <div className={cn('relative', L.copy)}>
        <div className="flex items-center gap-2">
          <StackTile stack={platform} size="xs" className="bg-on-brand/20 text-on-brand shadow-none" />
          <span className="text-[13px] font-semibold tracking-[-0.005em] text-on-brand/90">{stack.label}</span>
          {eyebrow && <span className="ml-auto text-[12px] font-semibold text-on-brand/75">{eyebrow}</span>}
        </div>

        <h2 className={cn('mt-5 font-display font-bold leading-[0.98] tracking-[-0.03em] sm:mt-6', L.figure)}>
          {empty ? c.planEmpty : allCaughtUp ? c.planCaughtUp : (
            <>
              <span className="num">{total}</span>
              {' '}{c.cardsWord(total)}
              <span className={cn('ml-3 align-baseline font-semibold tracking-normal text-on-brand/70', L.minutes)}>
                {c.approxMinutes(minutes)}
              </span>
            </>
          )}
        </h2>

        {parts.length > 0 && (
          <p className={cn('mt-3 leading-relaxed text-on-brand/85 sm:mt-4', L.composition)}>{parts.join(' · ')}</p>
        )}

        {weakTopic && (
          <Link
            to={`/topic/${weakTopic.slug}`}
            // `py-1` lifts the hit box past the 24px WCAG 2.2 minimum; the
            // halved top margin and the negative bottom margin keep the text
            // exactly where it sat before the padding was added.
            className="group -mb-1 mt-0.5 flex w-fit max-w-full items-center gap-1 rounded-sm py-1 text-[13px] text-on-brand/70 transition-colors hover:text-on-brand"
          >
            <span className="truncate underline-offset-[3px] group-hover:underline">
              {plan.weakUntouched
                ? c.untouched(topicTitle(weakTopic))
                : c.weakest(topicTitle(weakTopic), plan.weakMastery ?? 0)}
            </span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
          </Link>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 sm:mt-8">
          <Button variant="inverse" size="lg" className={L.button} onClick={start}>
            {t.nav.startSession}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
          <Link
            to="/mock"
            // `py-1 -my-1` grows the hit box past 24px without growing the row.
            className="-my-1 inline-flex items-center gap-1.5 rounded-sm py-1 text-[13.5px] font-medium text-on-brand/85 hover:text-on-brand hover:underline"
          >
            <Timer className="h-4 w-4" aria-hidden />
            {t.nav.timed}
          </Link>
        </div>
      </div>
    </div>
  );
}
