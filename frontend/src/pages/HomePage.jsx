import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTopics, getStats, resetProgress } from '../api/api.js';

const LEVEL_CONFIG = {
  junior: {
    label: 'Junior Developer',
    badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300',
    dot: 'bg-flutter-sky',
    desc: '0–2 years experience',
  },
  mid: {
    label: 'Mid-Level Developer',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
    dot: 'bg-flutter-blue',
    desc: '2–5 years experience',
  },
  senior: {
    label: 'Senior Developer',
    badge: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    dot: 'bg-slate-700 dark:bg-slate-300',
    desc: '5+ years experience',
  },
};

function TopicCard({ topic, level }) {
  const navigate = useNavigate();
  const cfg = LEVEL_CONFIG[level];
  const pct = topic.question_count > 0
    ? Math.round((topic.completed_count / topic.question_count) * 100)
    : 0;

  return (
    <button
      onClick={() => navigate(`/topic/${topic.slug}`)}
      className="group text-left p-4 rounded-xl border border-slate-200 bg-white hover:border-flutter-sky transition-colors dark:border-slate-800 dark:bg-slate-900 dark:hover:border-flutter-blue"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{topic.icon}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>
          {topic.question_count} Q
        </span>
      </div>
      <h3 className="font-semibold text-slate-900 text-sm mb-1 group-hover:text-flutter-blue dark:text-slate-100 dark:group-hover:text-flutter-sky transition-colors">
        {topic.title}
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug mb-3">{topic.description}</p>
      {/* Progress bar */}
      <div className="h-1 bg-slate-200 rounded-full overflow-hidden dark:bg-slate-800">
        <div
          className="h-full bg-flutter-sky rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        {topic.completed_count}/{topic.question_count} completed
      </div>
    </button>
  );
}

export default function HomePage() {
  const [topics, setTopics] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    Promise.all([getTopics(), getStats()])
      .then(([t, s]) => { setTopics(t); setStats(s); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleReset = async () => {
    if (!confirm('Reset all progress? This cannot be undone.')) return;
    await resetProgress();
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-flutter-blue border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-500 dark:text-slate-400 text-sm">Loading topics...</span>
        </div>
      </div>
    );
  }

  const total = stats?.totalQuestions ?? 0;
  const completed = stats?.completed ?? 0;
  const inProgress = stats?.inProgress ?? 0;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Flutter Interview Prep
          <span className="ml-2 text-flutter-blue">💙</span>
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm max-w-2xl">
          Comprehensive interview preparation covering Dart & Flutter from Junior to Senior level.
          Topics include state management, architecture patterns, DSA, native integration, and more.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-4 dark:bg-slate-900 dark:border-slate-800">
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{total}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Total Questions</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 dark:bg-slate-900 dark:border-slate-800">
          <div className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">{completed}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Completed</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 dark:bg-slate-900 dark:border-slate-800">
          <div className="text-2xl font-bold text-flutter-blue dark:text-flutter-sky">{inProgress}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">In Progress</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 dark:bg-slate-900 dark:border-slate-800">
          <div className="text-2xl font-bold text-slate-700 dark:text-slate-300">{pct}%</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Completion</div>
        </div>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="mb-8">
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden dark:bg-slate-800">
            <div
              className="h-full bg-flutter-blue rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Topics by level */}
      {(['junior', 'mid', 'senior']).map(level => {
        const levelTopics = topics.filter(t => t.level === level);
        if (!levelTopics.length) return null;
        const cfg = LEVEL_CONFIG[level];
        return (
          <div key={level} className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{cfg.label}</h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">{cfg.desc}</span>
              <span className={`ml-auto text-xs px-2.5 py-1 rounded-full font-medium ${cfg.badge}`}>
                {levelTopics.length} topics
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {levelTopics.map(topic => (
                <TopicCard key={topic.id} topic={topic} level={level} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Reset button */}
      {completed > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={handleReset}
            className="text-xs text-slate-500 hover:text-flutter-blue dark:text-slate-400 dark:hover:text-flutter-sky transition-colors"
          >
            Reset All Progress
          </button>
        </div>
      )}
    </div>
  );
}
