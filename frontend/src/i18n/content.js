/**
 * Content localization hook.
 * Returns helpers that pick the right language field from topic/question objects.
 * Russian translations live in contentRu.js — generated separately.
 */
import { TOPICS_RU, QUESTIONS_RU } from './contentRu.js';

export function useContent(lang) {
  const isRu = lang === 'ru';

  return {
    /** Get localized topic title */
    topicTitle: (topic) => {
      if (!isRu) return topic.title;
      return TOPICS_RU[topic.id]?.title || topic.title;
    },

    /** Get localized topic description */
    topicDesc: (topic) => {
      if (!isRu) return topic.description;
      return TOPICS_RU[topic.id]?.description || topic.description;
    },

    /** Get localized question text */
    questionText: (question) => {
      if (!isRu) return question.question;
      return QUESTIONS_RU[question.id]?.question || question.question;
    },

    /** Get localized answer text */
    answerText: (question) => {
      if (!isRu) return question.answer;
      return QUESTIONS_RU[question.id]?.answer || question.answer;
    },
  };
}
