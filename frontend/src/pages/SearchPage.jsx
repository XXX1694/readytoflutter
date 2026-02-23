import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getQuestions } from '../api/api.js';
import QuestionCard from '../components/QuestionCard.jsx';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [level, setLevel] = useState('');
  const [difficulty, setDifficulty] = useState('');

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    getQuestions({ search: query, level: level || undefined, difficulty: difficulty || undefined })
      .then(setResults)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [query, level, difficulty]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/')} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Search results for <span className="text-flutter-blue dark:text-flutter-sky">"{query}"</span>
        </h1>
        {!loading && (
          <span className="text-sm text-slate-500 dark:text-slate-400 ml-auto">{results.length} results</span>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <select
          value={level}
          onChange={e => setLevel(e.target.value)}
          className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-flutter-blue dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300"
        >
          <option value="">All Levels</option>
          <option value="junior">Junior</option>
          <option value="mid">Mid-Level</option>
          <option value="senior">Senior</option>
        </select>
        <select
          value={difficulty}
          onChange={e => setDifficulty(e.target.value)}
          className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-flutter-blue dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300"
        >
          <option value="">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-flutter-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-slate-500 dark:text-slate-400 text-sm">No results found for "{query}"</p>
          <p className="text-slate-500 dark:text-slate-500 text-xs mt-1">Try different keywords</p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((q, i) => (
            <div key={q.id}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {q.topic_title} · {q.level}
                </span>
              </div>
              <QuestionCard question={q} index={i} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
