import { useState } from 'react';
import CodeBlock from './CodeBlock.jsx';
import { updateProgress } from '../api/api.js';

const STATUSES = [
  { key: 'not_started', label: 'Not Started', icon: '○' },
  { key: 'in_progress', label: 'In Progress', icon: '◑' },
  { key: 'completed',   label: 'Completed',   icon: '●' },
];

const difficultyColors = {
  easy:   'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-500/20',
  medium: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20',
  hard:   'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
};

export default function QuestionCard({ question, index, onProgressChange }) {
  const [open, setOpen] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [status, setStatus] = useState(question.status || 'not_started');
  const [notes, setNotes] = useState(question.notes || '');
  const [savingNotes, setSavingNotes] = useState(false);

  const handleStatusChange = async (newStatus) => {
    setStatus(newStatus);
    try {
      await updateProgress(question.id, newStatus, notes);
      onProgressChange?.();
    } catch (e) {
      console.error('Failed to update progress:', e);
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await updateProgress(question.id, status, notes);
      onProgressChange?.();
    } finally {
      setSavingNotes(false);
    }
  };

  const statusConfig = STATUSES.find(s => s.key === status);

  return (
    <div className={`border rounded-lg sm:rounded-xl overflow-hidden transition-all duration-200 ${
      open
        ? 'border-flutter-blue/50 bg-white dark:border-flutter-blue/50 dark:bg-slate-900'
        : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
    }`}>
      {/* Question header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-2 sm:gap-3 p-3 sm:p-4 text-left"
      >
        {/* Index */}
        <span className="shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs flex items-center justify-center font-mono mt-0.5 dark:bg-slate-800 dark:text-slate-400">
          {index + 1}
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-snug">{question.question}</p>
          <div className="flex items-center gap-1.5 sm:gap-2 mt-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded border font-medium ${difficultyColors[question.difficulty]}`}>
              {question.difficulty}
            </span>
            {question.tags && question.tags.split(',').map(t => (
              <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">{t.trim()}</span>
            ))}
          </div>
        </div>

        {/* Status indicator */}
        <div className="shrink-0 flex items-center gap-2">
          <span className={`text-xs font-medium ${
            status === 'completed' ? 'text-cyan-700 dark:text-cyan-300' :
            status === 'in_progress' ? 'text-flutter-blue dark:text-flutter-sky' : 'text-slate-500 dark:text-slate-500'
          }`}>
            {statusConfig?.icon}
          </span>
          <svg
            className={`w-4 h-4 text-slate-500 dark:text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="border-t border-slate-200 dark:border-slate-800">
          {/* Progress control */}
          <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200 dark:bg-zinc-950 dark:border-slate-800">
            <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">Mark as:</span>
            {STATUSES.map(s => (
              <button
                key={s.key}
                onClick={() => handleStatusChange(s.key)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  status === s.key
                    ? s.key === 'completed' ? 'bg-cyan-100 text-cyan-700 border-cyan-300 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/40'
                      : s.key === 'in_progress' ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40'
                      : 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600'
                    : 'text-slate-500 border-slate-300 hover:border-slate-400 hover:text-slate-700 dark:text-slate-400 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:text-slate-200'
                }`}
              >
                {s.icon} {s.label}
              </button>
            ))}
          </div>

          {/* Answer */}
          <div className="px-3 sm:px-4 py-4">
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Answer</h4>
            <div className="answer-text text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
              {question.answer}
            </div>
          </div>

          {/* Code example */}
          {question.code_example && (
            <div className="px-3 sm:px-4 pb-4">
              <button
                onClick={() => setShowCode(!showCode)}
                className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-flutter-blue hover:text-[#0168c1] dark:text-flutter-sky dark:hover:text-cyan-300 mb-3 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                {showCode ? 'Hide' : 'Show'} Code Example
                <svg className={`w-3.5 h-3.5 transition-transform ${showCode ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showCode && (
                <CodeBlock code={question.code_example} language={question.code_language || 'dart'} />
              )}
            </div>
          )}

          {/* Notes */}
          <div className="px-3 sm:px-4 pb-4">
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">My Notes</h4>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add your notes..."
              rows={3}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-flutter-blue focus:ring-1 focus:ring-flutter-blue resize-none dark:bg-zinc-950 dark:border-slate-700 dark:text-slate-300 dark:placeholder-slate-500"
            />
            <button
              onClick={handleSaveNotes}
              disabled={savingNotes}
              className="mt-2 text-xs px-3 py-1.5 bg-flutter-blue hover:bg-[#0168c1] disabled:bg-slate-400 dark:disabled:bg-slate-700 text-white rounded-lg transition-colors"
            >
              {savingNotes ? 'Saving...' : 'Save Notes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
