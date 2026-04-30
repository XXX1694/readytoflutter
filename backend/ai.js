// Server-side AI grader for mock-interview answers.
//
// Design decisions worth knowing before editing:
// - The Anthropic API key lives ONLY on the server (`ANTHROPIC_API_KEY`).
//   Putting it in the frontend would leak it the first time someone opens
//   the network tab.
// - The SDK is loaded lazily so the server still boots (and /api/ai/health
//   still answers) when the dependency hasn't been installed yet.
// - The reference answer is fetched from the DB by `questionId`. We never
//   accept it from the client — that would let a user put anything they
//   wanted into the prompt.
// - We use Claude Haiku 4.5 (cheapest tier) and force a structured tool
//   call (`submit_grade`) so the response is guaranteed-shaped JSON.
// - Cost guards are layered: empty/short rejected before the API call,
//   per-IP rate limit (30/hour) on top, length cap on `userAnswer` to
//   bound prompt size.
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const db = require('./database');
const auth = require('./auth');

// Lazy + tolerant of the package being missing — keeps the server bootable
// when the dependency hasn't been npm-installed yet.
let AnthropicCtor = null;
try {
  const sdk = require('@anthropic-ai/sdk');
  AnthropicCtor = sdk?.default ?? sdk?.Anthropic ?? sdk;
} catch {
  AnthropicCtor = null;
}

const MODEL = 'claude-haiku-4-5';
const MAX_USER_ANSWER_CHARS = 4000;
const MIN_USER_ANSWER_CHARS = 15;

function buildClient() {
  if (!AnthropicCtor) return null;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new AnthropicCtor({ apiKey });
}

// 30 requests per hour per IP. Generous enough for a single user studying
// a long session, tight enough that a leak of the endpoint URL won't burn
// the budget overnight. Keyed by IP via the default keyGenerator.
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'AI grading rate limit reached. Try again later.',
    code: 'rate_limited',
  },
});

const gradeSchema = z.object({
  questionId: z.coerce.number().int().positive(),
  userAnswer: z.string().max(MAX_USER_ANSWER_CHARS),
  lang: z.enum(['ru', 'en']).default('en'),
});

const SYSTEM_PROMPT = `You are a senior Flutter/Dart interviewer grading a candidate's answer to a study question.
You will be given the interview question, a reference answer, and the candidate's answer.
Use the submit_grade tool to return your grade. Be specific, technical, and fair.

Verdict scale:
- great: covers the key points; correct and well-articulated
- good: mostly correct; minor gaps or imprecisions
- rough: partial understanding; significant gaps
- off: incorrect or off-topic / very short / not actually answering

Score band (0-100) must roughly match the verdict: 85-100 great, 65-84 good, 35-64 rough, 0-34 off.
Strengths and gaps: 1-3 concrete bullets each, drawn from the candidate's answer text. Keep them short.
Summary: one sentence. Suggestion: one actionable next step.
Follow-up: one short question a real interviewer would ask NEXT, given how the candidate answered — to dig deeper, probe an edge case, or test scaling. Keep it under 100 chars and self-contained.
Respond in the language requested by the user (ru or en) — including the labels in summary/strengths/gaps/suggestion/followUp.`;

const GRADE_TOOL = {
  name: 'submit_grade',
  description: 'Return a structured grade for the candidate answer.',
  input_schema: {
    type: 'object',
    properties: {
      verdict: { type: 'string', enum: ['great', 'good', 'rough', 'off'] },
      score: { type: 'integer', minimum: 0, maximum: 100 },
      summary: { type: 'string' },
      strengths: { type: 'array', items: { type: 'string' }, maxItems: 3 },
      gaps: { type: 'array', items: { type: 'string' }, maxItems: 3 },
      suggestion: { type: 'string' },
      followUp: { type: 'string', description: 'One short interviewer follow-up question to dig deeper, given the candidate\'s answer.' },
    },
    required: ['verdict', 'score', 'summary', 'strengths', 'gaps', 'suggestion', 'followUp'],
    additionalProperties: false,
  },
};

