/**
 * Content localization hook.
 * Returns helpers that pick the right language field from topic/question objects.
 * Russian translations live in contentRu.ts — generated separately.
 */
import { TOPICS_RU, QUESTIONS_RU } from './contentRu';

import type { Topic, Question } from '../types/domain';
import type { Lang } from './LangContext';

export interface ContentHelpers {
  topicTitle: (topic: Pick<Topic, 'id' | 'title'>) => string;
  topicDesc: (topic: Pick<Topic, 'id' | 'description'>) => string;
  questionText: (question: Pick<Question, 'id' | 'question'>) => string;
  answerText: (question: Pick<Question, 'id' | 'answer'>) => string;
}

export function useContent(lang: Lang): ContentHelpers {
  const isRu = lang === 'ru';

  return {
    topicTitle: (topic) => {
      if (!isRu) return topic.title;
      return TOPICS_RU[topic.id]?.title || topic.title;
    },
    topicDesc: (topic) => {
      if (!isRu) return topic.description;
      return TOPICS_RU[topic.id]?.description || topic.description;
    },
    questionText: (question) => {
      if (!isRu) return question.question;
      return QUESTIONS_RU[question.id]?.question || question.question;
    },
    answerText: (question) => {
      if (!isRu) return question.answer;
      return QUESTIONS_RU[question.id]?.answer || question.answer;
    },
  };
}
