import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getTopics, getStats } from '../api/api.js';

const LEVELS = [
  { key: 'junior', label: 'Junior', color: 'text-cyan-700 dark:text-flutter-sky', dot: 'bg-flutter-sky' },
  { key: 'mid',    label: 'Mid-Level', color: 'text-flutter-blue dark:text-flutter-blue', dot: 'bg-flutter-blue' },
  { key: 'senior', label: 'Senior', color: 'text-slate-700 dark:text-slate-300', dot: 'bg-slate-700 dark:bg-slate-300' },
];

export default function Sidebar({ isOpen, onClose }) {
  const [topics, setTopics] = useState([]);
  const [stats, setStats] = useState(null);
  const [expanded, setExpanded] = useState({ junior: true, mid: false, senior: false });
  const navigate = useNavigate();

  useEffect(() => {
    getTopics().then(setTopics).catch(console.error);
    getStats().then(setStats).catch(console.error);
  }, []);

  const byLevel = (level) => topics.filter(t => t.level === level);

  const totalCompleted = stats?.completed ?? 0;
  const totalQuestions = stats?.totalQuestions ?? 0;
  const pct = totalQuestions > 0 ? Math.round((totalCompleted / totalQuestions) * 100) : 0;

  const handleNavigation = (path) => {
    navigate(path);
    onClose?.();
  };

  return (
    <aside className={`
      w-64 flex flex-col border-r border-slate-200 bg-slate-100 shrink-0 overflow-hidden dark:border-slate-800 dark:bg-slate-900
      fixed lg:static inset-y-0 left-0 z-50
      transform transition-transform duration-300 ease-in-out
      ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `}>
      {/* Logo */}
      <div
        className="px-5 py-4 border-b border-slate-200 cursor-pointer dark:border-slate-800"
        onClick={() => handleNavigation('/')}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💙</span>
            <div>
              <div className="font-bold text-slate-900 text-sm leading-tight dark:text-slate-100">ReadyToFlutter</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Interview Prep</div>
            </div>
          </div>
          {/* Close button for mobile */}
          <button
            onClick={(e) => { e.stopPropagation(); onClose?.(); }}
            className="lg:hidden p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Overall Progress */}
      {totalQuestions > 0 && (
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span>Overall Progress</span>
            <span className="text-slate-900 font-medium dark:text-slate-100">{pct}%</span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden dark:bg-slate-800">
            <div
              className="h-full bg-flutter-blue rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{totalCompleted}/{totalQuestions} questions</div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        <NavLink
          to="/"
          end
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
              isActive
                ? 'text-slate-900 bg-slate-200 dark:text-slate-100 dark:bg-slate-800'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800'
            }`
          }
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Dashboard
        </NavLink>

        {LEVELS.map(level => (
          <div key={level.key} className="mt-1">
            <button
              onClick={() => setExpanded(e => ({ ...e, [level.key]: !e[level.key] }))}
              className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-700 transition-colors dark:text-slate-400 dark:hover:text-slate-200"
            >
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${level.dot}`} />
                <span className={level.color}>{level.label}</span>
              </div>
              <svg
                className={`w-3.5 h-3.5 transition-transform ${expanded[level.key] ? 'rotate-90' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {expanded[level.key] && (
              <div className="ml-2">
                {byLevel(level.key).map(topic => {
                  const pct = topic.question_count > 0
                    ? Math.round((topic.completed_count / topic.question_count) * 100)
                    : 0;
                  return (
                    <NavLink
                      key={topic.id}
                      to={`/topic/${topic.slug}`}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `group flex items-center gap-2 px-4 py-1.5 text-sm rounded-md mx-1 transition-colors ${
                          isActive
                            ? 'text-slate-900 bg-cyan-50 border-l-2 border-flutter-blue dark:text-slate-100 dark:bg-flutter-blue/10'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800'
                        }`
                      }
                    >
                      <span className="text-base shrink-0">{topic.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-xs leading-tight">{topic.title}</div>
                        {pct > 0 && (
                          <div className="h-0.5 bg-slate-300 rounded-full mt-1 overflow-hidden dark:bg-slate-700">
                            <div className="h-full bg-flutter-sky rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-500 shrink-0">{topic.question_count}</span>
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-slate-200 text-xs text-slate-500 text-center dark:border-slate-800 dark:text-slate-500">
        Flutter Developer Interview Prep
      </div>
    </aside>
  );
}
