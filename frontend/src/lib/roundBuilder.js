/**
 * Build a 5-question "interview round" — a connected chain of questions from
 * a single topic that simulate how a real interviewer would dig deeper around
 * one concept (rather than the random shuffle that /mock provides).
 *
 * Heuristic (no AI):
 *   1. Score each question by how strongly its tags overlap with other
 *      questions in the topic. Pick the highest-scoring question as the seed.
 *   2. Greedy-expand: pick each next question by max tag overlap with the
 *      union of tags already in the chain. Falls back to "any remaining" if
 *      no overlap is found.
 *   3. Sort the chosen chain easy→medium→hard so difficulty ramps up — what
 *      you'd expect on a real interview.
 *
 * If the topic has fewer questions than `count`, returns all of them sorted.
 */

const DIFF_ORDER = { easy: 0, medium: 1, hard: 2 };

const byDifficulty = (a, b) =>
  (DIFF_ORDER[a.difficulty] ?? 1) - (DIFF_ORDER[b.difficulty] ?? 1);

const tagsOf = (q) =>
  String(q.tags || '')
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

export function buildRound(questions, count = 5) {
  if (!questions?.length) return [];
  if (questions.length <= count) return [...questions].sort(byDifficulty);

  const tagSets = questions.map((q) => new Set(tagsOf(q)));

  // Seed: question whose tags overlap most with the rest of the pool.
  let seedIdx = 0;
  let seedScore = -1;
  for (let i = 0; i < questions.length; i += 1) {
    let score = 0;
    for (let j = 0; j < questions.length; j += 1) {
      if (i === j) continue;
      for (const t of tagSets[i]) if (tagSets[j].has(t)) score += 1;
    }
    if (score > seedScore) {
      seedScore = score;
      seedIdx = i;
    }
  }

  const chosenIdx = [seedIdx];
  const chosenTags = new Set(tagSets[seedIdx]);

  while (chosenIdx.length < count) {
    let nextIdx = -1;
    let nextScore = -1;
    for (let i = 0; i < questions.length; i += 1) {
      if (chosenIdx.includes(i)) continue;
      let score = 0;
      for (const t of tagSets[i]) if (chosenTags.has(t)) score += 1;
      if (score > nextScore) {
        nextScore = score;
        nextIdx = i;
      }
    }
    if (nextIdx === -1) break;
    chosenIdx.push(nextIdx);
    for (const t of tagSets[nextIdx]) chosenTags.add(t);
  }

  // If overlap dried up before we hit `count`, top up with any remaining.
  if (chosenIdx.length < count) {
    for (let i = 0; i < questions.length && chosenIdx.length < count; i += 1) {
      if (!chosenIdx.includes(i)) chosenIdx.push(i);
    }
  }

  return chosenIdx.map((i) => questions[i]).sort(byDifficulty);
}

/**
 * Common-tags summary across the chosen chain — used in the round's end
 * screen to surface "you covered these concepts".
 */
export function chainConcepts(chain, max = 6) {
  const counts = new Map();
  for (const q of chain) {
    for (const t of tagsOf(q)) counts.set(t, (counts.get(t) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([t]) => t);
}
