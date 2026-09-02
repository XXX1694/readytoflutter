/**
 * A '.', '!' or '?' only closes a sentence when whitespace or the end of the
 * string follows it, and a '.' additionally does not close one when it is
 * finishing an abbreviation or an initial. Without those two rules the period
 * inside `3.12`, `.xcdatamodeld` or `e.g.` reads as a full stop, the sentence
 * scan gives up, and the hint silently degrades to a truncated first line.
 *
 * Returns the index of the terminator, or -1 if the first line holds no
 * complete sentence. `minBody` skips a terminator that would leave too small
 * a fragment to be a useful hint.
 */
const ABBREVIATION = /(?:^|[\s([])(?:[A-Za-z]|e\.g|i\.e|etc|vs|cf|approx|Fig|Dr|Mr|Ms|Mrs|St)$/;

function findSentenceEnd(text: string, minBody: number): number {
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\n') return -1;
    if (ch !== '.' && ch !== '!' && ch !== '?') continue;
    const next = text[i + 1];
    if (next !== undefined && !/\s/.test(next)) continue;
    if (i < minBody) continue;
    if (ch === '.' && ABBREVIATION.test(text.slice(0, i))) continue;
    return i;
  }
  return -1;
}

/**
 * Pull a usable "hint" out of a long answer. Prefers the first complete
 * sentence; falls back to the first line capped at ~180 chars. Used by the
 * QuestionCard hint-ladder reveal and the per-topic cheatsheet view.
 *
 * The threshold of 12 chars avoids picking up tiny fragments like "Yes." or
 * "It depends." as the whole hint.
 */
export function extractHint(answer: string | null | undefined): string {
  if (!answer) return '';
  const trimmed = String(answer).trim();
  const end = findSentenceEnd(trimmed, 12);
  if (end !== -1) return trimmed.slice(0, end + 1).trim();
  const firstLine = trimmed.split(/\n/)[0] || trimmed;
  if (firstLine.length <= 200) return firstLine;
  return firstLine.slice(0, 180).trim() + '…';
}

/**
 * Pull a short, "headline" code snippet from a longer code example. Used in
 * the cheatsheet so a 40-line code block doesn't blow up the layout. Tries
 * to keep complete logical lines and stops at `maxLines`.
 */
export function shortenCode(code: string | null | undefined, maxLines = 6): string {
  if (!code) return '';
  const lines = String(code).split('\n');
  if (lines.length <= maxLines) return code.trim();
  return lines.slice(0, maxLines).join('\n').trim() + '\n…';
}
