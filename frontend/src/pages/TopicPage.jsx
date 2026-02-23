import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTopic } from '../api/api.js';
import QuestionCard from '../components/QuestionCard.jsx';

const LEVEL_CONFIG = {
  junior: { badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300', label: 'Junior' },
  mid:    { badge: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300', label: 'Mid-Level' },
  senior: { badge: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300', label: 'Senior' },
};

export default function TopicPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [topic, setTopic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const loadTopic = () => {
    setLoading(true);
    getTopic(slug)
      .then(setTopic)
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTopic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-flutter-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!topic) return null;

  const cfg = LEVEL_CONFIG[topic.level];
  const questions = topic.questions || [];

  const filtered = questions.filter(q => {
    if (filter === 'all') return true;
    if (filter === 'not_started') return !q.status || q.status === 'not_started';
    return q.status === filter;
  });

  const completedCount = questions.filter(q => q.status === 'completed').length;
  const pct = questions.length > 0 ? Math.round((completedCount / questions.length) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Breadcrumb */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mb-4 sm:mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Dashboard
      </button>

      {/* Topic header */}
      <div className="flex items-start gap-3 sm:gap-4 mb-6">
        <span className="text-3xl sm:text-4xl">{topic.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-slate-100">{topic.title}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cfg.badge}`}>
              {cfg.label}
            </span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">{topic.description}</p>
          {/* Progress */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mt-3">
            <div className="flex-1 max-w-xs h-1.5 bg-slate-200 rounded-full overflow-hidden dark:bg-slate-800">
              <div
                className="h-full bg-flutter-sky rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">{completedCount}/{questions.length} completed ({pct}%)</span>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'all',          label: `All (${questions.length})` },
          { key: 'not_started',  label: `To Do (${questions.filter(q => !q.status || q.status === 'not_started').length})` },
          { key: 'in_progress',  label: `In Progress (${questions.filter(q => q.status === 'in_progress').length})` },
          { key: 'completed',    label: `Done (${completedCount})` },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
              filter === f.key
                ? 'bg-flutter-blue text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Questions */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <p className="text-4xl mb-3">🎉</p>
            <p className="text-sm">No questions in this category.</p>
          </div>
        ) : (
          filtered.map((q, i) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={questions.indexOf(q)}
              onProgressChange={loadTopic}
            />
          ))
        )}
      </div>
    </div>
  );
}