function buildUserPrompt({ question, lang }, userAnswer) {
  const parts = [
    `Language for response: ${lang === 'ru' ? 'Russian' : 'English'}`,
    `Topic: ${question.topic_title} (${question.level})`,
    `Difficulty: ${question.difficulty}`,
    '',
    'QUESTION:',
    question.question,
    '',
    'REFERENCE ANSWER:',
    question.answer,
  ];
  if (question.code_example) {
    parts.push(
      '',
      `Reference code (${question.code_language || 'dart'}):`,
      '```',
      question.code_example,
      '```',
    );
  }
  parts.push('', 'CANDIDATE ANSWER:', userAnswer);
  return parts.join('\n');
}

async function gradeHandler(req, res) {
  const client = buildClient();
  if (!client) {
    return res.status(503).json({
      error: 'AI grading is not configured on this server.',
      code: 'ai_disabled',
    });
  }

  const parsed = gradeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid input',
      code: 'bad_input',
      details: parsed.error.issues,
    });
  }
  const { questionId, userAnswer, lang } = parsed.data;
  const trimmed = userAnswer.trim();
  if (trimmed.length < MIN_USER_ANSWER_CHARS) {
    return res.status(400).json({
      error: 'Answer too short to grade.',
      code: 'too_short',
    });
  }

  const question = db.getQuestionForGrading(questionId);
  if (!question) {
    return res.status(404).json({ error: 'Question not found', code: 'not_found' });
  }

  const startedAt = Date.now();
  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      // System prompt is wrapped in a text block with cache_control so the
      // SDK marks it as cacheable. The current prompt is well under the
      // Haiku 4.5 minimum (4096 tokens), so caching is a no-op today —
      // but if we expand the rubric later it'll start hitting cache.
      system: [
        { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      ],
      tools: [GRADE_TOOL],
      // Force the tool call so the response is guaranteed structured JSON
      // matching the schema. No JSON-parsing-from-prose needed.
      tool_choice: { type: 'tool', name: 'submit_grade' },
      messages: [
        { role: 'user', content: buildUserPrompt({ question, lang }, trimmed) },
      ],
    });

    const block = (message.content || []).find(
      (b) => b.type === 'tool_use' && b.name === 'submit_grade',
    );
    if (!block || !block.input) {
      throw new Error('Model did not return a submit_grade tool_use block');
    }

    const usage = message.usage || {};
    console.log(
      `[ai] grade qid=${questionId} userId=${req.user?.id || 0} `
        + `in=${usage.input_tokens || 0} out=${usage.output_tokens || 0} `
        + `cacheR=${usage.cache_read_input_tokens || 0} ms=${Date.now() - startedAt}`,
    );
    res.json({
      grade: block.input,
      usage: {
        input_tokens: usage.input_tokens || 0,
        output_tokens: usage.output_tokens || 0,
        cache_read_input_tokens: usage.cache_read_input_tokens || 0,
      },
    });
  } catch (err) {
    const status = Number.isInteger(err?.status) && err.status >= 400 && err.status < 600
      ? err.status
      : 502;
    console.error(`[ai] grade error status=${status}:`, err?.message || err);
    res.status(status).json({
      error: 'AI grading failed. Please try again.',
      code: 'upstream_error',
    });
  }
}

// ── Draft-question endpoint ────────────────────────────────────────────────
// Generates a draft Flutter/Dart interview question + reference answer from
// a one-line prompt. Used by the in-app admin so the author has a starting
// point instead of a blank textarea. The draft is editable in the UI before
// it ships into the local diff.
const draftSchema = z.object({
  prompt: z.string().min(8).max(400),
  topicTitle: z.string().max(120).optional(),
  topicLevel: z.enum(['junior', 'mid', 'senior']).optional(),
  lang: z.enum(['ru', 'en']).default('en'),
});

