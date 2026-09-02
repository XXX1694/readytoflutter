/**
 * Answers are Markdown (backend/data/seed/questions, contentRu.ts). Some
 * consumers want the words without the markup: the speech synthesiser, the
 * hint extractor, the search index. This strips the subset of Markdown the
 * answers use — headings, lists, emphasis, code spans, fences, backslash
 * escapes — and leaves the text.
 */

export interface PlainTextOptions {
  /** Keep the contents of ``` fences (search wants them, speech does not). */
  keepCode?: boolean;
}

export function toPlainText(markdown: string | null | undefined, { keepCode = true }: PlainTextOptions = {}): string {
  if (!markdown) return '';
  let text = String(markdown).replace(/\r\n/g, '\n');

  // Fenced code: drop or keep the body, never the fence line.
  text = text.replace(/```[^\n]*\n([\s\S]*?)```/g, (_m, body: string) => (keepCode ? body : ''));

  const lines = text.split('\n').map((line) => line
    .replace(/^\s{0,3}#{1,6}\s+/, '')            // headings
    .replace(/^(\s*)[-*+]\s+/, '$1')             // bullets
    .replace(/^(\s*)\d+[.)]\s+/, '$1')           // numbered items
    .replace(/^\s{0,3}>\s?/, ''));               // blockquotes

  // Code spans keep their text verbatim (a Swift key path is `\.age`);
  // everything else loses its emphasis marks and backslash escapes.
  return lines
    .join('\n')
    .split(/(`[^`\n]*`)/)
    .map((part, i) => (i % 2 === 1
      ? part.slice(1, -1)
      : part
        .replace(/\*\*((?:\\.|[^*\\])+)\*\*/g, '$1') // bold, which may hold escaped characters
        .replace(/(^|[^\\*])\*([^*\n]+)\*/g, '$1$2') // italic
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')     // links
        .replace(/\\([\\`*_{}[\]()#+\-.!<>|])/g, '$1'))) // escapes
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
