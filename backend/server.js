const express = require('express');
const cors = require('cors');
const db = require('./database');

db.init();

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;

app.use(
  cors(
    FRONTEND_ORIGIN
      ? {
          origin: FRONTEND_ORIGIN,
        }
      : undefined,
  ),
);
app.use(express.json());

app.get('/healthz', (req, res) => {
  res.json({ ok: true });
});

// ── Topics ───────────────────────────────────────────────────────────────────
app.get('/api/topics', (req, res) => {
  res.json(db.getTopics(req.query.level));
});

app.get('/api/topics/:slug', (req, res) => {
  const topic = db.getTopic(req.params.slug);
  if (!topic) return res.status(404).json({ error: 'Topic not found' });
  res.json(topic);
});

// ── Questions ────────────────────────────────────────────────────────────────
app.get('/api/questions', (req, res) => {
  res.json(db.getQuestions(req.query));
});

// ── Progress ─────────────────────────────────────────────────────────────────
app.post('/api/progress/:questionId', (req, res) => {
  const { status, notes } = req.body;
  const result = db.setProgress(req.params.questionId, status, notes);
  res.json({ success: true, ...result });
});

app.delete('/api/progress/reset', (req, res) => {
  db.resetProgress();
  res.json({ success: true });
});

// ── Stats ─────────────────────────────────────────────────────────────────────
app.get('/api/stats', (req, res) => {
  res.json(db.getStats());
});

app.listen(PORT, () => {
  const stats = db.getStats();
  console.log(`\n🚀 Server running at http://localhost:${PORT}`);
  console.log(`📚 Loaded ${stats.totalQuestions} questions from SQLite\n`);
});
