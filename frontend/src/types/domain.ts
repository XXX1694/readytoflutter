// Domain types shared across the app. Mirrors the SQLite schema in
// backend/database.js so a server response and a static-fallback fetch
// have the same TS shape.
//
// Keep these conservative: only fields the API actually returns. When the
// backend adds a column, extend the type here AND update the migration
// in backend/database.js.

export type Level = 'junior' | 'mid' | 'senior';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type ProgressStatus = 'not_started' | 'in_progress' | 'completed';
export type ProTier = 'free' | 'pro' | 'lifetime';
export type PlatformKey = 'all' | 'flutter' | 'ios' | 'android' | 'cross' | 'mobile';

export interface Topic {
  id: number;
  title: string;
  slug: string;
  level: Level;
  category: string;
  description: string;
  icon: string;
  order_index: number;
  question_count?: number;
  completed_count?: number;
}

export interface Question {
  id: number;
  topic_id: number;
  order_index: number;
  difficulty: Difficulty;
  question: string;
  answer: string;
  code_example: string | null;
  code_language: string;
  // Comma-separated tag list authored in the seed JSON. roundBuilder splits
  // it into a list to score connectedness between questions.
  tags?: string;
  // Joined from topics on /api/questions and /api/topics/:slug
  topic_title?: string;
  topic_slug?: string;
  level?: Level;
  // Joined from per-user progress when authenticated
  status?: ProgressStatus;
  notes?: string | null;
}

export interface ProgressRow {
  user_id: number;
  question_id: number;
  status: ProgressStatus;
  notes: string | null;
  updated_at: string;
}

export interface User {
  id: number;
  email: string;
  name: string | null;
  created_at: string;
  updated_at: string;
  is_admin: 0 | 1;
  pro_tier: ProTier;
  pro_expires_at: string | null;
  // Stripe IDs are stripped from sanitizeUser server-side.
}

export interface Stats {
  totalQuestions: number;
  completed: number;
  inProgress: number;
  byLevel: Array<{ level: Level; count: number }>;
}

export interface AdminStats {
  totalUsers: number;
  proUsers: number;
  signups24h: number;
  signups7d: number;
  activeUsers7d: number;
  activeUsers30d: number;
  totalProgress: number;
  completed: number;
  aiGrades24h: number;
  openContacts: number;
  totalQuestions: number;
  totalTopics: number;
}

export interface ContactMessage {
  id: number;
  user_id: number | null;
  name: string | null;
  email: string;
  message: string;
  status: 'open' | 'resolved';
  ip: string | null;
  created_at: string;
  resolved_at: string | null;
  user_email?: string | null;
  user_name?: string | null;
}

// SuperMemo SM-2 card state, persisted in localStorage by lib/srs.ts under
// `rtf:srs:v1`. Field names match the legacy persisted shape so a TS
// migration doesn't reset every existing user's review schedule.
export interface CardState {
  ease: number;       // 1.3+ — SM-2 easiness factor
  interval: number;   // days until next review
  reps: number;       // consecutive successful reps
  dueAt: number;      // ms epoch — when this card is next due
  lastAt: number;     // ms epoch of the last rating, or 0 for never
}

export type Rating = 'again' | 'hard' | 'good' | 'easy';

// Knowledge-base resource (frontend/public/seed/resources.json).
export interface Resource {
  id: number | string;
  url: string;
  title_en: string;
  title_ru?: string;
  description_en?: string;
  description_ru?: string;
  source?: string;
  category?: string;
  level?: Level;
  lang?: string;
  free?: boolean;
  topics?: string[];
  platform?: PlatformKey;
  media_type?: string;
  // YouTube helpers
  video_id?: string;
  playlist_id?: string;
  cover_video_id?: string;
}

// AI grader result schema — mirrors the submit_grade tool in backend/ai.js.
export interface AiGrade {
  verdict: 'great' | 'good' | 'rough' | 'off';
  score: number; // 0..100
  summary: string;
  strengths: string[];
  gaps: string[];
  suggestion: string;
  followUp: string;
}
