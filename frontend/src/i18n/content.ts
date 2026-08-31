/**
 * Content localization hook.
 * Returns helpers that pick the right language field from topic/question objects.
 * Russian translations live in contentRu.ts — generated separately.
 *
 * contentRu.ts is ~630 KB of source (every topic, question and answer in RU).
 * It is pulled in through a dynamic import so it never lands in the eager
 * App → Layout → Sidebar chunk — English visitors never download it. Until the
 * chunk resolves the helpers return the English field, which is the same
 * fallback already used for questions that have no translation.
 */
import { useEffect, useState } from 'react';

import type { Topic, Question } from '../types/domain';
import type { Lang } from './LangContext';

// Type-only reference — erased at compile time, so it doesn't pull the module
// back into the eager graph.
type RuTables = typeof import('./contentRu');

let ru: RuTables | null = null;
let ruPromise: Promise<RuTables> | null = null;

function loadRu(): Promise<RuTables> {
  if (!ruPromise) {
    ruPromise = import('./contentRu')
      .then((mod) => {
        ru = mod;
        return mod;
      })
      .catch((err) => {
        // Reset on error so the next render retries instead of memoizing the
        // failure — same pattern as loadStaticData() in api/api.ts. Until it
        // succeeds the helpers keep serving English.
        ruPromise = null;
        throw err;
      });
  }
  return ruPromise;
}

// A returning RU user would otherwise get one English frame before the chunk
// resolves. Kick the fetch off at module load — ahead of React mounting —
// when the persisted language is already Russian.
if (typeof window !== 'undefined' && localStorage.getItem('lang') === 'ru') {
  loadRu().catch(() => {});
}

export interface ContentHelpers {
  topicTitle: (topic: Pick<Topic, 'id' | 'title'>) => string;
  topicDesc: (topic: Pick<Topic, 'id' | 'description'>) => string;
  questionText: (question: Pick<Question, 'id' | 'question'>) => string;
  answerText: (question: Pick<Question, 'id' | 'answer'>) => string;
}

export function useContent(lang: Lang): ContentHelpers {
  const isRu = lang === 'ru';
  // Bumped once the RU chunk lands so components re-render with translations.
  const [, setRuLoaded] = useState(false);

  useEffect(() => {
    if (!isRu || ru) return;
    let alive = true;
    loadRu()
      .then(() => {
        if (alive) setRuLoaded(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [isRu]);

  const t = isRu ? ru : null;

  return {
    topicTitle: (topic) => t?.TOPICS_RU[topic.id]?.title || topic.title,
    topicDesc: (topic) => t?.TOPICS_RU[topic.id]?.description || topic.description,
    questionText: (question) => t?.QUESTIONS_RU[question.id]?.question || question.question,
    answerText: (question) => t?.QUESTIONS_RU[question.id]?.answer || question.answer,
  };
}
