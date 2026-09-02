/**
 * The flow /study, /mock and /round all run: walk a queue of questions one at
 * a time, let the user write down what they remember, reveal the reference
 * answer, take a self-grade, move on.
 *
 * Deliberately *not* in here, because each belongs to exactly one page: how the
 * queue is built (SRS due-queue / random set / built round), the mock's
 * per-question timer, the SRS write-back, the round's follow-up prompts. Those
 * arrive as options or stay in the page's own state.
 */
import { useCallback, useRef, useState, type RefObject } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

import type { Rating } from '../types/domain';

/** The only thing the session machinery needs to know about a question. */
export interface SessionItem {
  id: number;
}

/** A self-grade, plus the bucket the mock and the round record for a skip. */
export type Outcome = Rating | 'skipped';

/** Self-grade order. A rating's position here is the number key that fires it. */
export const RATING_ORDER: readonly Rating[] = ['again', 'hard', 'good', 'easy'];

export type OutcomeCounts = Record<Outcome, number>;

/** Tallies a session's grades — the shape all three recap screens read from. */
export function countOutcomes(outcomes: Readonly<Record<number, Outcome>>): OutcomeCounts {
  const counts: OutcomeCounts = { again: 0, hard: 0, good: 0, easy: 0, skipped: 0 };
  for (const outcome of Object.values(outcomes)) counts[outcome] += 1;
  return counts;
}

/** Long enough for the next question to paint before we steal focus. */
const FOCUS_DELAY_MS = 50;

export interface QuestionSessionOptions<T extends SessionItem> {
  /**
   * The questions to work through. A different array is a different session:
   * position, reveal state, drafts and grades all reset. Pages that rebuild
   * their queue (study's due queue, mock's shuffle) get that for free; a page
   * that re-runs the same queue calls `restart()`.
   */
  queue: T[];
  /**
   * How the keyboard reveals the answer.
   *  - `space` toggles the reveal, and is ignored while a text field has focus
   *    so it can never eat a space out of the draft.
   *  - `mod+enter` reveals, and works from inside the draft box.
   */
  revealHotkey: 'space' | 'mod+enter';
  /** Escape — from the draft box too, which in the mock and the round has focus the whole time. */
  onExit: () => void;
  /** Reveals the answer without user input — the mock's per-question timer. */
  autoRevealed?: boolean;
  /** Characters the draft is capped at. Uncapped when omitted. */
  draftLimit?: number;
  /** Runs on a self-grade, before the session advances. */
  onGrade?: (item: T, rating: Rating) => void;
  /** Runs whenever the session leaves a question, graded or skipped. */
  onAdvance?: () => void;
}

export interface QuestionSession<T extends SessionItem> {
  /** Zero-based position. Equals `total` once the session is finished. */
  index: number;
  total: number;
  current: T | undefined;
  finished: boolean;
  revealed: boolean;
  reveal: () => void;
  /** The current question's draft. */
  draft: string;
  setDraft: (text: string) => void;
  /** Appends a phrase, inserting a separating space — voice dictation. */
  appendDraft: (chunk: string) => void;
  /** Attach to the draft textarea; focused for you on every advance. */
  draftRef: RefObject<HTMLTextAreaElement>;
  /** Every draft written this session, by question id — for recap screens. */
  drafts: Readonly<Record<number, string>>;
  /** Every grade taken this session, by question id. */
  outcomes: Readonly<Record<number, Outcome>>;
  grade: (rating: Rating) => void;
  skip: () => void;
  /** Runs the same queue again from the top. */
  restart: () => void;
}

export function useQuestionSession<T extends SessionItem>({
  queue,
  revealHotkey,
  onExit,
  autoRevealed = false,
  draftLimit,
  onGrade,
  onAdvance,
}: QuestionSessionOptions<T>): QuestionSession<T> {
  const [index, setIndex] = useState(0);
  const [revealedByUser, setRevealedByUser] = useState(false);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [outcomes, setOutcomes] = useState<Record<number, Outcome>>({});
  const draftRef = useRef<HTMLTextAreaElement>(null);

  const restart = useCallback(() => {
    setIndex(0);
    setRevealedByUser(false);
    setDrafts({});
    setOutcomes({});
  }, []);

  // A queue the caller rebuilt is a new session. Adjusting state during render
  // is React's own answer to "derive state from a prop": it re-runs the
  // component before committing, so nothing downstream sees the stale index.
  const [activeQueue, setActiveQueue] = useState(queue);
  if (activeQueue !== queue) {
    setActiveQueue(queue);
    restart();
  }

  const total = queue.length;
  const current = queue[index];
  const finished = total > 0 && index >= total;
  const revealed = revealedByUser || autoRevealed;

  const cap = useCallback(
    (text: string) => (draftLimit === undefined ? text : text.slice(0, draftLimit)),
    [draftLimit],
  );

  const setDraft = useCallback(
    (text: string) => {
      const item = queue[index];
      if (!item) return;
      setDrafts((prev) => ({ ...prev, [item.id]: cap(text) }));
    },
    [queue, index, cap],
  );

  const appendDraft = useCallback(
    (chunk: string) => {
      const item = queue[index];
      if (!item) return;
      setDrafts((prev) => {
        const existing = prev[item.id] || '';
        const sep = existing && !/\s$/.test(existing) ? ' ' : '';
        return { ...prev, [item.id]: cap(existing + sep + chunk) };
      });
    },
    [queue, index, cap],
  );

  const commit = useCallback(
    (item: T, outcome: Outcome) => {
      setOutcomes((prev) => ({ ...prev, [item.id]: outcome }));
      setRevealedByUser(false);
      setIndex((i) => i + 1);
      onAdvance?.();
      window.setTimeout(() => draftRef.current?.focus(), FOCUS_DELAY_MS);
    },
    [onAdvance],
  );

  const grade = useCallback(
    (rating: Rating) => {
      const item = queue[index];
      if (!item) return;
      onGrade?.(item, rating);
      commit(item, rating);
    },
    [queue, index, onGrade, commit],
  );

  const skip = useCallback(() => {
    const item = queue[index];
    if (!item) return;
    commit(item, 'skipped');
  }, [queue, index, commit]);

  const reveal = useCallback(() => setRevealedByUser(true), []);

  useHotkeys(
    revealHotkey,
    (event) => {
      event.preventDefault();
      if (!current) return;
      setRevealedByUser((v) => (revealHotkey === 'space' ? !v : true));
    },
    { enableOnFormTags: revealHotkey !== 'space' },
    [current, revealHotkey],
  );

  // Read the matched hotkey rather than the event's key: the library matches on
  // physical key position, so on a layout where Digit1 types something else
  // `event.key` would not be "1".
  // `preventDefault` matters here: grading advances the session and the next
  // question's draft box is focused in the same keydown dispatch, so without
  // it the digit you pressed lands as the first character of the next draft.
  useHotkeys(
    ['1', '2', '3', '4'],
    (_event, matched) => {
      if (!revealed) return;
      const rating = RATING_ORDER[Number(matched.hotkey) - 1];
      if (rating) grade(rating);
    },
    { enableOnFormTags: false, preventDefault: true },
    [revealed, grade],
  );

  useHotkeys('escape', onExit, { enableOnFormTags: ['textarea'] }, [onExit]);

  return {
    index,
    total,
    current,
    finished,
    revealed,
    reveal,
    draft: current ? drafts[current.id] || '' : '',
    setDraft,
    appendDraft,
    draftRef,
    drafts,
    outcomes,
    grade,
    skip,
    restart,
  };
}
