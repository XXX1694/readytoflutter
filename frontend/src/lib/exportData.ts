/**
 * Export helpers — turn the admin diff into downloadable JSON.
 * Two shapes:
 *  - static-data.json: single bundle the frontend's static-fallback reads
 *  - per-topic JSONs: matches backend/data/seed/questions/*.json layout
 */

import { applyDiff, type AdminDiff } from '../store/admin';
import type { Topic, Question } from '../types/domain';

const QUESTION_FIELDS: Array<keyof Question> = [
  'id', 'topic_id', 'order_index', 'difficulty',
  'question', 'answer', 'code_example', 'code_language',
];

type SerializableQuestion = Partial<Pick<Question, typeof QUESTION_FIELDS[number]>>;

function pickQuestion(q: Question): SerializableQuestion {
  // Strip any UI-only fields (status, notes, topic_title, etc.)
  const out: Record<string, unknown> = {};
  for (const k of QUESTION_FIELDS) out[k] = q[k] ?? null;
  return out as SerializableQuestion;
}

function topicFilename(topic: Topic): string {
  const slug = topic.slug || topic.title.toLowerCase().replace(/\W+/g, '-');
  const idx = String(topic.order_index || topic.id).padStart(2, '0');
  return `${idx}-${slug}.json`;
}

function downloadFile(name: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface StaticDataBundle {
  topics: Topic[];
  questions: SerializableQuestion[];
}

export function buildStaticData(topics: Topic[], questions: Question[], diff: AdminDiff): StaticDataBundle {
  const merged = applyDiff(questions, diff)
    .map(pickQuestion)
    .sort((a, b) => ((a.topic_id ?? 0) - (b.topic_id ?? 0)) || ((a.order_index ?? 0) - (b.order_index ?? 0)));
  return { topics, questions: merged };
}

export function exportStaticDataJson(topics: Topic[], questions: Question[], diff: AdminDiff): void {
  const data = buildStaticData(topics, questions, diff);
  downloadFile('static-data.json', `${JSON.stringify(data, null, 2)}\n`);
}

export function exportTopicJson(topic: Topic, questions: Question[], diff: AdminDiff): void {
  const merged = applyDiff(questions, diff)
    .filter((q) => q.topic_id === topic.id)
    .map(pickQuestion)
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  downloadFile(topicFilename(topic), `${JSON.stringify(merged, null, 2)}\n`);
}

export function exportAllTopicJsons(topics: Topic[], questions: Question[], diff: AdminDiff): void {
  for (const topic of topics) {
    exportTopicJson(topic, questions, diff);
  }
}

/**
 * For brand-new questions, propose a non-colliding id by taking the max of all
 * existing ids (base + adds) and adding 1, with a topic-scoped offset so the
 * id is recognizably from that topic when scanning JSON.
 */
export function nextQuestionId(base: Question[], diff: AdminDiff, topicId: number): number {
  const existing = applyDiff(base, diff).map((q) => q.id);
  const max = existing.length ? Math.max(...existing) : 0;
  const topicOffset = topicId * 1000;
  return Math.max(max + 1, topicOffset);
}
