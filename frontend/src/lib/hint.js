/**
 * Pull a usable "hint" out of a long answer. Prefers the first complete
 * sentence; falls back to the first line capped at ~180 chars. Used by the
 * QuestionCard hint-ladder reveal and the per-topic cheatsheet view.
 *
 * The threshold of 12 chars on the sentence regex avoids picking up tiny
 * fragments like "Yes." or "It depends." as the whole hint.
 */
export function extractHint(answer) {
  if (!answer) return '';
  const trimmed = String(answer).trim();
  const m = trimmed.match(/^([^.!?\n]{12,}?[.!?])(?=\s|$)/);
  if (m) return m[1].trim();
  const firstLine = trimmed.split(/\n/)[0] || trimmed;
  if (firstLine.length <= 200) return firstLine;
  return firstLine.slice(0, 180).trim() + '…';
}

/**
 * Pull a short, "headline" code snippet from a longer code example. Used in
 * the cheatsheet so a 40-line code block doesn't blow up the layout. Tries
 * to keep complete logical lines and stops at `maxLines`.
 */
export function shortenCode(code, maxLines = 6) {
  if (!code) return '';
  const lines = String(code).split('\n');
  if (lines.length <= maxLines) return code.trim();
  return lines.slice(0, maxLines).join('\n').trim() + '\n…';
}