const DRAFT_SYSTEM = `You are an expert Flutter/Dart interviewer drafting a study question.
Given a short idea from the author, produce ONE focused interview question with a strong reference answer.
Use the submit_draft tool — return strict JSON.

- question: the prompt the candidate sees. Concrete, single-focus, 1-2 sentences.
- answer: a strong reference answer. 3-6 short paragraphs separated by blank lines. Cover the "why", trade-offs, and a concrete example. Avoid filler.
- difficulty: easy | medium | hard. Calibrate honestly: easy = standard syntax/concepts; medium = needs trade-off thinking; hard = deep, edge-case, or perf-sensitive.
- tags: 2-4 short kebab/lowercase tags (e.g., "state-management", "async", "rendering"). No spaces.
- codeExample: dart code that supports the answer. Self-contained, runnable in isolation if possible. Return null if code wouldn't help.
- codeLanguage: "dart" unless the question explicitly is about another language.

Respond IN THE LANGUAGE requested (ru or en) — for question + answer text. Tags stay english/kebab.`;

const DRAFT_TOOL = {
  name: 'submit_draft',
  description: 'Return a structured draft question for a Flutter/Dart interview-prep app.',
  input_schema: {
    type: 'object',
    properties: {
      question: { type: 'string' },
      answer: { type: 'string' },
      difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
      tags: { type: 'array', items: { type: 'string' }, maxItems: 4 },
      codeExample: { type: ['string', 'null'] },
      codeLanguage: { type: 'string' },
    },
    required: ['question', 'answer', 'difficulty', 'tags', 'codeExample', 'codeLanguage'],
    additionalProperties: false,
  },
};

async function draftHandler(req, res) {
  const client = buildClient();
  if (!client) {
    return res.status(503).json({ error: 'AI is not configured.', code: 'ai_disabled' });
  }
  const parsed = draftSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', code: 'bad_input', details: parsed.error.issues });
  }
  const { prompt, topicTitle, topicLevel, lang } = parsed.data;

  const userBlock = [
    `Language for response: ${lang === 'ru' ? 'Russian' : 'English'}`,
    topicTitle ? `Topic: ${topicTitle}` : null,
    topicLevel ? `Target level: ${topicLevel}` : null,
    '',
    'AUTHOR PROMPT:',
    prompt.trim(),
  ].filter(Boolean).join('\n');

  const startedAt = Date.now();
  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: [
        { type: 'text', text: DRAFT_SYSTEM, cache_control: { type: 'ephemeral' } },
      ],
      tools: [DRAFT_TOOL],
      tool_choice: { type: 'tool', name: 'submit_draft' },
      messages: [{ role: 'user', content: userBlock }],
    });
    const block = (message.content || []).find(
      (b) => b.type === 'tool_use' && b.name === 'submit_draft',
    );
    if (!block || !block.input) throw new Error('No submit_draft tool_use block');
    const usage = message.usage || {};
    console.log(
      `[ai] draft userId=${req.user?.id || 0} `
      + `in=${usage.input_tokens || 0} out=${usage.output_tokens || 0} ms=${Date.now() - startedAt}`,
    );
    res.json({ draft: block.input, usage });
  } catch (err) {
    const status = Number.isInteger(err?.status) && err.status >= 400 && err.status < 600 ? err.status : 502;
    console.error(`[ai] draft error status=${status}:`, err?.message || err);
    res.status(status).json({ error: 'AI draft failed. Try again.', code: 'upstream_error' });
  }
}

function attach(app) {
  app.get('/api/ai/health', (_req, res) => {
    // Report why we're disabled so misconfigurations can be diagnosed from
    // a single curl. Never echo the key itself; only whether one is set.
    let reason = null;
    if (!AnthropicCtor) reason = 'sdk_missing';
    else if (!process.env.ANTHROPIC_API_KEY) reason = 'key_missing';
    const enabled = reason === null;
    res.json({ enabled, reason, model: MODEL, minChars: MIN_USER_ANSWER_CHARS });
  });

  // optionalAuth: we don't require sign-in to grade (the user wants
  // friction-free study), but we log the user_id when present.
  app.post('/api/ai/grade', aiLimiter, auth.optionalAuth, gradeHandler);
  app.post('/api/ai/draft-question', aiLimiter, auth.optionalAuth, draftHandler);
}

module.exports = { attach };
