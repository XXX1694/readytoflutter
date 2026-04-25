/**
 * Shared constants used across the application
 */

/**
 * Configuration for experience levels
 * Used for topic categorization and display
 */
export const LEVEL_CONFIG = {
  junior: {
    label: 'Junior Developer',
    labelShort: 'Junior',
    badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300',
    dot: 'bg-flutter-sky',
    desc: '0–2 years experience',
  },
  mid: {
    label: 'Mid-Level Developer',
    labelShort: 'Mid-Level',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
    dot: 'bg-flutter-blue',
    desc: '2–5 years experience',
  },
  senior: {
    label: 'Senior Developer',
    labelShort: 'Senior',
    badge: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    dot: 'bg-slate-700 dark:bg-slate-300',
    desc: '5+ years experience',
  },
};

/**
 * Question status options
 */
export const QUESTION_STATUSES = [
  { key: 'not_started', label: 'Not Started', icon: '○' },
  { key: 'in_progress', label: 'In Progress', icon: '◑' },
  { key: 'completed',   label: 'Completed',   icon: '●' },
];

/**
 * Difficulty level styling
 */
export const DIFFICULTY_COLORS = {
  easy:   'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-500/20',
  medium: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20',
  hard:   'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
};

/**
 * LocalStorage keys
 */
export const STORAGE_KEYS = {
  THEME: 'theme',
  LANG: 'lang',
  PROGRESS: 'readytoflutter_progress_v1',
};
