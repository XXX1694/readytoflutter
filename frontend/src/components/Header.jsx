import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Header({ theme, toggleTheme }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <header className="flex items-center gap-4 px-6 py-3 border-b border-slate-200 bg-white shrink-0 dark:border-zinc-800 dark:bg-zinc-950">
      <form onSubmit={handleSearch} className="flex-1 max-w-xl">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search questions, topics, concepts..."
            className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-flutter-blue focus:ring-1 focus:ring-flutter-blue dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:placeholder-slate-500"
          />
        </div>
      </form>

      <button
        onClick={toggleTheme}
        className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v2.5M12 18.5V21M4.22 4.22l1.77 1.77M18.01 18.01l1.77 1.77M3 12h2.5M18.5 12H21M4.22 19.78l1.77-1.77M18.01 5.99l1.77-1.77M12 16a4 4 0 100-8 4 4 0 000 8z" />
            </svg>
            Light
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 118.646 3.646 7 7 0 0020.354 15.354z" />
            </svg>
            Dark
          </>
        )}
      </button>

      <a
        href="https://flutter.dev/docs"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-slate-500 hover:text-flutter-blue dark:text-slate-400 dark:hover:text-flutter-sky"
      >
        Flutter Docs ↗
      </a>
    </header>
  );
}
