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
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const db = require('./database');
const auth = require('./auth');
const { TIER_LIMITS } = require('./config');

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
const MAX_USER_CODE_CHARS = 6000;
const MIN_USER_CODE_CHARS = 40;

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

  // Tier-based daily quota. Pro / lifetime users skip the count entirely.
  // Free signed-in users get FREE_AI_GRADES_PER_DAY; anonymous visitors get
  // a tighter ANON_AI_GRADES_PER_DAY so the endpoint isn't a free LLM bot.
  const fullUser = req.user ? db.getUserById(req.user.id) : null;
  const isPro = db.isUserPro(fullUser);
  // Reserve a slot BEFORE the model call (inside a transaction that re-checks
  // the count), so a burst of concurrent grades can't all pass the same stale
  // count and bill past the daily cap. Pro/lifetime users skip the cap; their
  // grade is still logged after a success for usage accounting.
  let reservedId = null;
  if (!isPro) {
    const cap = req.user ? TIER_LIMITS.FREE_AI_GRADES_PER_DAY : TIER_LIMITS.ANON_AI_GRADES_PER_DAY;
    const reservation = db.reserveAiGrade({
      userId: req.user?.id || null,
      ip: req.user ? null : req.ip,
      cap,
    });
    if (!reservation.reserved) {
      return res.status(402).json({
        error: req.user
          ? 'Daily AI-grade limit reached on the free plan.'
          : 'Sign in or upgrade to keep grading today.',
        code: 'paywall_required',
        reason: req.user ? 'free_quota_exceeded' : 'anon_quota_exceeded',
        used: reservation.used,
        cap,
        tier: req.user ? (fullUser.pro_tier || 'free') : 'anon',
      });
    }
    reservedId = reservation.id;
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
    // A truncated or malformed tool call is not a grade — do not bill it.
    const grade = block.input;
    const VERDICTS = new Set(['great', 'good', 'rough', 'off']);
    if (
      message.stop_reason === 'max_tokens'
      || !VERDICTS.has(grade.verdict)
      || typeof grade.score !== 'number' || grade.score < 0 || grade.score > 100
      || typeof grade.summary !== 'string'
      || !Array.isArray(grade.strengths) || !Array.isArray(grade.gaps)
    ) {
      throw new Error(`Model returned an incomplete grade (stop_reason=${message.stop_reason})`);
    }

    const usage = message.usage || {};
    // Non-pro grades were already logged by the reservation above; pro grades
    // aren't capped, so log them here for usage accounting. Either way the
    // counter only reflects a grade that actually landed — a failed upstream
    // call refunds its reservation in the catch below.
    if (isPro) db.logAiGrade({ userId: req.user?.id || null, ip: req.user ? null : req.ip });
    console.log(
      `[ai] grade qid=${questionId} userId=${req.user?.id || 0} tier=${isPro ? 'pro' : 'free'} `
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
    // The model call never produced a billable grade — give the reserved slot
    // back so a failure doesn't cost the user a grade.
    db.refundAiGrade(reservedId);
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

// ── Live-coding review endpoint ────────────────────────────────────────────
// Reviews the code a user wrote against a /live task, under the same rules as
// the answer grader: the reference never comes from the client, the quota is
// reserved before the model call and refunded on failure, and the response is
// a forced tool call so its shape is guaranteed.

const TASKS_FILE = path.join(__dirname, 'data', 'seed', 'tasks.json');

// Indexed once at module scope — the file ships with the server and only
// changes with a deploy. A missing or unreadable file must not stop the
// server booting; the endpoint then 404s every slug, exactly as it would for
// an unknown one.
const TASKS_BY_SLUG = (() => {
  try {
    const rows = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
    return new Map(rows.map((t) => [t.slug, t]));
  } catch (err) {
    console.error('[ai] could not read live-coding tasks:', err?.message || err);
    return new Map();
  }
})();

const reviewSchema = z.object({
  taskSlug: z.string().min(1).max(120),
  code: z.string().max(MAX_USER_CODE_CHARS),
  lang: z.enum(['ru', 'en']).default('en'),
});

const REVIEW_SYSTEM = `You are a senior mobile engineer reviewing code a candidate wrote during an interview, under a clock of about 12 minutes.
You will be given the task prompt, the rubric the interviewer grades against, a reference solution, and the candidate's code.
Use the submit_review tool to return your review.

Grade against the RUBRIC, not against similarity to the reference. Idiomatic code that satisfies every rubric point is a "great" even if it is structured completely differently, uses different names, or solves it with another API. The reference is one correct answer, not the correct answer.

Verdict scale:
- great: every rubric point met; the code would pass the round
- good: the shape is right, one rubric point missed or done loosely
- rough: real progress in the right direction, several rubric points missing, or unfinished but heading somewhere correct
- off: does not address the task, or the approach cannot work

Score band (0-100) must roughly match the verdict: 85-100 great, 65-84 good, 35-64 rough, 0-34 off.
Unfinished-but-correct-direction is "rough", never "off". Under a clock, missing imports, a missing build() body or a TODO left in place are not defects worth marking.
rubric: return one entry per rubric point, in the order given, with the point copied verbatim, a strict boolean for whether it is met, and a note of at most 120 characters saying where in the code it is met or what is missing.
strengths and gaps: up to 3 short concrete bullets each, drawn from the code the candidate actually wrote.
suggestion: one actionable next step.
followUp: the question a real interviewer would ask next given THIS code — under 100 characters, self-contained.
Respond in the language requested by the user (ru or en). Keep the verbatim rubric points in their original English.`;

const REVIEW_TOOL = {
  name: 'submit_review',
  description: 'Return a structured review of the candidate code for a live-coding task.',
  input_schema: {
    type: 'object',
    properties: {
      verdict: { type: 'string', enum: ['great', 'good', 'rough', 'off'] },
      score: { type: 'integer', minimum: 0, maximum: 100 },
      rubric: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            point: { type: 'string' },
            met: { type: 'boolean' },
            note: { type: 'string' },
          },
          required: ['point', 'met', 'note'],
          additionalProperties: false,
        },
      },
      strengths: { type: 'array', items: { type: 'string' }, maxItems: 3 },
      gaps: { type: 'array', items: { type: 'string' }, maxItems: 3 },
      suggestion: { type: 'string' },
      followUp: { type: 'string', description: 'One short interviewer follow-up question, given this code.' },
    },
    required: ['verdict', 'score', 'rubric', 'strengths', 'gaps', 'suggestion', 'followUp'],
    additionalProperties: false,
  },
};

