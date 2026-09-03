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

const SECONDS_PER_CARD = 60;

export interface TodayPlanProps {
  /**
   * Shown above the headline. Today passes nothing (its own `h1` already says
   * "Today"); the landings pass it, since there the `h1` names the stack.
   */
  eyebrow?: ReactNode;
}

/**
 * The one card on Today, painted in the stack's colour. Four lines and one
 * button: which stack this is, what today is made of, where you are weakest,
 * and the way in. The stack's mark sits as a watermark in the corner — this
 * is the one place the design spends its boldness; everything around it is
 * ink on paper.
 */
export default function TodayPlan({ eyebrow }: TodayPlanProps) {
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
    <div className="relative overflow-hidden rounded-3xl bg-brand p-5 text-on-brand shadow-codex-lg sm:p-8">
      {/* Watermark — the stack's mark, large and faint, clear of the text. */}
      <StackIcon
        stack={platform}
        className="pointer-events-none absolute -right-6 -top-8 h-44 w-44 rotate-[-8deg] opacity-[0.14] sm:-right-4 sm:-top-6 sm:h-60 sm:w-60"
      />

      <div className="relative">
        {eyebrow && <div className="mb-3 text-[12px] font-semibold text-on-brand/75">{eyebrow}</div>}

        <div className="flex items-center gap-2">
          <StackTile stack={platform} size="xs" className="bg-on-brand/20 text-on-brand shadow-none" />
          <span className="text-[13px] font-semibold tracking-[-0.005em] text-on-brand/90">{stack.label}</span>
        </div>

        <h2 className="mt-5 font-display text-[36px] font-bold leading-[0.98] tracking-[-0.03em] sm:mt-6 sm:text-[52px]">
          {empty ? c.planEmpty : allCaughtUp ? c.planCaughtUp : (
            <>
              <span className="num">{total}</span>
              {' '}{c.cardsWord(total)}
              <span className="ml-3 align-baseline text-[17px] font-semibold tracking-normal text-on-brand/70 sm:text-[20px]">
                {c.approxMinutes(minutes)}
              </span>
            </>
          )}
        </h2>

        {parts.length > 0 && (
          <p className="mt-3 text-[15px] leading-relaxed text-on-brand/85 sm:mt-4 sm:text-[16px]">{parts.join(' · ')}</p>
        )}

        {weakTopic && (
          <Link
            to={`/topic/${weakTopic.slug}`}
            className="mt-1.5 inline-block max-w-full truncate rounded-sm text-[13px] text-on-brand/70 transition-colors hover:text-on-brand"
          >
            {plan.weakUntouched
              ? c.untouched(topicTitle(weakTopic))
              : c.weakest(topicTitle(weakTopic), plan.weakMastery ?? 0)}
          </Link>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 sm:mt-8">
          <Button variant="inverse" size="lg" className="w-full sm:w-auto" onClick={start}>
            {t.nav.startSession}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
          <Link
            to="/mock"
            className="inline-flex items-center gap-1.5 rounded-sm text-[13.5px] font-medium text-on-brand/85 hover:text-on-brand hover:underline"
          >
            <Timer className="h-4 w-4" aria-hidden />
            {t.nav.timed}
          </Link>
        </div>
      </div>
    </div>
  );
}
