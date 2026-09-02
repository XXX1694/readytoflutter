import { describe, it, expect } from 'vitest';
import { extractHint, shortenCode } from './hint';

describe('extractHint', () => {
  it('returns the first complete sentence', () => {
    expect(extractHint('Streams deliver values over time. The rest is detail.'))
      .toBe('Streams deliver values over time.');
  });

  it('keeps a version number inside the sentence', () => {
    expect(extractHint('PopScope (Flutter 3.12+) replaces the older WillPopScope. It controls pops.'))
      .toBe('PopScope (Flutter 3.12+) replaces the older WillPopScope.');
  });

  it('keeps a leading-dot identifier inside the sentence', () => {
    expect(extractHint('Use `.task` to run async work when the view appears. It cancels on disappear.'))
      .toBe('Use `.task` to run async work when the view appears.');
  });

  it('keeps a filename extension inside the sentence', () => {
    expect(extractHint('Core Data draws the schema in a .xcdatamodeld editor. SwiftData uses Swift.'))
      .toBe('Core Data draws the schema in a .xcdatamodeld editor.');
  });

  it('does not stop on a mid-sentence abbreviation', () => {
    expect(extractHint('Serialize writes with a queue, e.g. a Channel, to avoid races. Then drain it.'))
      .toBe('Serialize writes with a queue, e.g. a Channel, to avoid races.');
  });

  it('does not stop on an initial', () => {
    expect(extractHint('Clean Architecture (Robert C. Martin) points dependencies inward. Domain stays pure.'))
      .toBe('Clean Architecture (Robert C. Martin) points dependencies inward.');
  });

  it('handles ! and ? as terminators', () => {
    expect(extractHint('Never block the main thread! Everything else follows.'))
      .toBe('Never block the main thread!');
  });

  it('ignores a fragment shorter than the threshold', () => {
    expect(extractHint('It depends.\nOn the platform.')).toBe('It depends.');
  });

  it('falls back to the first line when no sentence ends on it', () => {
    expect(extractHint('Three ways to pass data:\n• constructor\n• route settings'))
      .toBe('Three ways to pass data:');
  });

  it('truncates a very long first line', () => {
    const long = 'x'.repeat(250);
    const out = extractHint(long);
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(181);
  });

  it('handles empty and nullish input', () => {
    expect(extractHint('')).toBe('');
    expect(extractHint(null)).toBe('');
    expect(extractHint(undefined)).toBe('');
  });
});

describe('shortenCode', () => {
  it('returns short code unchanged', () => {
    expect(shortenCode('a\nb\nc')).toBe('a\nb\nc');
  });

  it('cuts to maxLines and marks the cut', () => {
    expect(shortenCode('1\n2\n3\n4\n5\n6\n7', 6)).toBe('1\n2\n3\n4\n5\n6\n…');
  });

  it('handles nullish input', () => {
    expect(shortenCode(null)).toBe('');
  });
});
