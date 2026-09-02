import { memo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';

// Only what a one-line title can carry: code spans and emphasis. Everything
// else (paragraphs, lists, headings) is unwrapped to its text.
const ALLOWED = ['code', 'strong', 'em'];

const components: Components = {
  code: ({ children }) => <code className="inline-code">{children}</code>,
};

export interface InlineMarkdownProps {
  text: string;
}

/**
 * A question title. Questions are written with `code` spans for identifiers
 * ("What is the difference between `var` and `dynamic`?") and used to show
 * the backticks; this renders the span and leaves the line a line.
 */
function InlineMarkdown({ text }: InlineMarkdownProps) {
  return (
    <ReactMarkdown allowedElements={ALLOWED} unwrapDisallowed components={components}>
      {text}
    </ReactMarkdown>
  );
}

export default memo(InlineMarkdown);
