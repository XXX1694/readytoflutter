/**
 * FSRS-6 — the scheduler's memory model.
 *
 * SM-2 (what this replaced) tracks one number per card, an "ease" it nudges up
 * or down, and multiplies the interval by it. It has no model of forgetting: it
 * cannot answer "how likely is this to be remembered on the 20th", which is the
 * only question someone with an interview booked actually has.
 *
 * FSRS keeps two numbers instead:
 *   stability  S — the number of days after which recall has decayed to 90%
 *   difficulty D — 1..10, how fast this particular card decays for this person
 * and a forgetting curve R(t, S) that turns them into a probability at any
 * future moment. `lib/readiness.ts` is the reason that matters here.
 *
 * The formulas and the default weights are ported from ts-fsrs 5.4.2
 * (open-spaced-repetition, MIT), which is the reference implementation Anki
 * ships. Ported rather than depended on: `lib/srs.ts` is reached from the tab
 * bar's due badge and so sits in the eager chunk, where the package would cost
 * 13 KB gzip against a 95 KB budget, and this is the ~10% of it we use.
 *
 * Everything here is pure: no storage, no clock. `lib/srs.ts` owns both.
 */

/** Rating as FSRS numbers them. The app's four words map onto these. */
export type Grade = 1 | 2 | 3 | 4;

/** The two numbers that are the memory model. */
export interface Memory {
  stability: number;
  difficulty: number;
}

/**
 * FSRS-6 default weights. w[20] is the decay exponent; the rest are fitted
 * parameters. These are the population defaults — a per-user optimiser needs a
 * review log we do not keep, and the defaults are what an un-optimised Anki
 * collection runs on too.
 */
export const W: readonly number[] = [
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666,
  0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658,
  0.1542,
];

const S_MIN = 0.001;
const S_MAX = 36500;
const DECAY = -W[20];
/** Chosen so that R(S, S) is exactly 0.9 — the definition of stability. */
const FACTOR = Math.exp(Math.log(0.9) / DECAY) - 1;

const clamp = (x: number, lo: number, hi: number): number => Math.min(Math.max(x, lo), hi);

/**
 * The forgetting curve: the probability of recalling a card `elapsedDays` after
 * its last review, given its stability. A power law, not an exponential — real
 * forgetting has a long tail, which is why a card left for a year is not as
 * lost as an exponential would predict.
 */
export function retrievability(elapsedDays: number, stability: number): number {
  if (!(stability > 0)) return 0;
  const t = Math.max(0, elapsedDays);
  return Math.pow(1 + (FACTOR * t) / stability, DECAY);
}

/** Days until recall decays to `retention`. The inverse of the curve above. */
export function intervalForRetention(stability: number, retention: number): number {
  const modifier = (Math.pow(retention, 1 / DECAY) - 1) / FACTOR;
  return clamp(Math.round(stability * modifier), 1, S_MAX);
}

/** A card's very first stability is just the weight for the grade it got. */
const initialStability = (g: Grade): number => Math.max(W[g - 1], 0.1);

/**
 * ...and its first difficulty, easiest for "easy" and hardest for "again".
 *
 * The raw curve runs past both ends of the 1..10 scale — D₀(4) is about -4.8 —
 * and the mean reversion below deliberately reverts toward that raw value, not
 * toward a clamped 1. Clamping it there would weaken the pull and let a card
 * ratchet upward. So the raw form stays private and only a first rating, which
 * has to produce a real difficulty, gets the clamp.
 */
const rawInitialDifficulty = (g: Grade): number => W[4] - Math.exp((g - 1) * W[5]) + 1;

export const initialDifficulty = (g: Grade): number => clamp(rawInitialDifficulty(g), 1, 10);

/**
 * Difficulty drifts toward the grade just given, damped so a card already near
 * the ends of the scale moves less, then pulled slightly back toward the
 * difficulty of an "easy" first answer. Without that mean reversion a run of
 * "hard" would ratchet a card to 10 and strand it there.
 */
function nextDifficulty(d: number, g: Grade): number {
  const deltaD = -W[6] * (g - 3);
  const damped = d + (deltaD * (10 - d)) / 9;
  return clamp(W[7] * rawInitialDifficulty(4) + (1 - W[7]) * damped, 1, 10);
}

/** Stability after a card was recalled: the harder it was, the less it grows. */
function recallStability(d: number, s: number, r: number, g: Grade): number {
  const hardPenalty = g === 2 ? W[15] : 1;
  const easyBonus = g === 4 ? W[16] : 1;
  const growth =
    Math.exp(W[8]) *
    (11 - d) *
    Math.pow(s, -W[9]) *
    (Math.exp((1 - r) * W[10]) - 1) *
    hardPenalty *
    easyBonus;
  return clamp(s * (1 + growth), S_MIN, S_MAX);
}

/** Stability after a lapse. Never above where it was — forgetting costs. */
function forgetStability(d: number, s: number, r: number): number {
  const next =
    W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp((1 - r) * W[14]);
  return clamp(next, S_MIN, S_MAX);
}

/** A same-day re-rating moves stability by much less than a spaced one. */
function shortTermStability(s: number, g: Grade): number {
  const sinc = Math.pow(s, -W[19]) * Math.exp(W[17] * (g - 3 + W[18]));
  return clamp(s * (g >= 2 ? Math.max(sinc, 1) : sinc), S_MIN, S_MAX);
}

/**
 * The whole step: where a grade moves a card's memory state.
 *
 * `elapsedDays` is the real gap since the last review, which is what makes the
 * model work — answering correctly after three weeks is far stronger evidence
 * than answering correctly after a day, and the same grade is worth a different
 * amount of stability in each case.
 *
 * A card with no history (`prev` null) gets the initial values for its grade.
 */
export function nextMemory(prev: Memory | null, g: Grade, elapsedDays: number): Memory {
  if (!prev || !(prev.stability > 0)) {
    return { stability: initialStability(g), difficulty: initialDifficulty(g) };
  }
  const { stability: s, difficulty: d } = prev;
  const r = retrievability(elapsedDays, s);

  let stability: number;
  if (elapsedDays < 1) {
    // Same day: the card has not had a chance to decay, so a re-rating is worth
    // very little. Without this branch, drilling a card five times in one
    // session would inflate its stability as if five weeks had passed.
    stability = shortTermStability(s, g);
  } else if (g === 1) {
    // A lapse cannot leave the card more stable than the short-term floor.
    stability = clamp(s / Math.exp(W[17] * W[18]), S_MIN, forgetStability(d, s, r));
  } else {
    stability = recallStability(d, s, r, g);
  }
  return { stability, difficulty: nextDifficulty(d, g) };
}

/**
 * A legacy SM-2 card's memory state, for the one-time migration in `lib/srs.ts`.
 *
 * The interval maps straight across: SM-2's interval is already "days until we
 * ask again", which is what stability means, and the schedule the user has
 * earned therefore survives the switch untouched. Ease has no counterpart, so
 * it becomes a monotone proxy for difficulty anchored at the SM-2 default —
 * a card sitting at 2.5 lands on the difficulty a first "good" would give it,
 * and every step of ease below that is worth four tenths of a difficulty point.
 */
export function fromSm2(ease: number, interval: number): Memory {
  const e = Number.isFinite(ease) ? ease : 2.5;
  const i = Number.isFinite(interval) ? interval : 0;
  return {
    stability: clamp(i > 0 ? i : initialStability(3), S_MIN, S_MAX),
    difficulty: clamp(initialDifficulty(3) + (2.5 - e) * 4, 1, 10),
  };
}
