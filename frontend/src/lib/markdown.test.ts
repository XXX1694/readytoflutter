import { describe, it, expect } from 'vitest';
import { toPlainText } from './markdown';

describe('toPlainText', () => {
  it('drops heading marks, list markers and emphasis but keeps the words', () => {
    const md = 'Lead sentence.\n\n### Key rules\n- **extends** — single inheritance\n- `with` → mixins\n1. first\n2. second';
    expect(toPlainText(md)).toBe('Lead sentence.\n\nKey rules\nextends — single inheritance\nwith → mixins\nfirst\nsecond');
  });

  it('unescapes the characters the migration escaped', () => {
    expect(toPlainText('- **List\\<T\\>** — ordered; go\\_router; async\\* generator')).toBe('List<T> — ordered; go_router; async* generator');
  });

  it('leaves the inside of a code span verbatim', () => {
    expect(toPlainText('Use `ForEach(items, id: \\.self)` here')).toBe('Use ForEach(items, id: \\.self) here');
  });

  it('keeps or drops fenced code on request', () => {
    const md = 'Text\n\n```dart\nfinal x = 1;\n```\n\nMore';
    expect(toPlainText(md)).toBe('Text\n\nfinal x = 1;\n\nMore');
    expect(toPlainText(md, { keepCode: false })).toBe('Text\n\nMore');
  });

  it('leaves plain text alone', () => {
    expect(toPlainText('Just a sentence. And another.')).toBe('Just a sentence. And another.');
    expect(toPlainText(null)).toBe('');
  });
});
