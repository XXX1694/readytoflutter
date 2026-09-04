// Structural checks on backend/data/seed/roadmap.json, run through the same
// validator the generator uses. A broken roadmap must fail here and in
// `generate:static-data`, never at runtime in the browser.
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { build, split, validateRoadmap } = require('./generate-static-data');

const topics = [
  { id: 1, slug: 'a', order_index: 1 },
  { id: 2, slug: 'b', order_index: 2 },
];
const questions = [
  { id: 10, topic_id: 1, difficulty: 'easy' },
  { id: 11, topic_id: 1, difficulty: 'hard' },
  { id: 20, topic_id: 2, difficulty: 'medium' },
];

const rung = (nodes) => ({ title_en: 'x', title_ru: 'y', nodes });

const valid = () => ({
  rungs: [
    { id: 'junior-1', band: 'junior', step: 1 },
    { id: 'staff', band: 'staff', step: 1 },
  ],
  tracks: [
    {
      platform: 'flutter',
      rungs: {
        'junior-1': rung([{ topic: 'a', difficulty: ['easy'] }]),
        staff: rung([{ topic: 'a', difficulty: ['hard'] }, { topic: 'b', difficulty: ['medium'] }]),
      },
    },
  ],
});

test('accepts a roadmap whose nodes all resolve to questions', () => {
  assert.doesNotThrow(() => validateRoadmap(valid(), topics, questions));
});

test('rejects a track that is missing a rung', () => {
  const r = valid();
  delete r.tracks[0].rungs.staff;
  assert.throws(() => validateRoadmap(r, topics, questions), /missing rung "staff"/);
});

test('rejects a node that matches no questions', () => {
  const r = valid();
  r.tracks[0].rungs.staff.nodes[1].difficulty = ['hard'];
  assert.throws(() => validateRoadmap(r, topics, questions), /matches no questions/);
});

test('rejects a question that would be counted in two rungs of one track', () => {
  const r = valid();
  r.tracks[0].rungs.staff.nodes.push({ topic: 'a', difficulty: ['easy'] });
  assert.throws(() => validateRoadmap(r, topics, questions), /more than one rung/);
});

test('rejects an unknown topic slug', () => {
  const r = valid();
  r.tracks[0].rungs.staff.nodes[0].topic = 'nope';
  assert.throws(() => validateRoadmap(r, topics, questions), /unknown topic "nope"/);
});

test('split keeps every field but the answer in the catalogue and files each answer under its topic', () => {
  const payload = {
    topics: [{ id: 1, slug: 'a', order_index: 1 }, { id: 2, slug: 'b', order_index: 2 }],
    questions: [
      { id: 10, topic_id: 1, order_index: 1, difficulty: 'easy', question: 'Q10', answer: 'A10', code_example: 'code', code_language: 'dart', tags: 'x' },
      { id: 20, topic_id: 2, order_index: 1, difficulty: 'hard', question: 'Q20', answer: 'A20', code_example: null, code_language: 'swift' },
    ],
    roadmap: { rungs: [], tracks: [] },
  };
  const { catalog, answers } = split(payload);
  assert.deepEqual(catalog.questions, [
    { id: 10, topic_id: 1, order_index: 1, difficulty: 'easy', question: 'Q10', code_language: 'dart', tags: 'x' },
    { id: 20, topic_id: 2, order_index: 1, difficulty: 'hard', question: 'Q20', code_language: 'swift' },
  ]);
  assert.deepEqual([...answers.keys()], ['a', 'b']);
  assert.deepEqual(answers.get('a'), [{ id: 10, answer: 'A10', code_example: 'code' }]);
  assert.deepEqual(answers.get('b'), [{ id: 20, answer: 'A20', code_example: null }]);
  assert.equal(catalog.roadmap, payload.roadmap);
});

test('split refuses a question whose topic does not exist', () => {
  assert.throws(
    () => split({ topics: [], questions: [{ id: 1, topic_id: 9, answer: '', code_example: null }], roadmap: {} }),
    /unknown topic id 9/,
  );
});

test('the committed seed builds: sixteen rungs, every track full', () => {
  const payload = build();
  assert.equal(payload.roadmap.rungs.length, 16);
  assert.deepEqual(
    payload.roadmap.rungs.map((r) => r.id),
    [
      'junior-1', 'junior-2', 'junior-3', 'junior-4', 'junior-5',
      'mid-1', 'mid-2', 'mid-3', 'mid-4', 'mid-5',
      'senior-1', 'senior-2', 'senior-3', 'senior-4', 'senior-5',
      'staff',
    ],
  );
  assert.deepEqual(payload.roadmap.tracks.map((t) => t.platform), ['flutter', 'ios', 'android']);
});