function buildReviewPrompt({ task, lang }, code) {
  return [
    `Language for response: ${lang === 'ru' ? 'Russian' : 'English'}`,
    `Task: ${task.title} (${task.difficulty}, ${task.minutes} minute budget)`,
    `Language of the code: ${task.code_language}`,
    '',
    'TASK PROMPT:',
    task.prompt,
    '',
    'RUBRIC (grade against these, in this order):',
    ...task.rubric.map((point, i) => `${i + 1}. ${point}`),
    '',
    'REFERENCE SOLUTION (one correct answer, not the only one):',
    '```',
    task.solution,
    '```',
    '',
    'CANDIDATE CODE:',
    '```',
    code,
    '```',
  ].join('\n');
}

async function reviewHandler(req, res) {
  const client = buildClient();
  if (!client) {
    return res.status(503).json({
      error: 'AI review is not configured on this server.',
      code: 'ai_disabled',
    });
  }

  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid input',
      code: 'bad_input',
      details: parsed.error.issues,
    });
  }
  const { taskSlug, code, lang } = parsed.data;
  const trimmed = code.trim();
  if (trimmed.length < MIN_USER_CODE_CHARS) {
    return res.status(400).json({
      error: 'Too little code to review.',
      code: 'too_short',
    });
  }

  const task = TASKS_BY_SLUG.get(taskSlug);
  if (!task) {
    return res.status(404).json({ error: 'Task not found', code: 'not_found' });
  }

  // Same daily allowance as the answer grader — one honest budget for every
  // model call the app makes on a user's behalf.
  const fullUser = req.user ? db.getUserById(req.user.id) : null;
  const isPro = db.isUserPro(fullUser);
  let reservedId = null;
  if (!isPro) {
    const cap = req.user ? TIER_LIMITS.FREE_AI_GRADES_PER_DAY : TIER_LIMITS.ANON_AI_GRADES_PER_DAY;
    const reservation = db.reserveAiGrade({
      userId: req.user?.id || null,
      ip: req.user ? null : req.ip,
      cap,
    });
    if (!reservation.reserved) {
      return res.status(402).json({
        error: req.user
          ? 'Daily AI limit reached on the free plan.'
          : 'Sign in or upgrade to keep reviewing today.',
        code: 'paywall_required',
        reason: req.user ? 'free_quota_exceeded' : 'anon_quota_exceeded',
        used: reservation.used,
        cap,
        tier: req.user ? (fullUser.pro_tier || 'free') : 'anon',
      });
    }
    reservedId = reservation.id;
  }

  const startedAt = Date.now();
  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: [
        { type: 'text', text: REVIEW_SYSTEM, cache_control: { type: 'ephemeral' } },
      ],
      tools: [REVIEW_TOOL],
      tool_choice: { type: 'tool', name: 'submit_review' },
      messages: [
        { role: 'user', content: buildReviewPrompt({ task, lang }, trimmed) },
      ],
    });

    const block = (message.content || []).find(
      (b) => b.type === 'tool_use' && b.name === 'submit_review',
    );
    if (!block || !block.input) {
      throw new Error('Model did not return a submit_review tool_use block');
    }
    // A truncated or malformed tool call is not a review — do not bill it.
    const review = block.input;
    const VERDICTS = new Set(['great', 'good', 'rough', 'off']);
    if (
      message.stop_reason === 'max_tokens'
      || !VERDICTS.has(review.verdict)
      || typeof review.score !== 'number' || review.score < 0 || review.score > 100
      || !Array.isArray(review.rubric)
      || review.rubric.length !== task.rubric.length
      || review.rubric.some((r) => !r || typeof r.point !== 'string' || typeof r.met !== 'boolean')
      || !Array.isArray(review.strengths) || !Array.isArray(review.gaps)
    ) {
      throw new Error(`Model returned an incomplete review (stop_reason=${message.stop_reason})`);
    }

    const usage = message.usage || {};
    if (isPro) db.logAiGrade({ userId: req.user?.id || null, ip: req.user ? null : req.ip });
    console.log(
      `[ai] review task=${taskSlug} userId=${req.user?.id || 0} tier=${isPro ? 'pro' : 'free'} `
        + `in=${usage.input_tokens || 0} out=${usage.output_tokens || 0} `
        + `cacheR=${usage.cache_read_input_tokens || 0} ms=${Date.now() - startedAt}`,
    );
    res.json({
      review,
      usage: {
        input_tokens: usage.input_tokens || 0,
        output_tokens: usage.output_tokens || 0,
        cache_read_input_tokens: usage.cache_read_input_tokens || 0,
      },
    });
  } catch (err) {
    db.refundAiGrade(reservedId);
    const status = Number.isInteger(err?.status) && err.status >= 400 && err.status < 600
      ? err.status
      : 502;
    console.error(`[ai] review error status=${status}:`, err?.message || err);
    res.status(status).json({
      error: 'AI review failed. Please try again.',
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
  app.get('/api/ai/health', auth.optionalAuth, (req, res) => {
    // Report why we're disabled so misconfigurations can be diagnosed from
    // a single curl. Never echo the key itself; only whether one is set.
    let reason = null;
    if (!AnthropicCtor) reason = 'sdk_missing';
    else if (!process.env.ANTHROPIC_API_KEY) reason = 'key_missing';
    const enabled = reason === null;

    // Quota for the current viewer so the frontend can render "X grades left"
    // without an extra round-trip. Pro / lifetime users get -1 to signify
    // unlimited; free / anon get the remaining count for today.
    const fullUser = req.user ? db.getUserById(req.user.id) : null;
    const isPro = db.isUserPro(fullUser);
    let remaining = -1;
    let cap = -1;
    if (!isPro) {
      cap = req.user ? TIER_LIMITS.FREE_AI_GRADES_PER_DAY : TIER_LIMITS.ANON_AI_GRADES_PER_DAY;
      const used = db.aiGradeCountLast24h({
        userId: req.user?.id || null,
        ip: req.user ? null : req.ip,
      });
      remaining = Math.max(0, cap - used);
    }
    res.json({
      enabled, reason, model: MODEL, minChars: MIN_USER_ANSWER_CHARS,
      tier: isPro ? (fullUser?.pro_tier || 'pro') : (req.user ? 'free' : 'anon'),
      cap, remaining,
    });
  });

  // optionalAuth: we don't require sign-in to grade (the user wants
  // friction-free study), but we log the user_id when present.
  app.post('/api/ai/grade', aiLimiter, auth.optionalAuth, gradeHandler);
  // Same contract as /grade: no sign-in required, the user id is logged when
  // there is one, and the daily allowance is shared with it.
  app.post('/api/ai/review-code', aiLimiter, auth.optionalAuth, reviewHandler);
  // The question editor is dev-only; drafting spends the project's API key,
  // so it takes an admin session, not an optional one.
  app.post('/api/ai/draft-question', aiLimiter, auth.requireAuth, auth.requireAdmin, draftHandler);
}

module.exports = { attach };
