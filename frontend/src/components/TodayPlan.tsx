import { useMemo, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuestions, useTopics } from '../lib/queries';
import { buildPlan } from '../lib/plan';
import { useLang } from '../i18n/LangContext';
import { useT } from '../i18n/ui';
import { useContent } from '../i18n/content';
import { useHomeCopy } from '../i18n/homePage';
import { Button, Eyebrow } from '../ui/index';
import { usePrefs } from '../store/prefs';
import { filterTopicsByPlatform, filterQuestionsByPlatform } from '../lib/platform';


const SECONDS_PER_CARD = 60;

export interface TodayPlanProps {
  /**
   * Shown above the headline. Today passes nothing (its own `h1` already says
   * "Today"); the landings pass it, since there the `h1` names the stack.
   */
  eyebrow?: ReactNode;
}

/**
 * The one card on Today. Four lines and one button: what today is, what it is
 * made of, where you are weakest, and the way in. Everything it used to also
 * carry — an SRS-only button, a mock button, an "x / 636 learned" tally — was
 * a second and third answer to a question the page asks once.
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
    <div className="codex-card p-5 sm:p-7">
      {eyebrow && <Eyebrow className="mb-2">{eyebrow}</Eyebrow>}

      <h2 className="font-display text-[26px] font-semibold leading-tight text-ink sm:text-[30px]">
        {empty ? c.planEmpty : allCaughtUp ? c.planCaughtUp : <span className="num">{c.plan(total, minutes)}</span>}
      </h2>

      {parts.length > 0 && (
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{parts.join(' · ')}</p>
      )}

      {weakTopic && (
        <Link
          to={`/topic/${weakTopic.slug}`}
          className="mt-2 inline-block max-w-full truncate rounded-sm text-[13px] text-muted transition-colors hover:text-ink"
        >
          {plan.weakUntouched
            ? c.untouched(topicTitle(weakTopic))
            : c.weakest(topicTitle(weakTopic), plan.weakMastery ?? 0)}
        </Link>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 sm:mt-6">
        <Button variant="brand" size="md" className="w-full sm:w-auto" onClick={start}>
          {t.nav.startSession}
        </Button>
        <Link to="/mock" className="rounded-sm text-[13px] text-brand hover:underline">
          {t.nav.timed}
        </Link>
      </div>
    </div>
  );
}
